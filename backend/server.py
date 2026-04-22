"""Raku backend — AI academic OS for college students (multi-user).

Auth: Emergent-managed Google Auth (cookie session).
Integrations: Google Calendar OAuth read-only, Notion API.
Proactive: APScheduler (30-min sync + morning check-in).
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import LlmChat, UserMessage

from auth import build_auth_router
from integrations_google import build_google_router, is_configured as google_ready, sync_for_user as sync_google
from integrations_notion import is_configured as notion_ready, sync_for_user as sync_notion
from scheduler import start_scheduler, stop_scheduler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI(title="Raku API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("raku")

# Auth router → gives us a `get_current_user` dependency
auth_router = build_auth_router(db)
get_current_user = auth_router.get_current_user  # type: ignore[attr-defined]
api.include_router(auth_router)
# Google OAuth router
api.include_router(build_google_router(db, get_current_user))


# ─────────── Helpers & models ───────────
def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


class TaskCreate(BaseModel):
    title: str
    course: Optional[str] = None
    due_at: Optional[str] = None
    effort_min: int = 30
    importance: int = 3
    source: str = "manual"
    steps: List[str] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    course: Optional[str] = None
    due_at: Optional[str] = None
    effort_min: Optional[int] = None
    importance: Optional[int] = None
    status: Optional[str] = None
    steps: Optional[List[str]] = None


class AssignmentImportItem(BaseModel):
    title: str
    course: Optional[str] = None
    due_at: Optional[str] = None
    source_url: Optional[str] = None


class AssignmentImportPayload(BaseModel):
    assignments: List[AssignmentImportItem]
    source: str = "brightspace"


class SettingsUpdate(BaseModel):
    accent_color: Optional[str] = None
    vibe: Optional[str] = None
    name: Optional[str] = None
    pronouns: Optional[str] = None


class ChatRequest(BaseModel):
    text: str
    conversation_id: Optional[str] = None


VIBE_PROMPTS = {
    "chill": "You are a chill, caring friend. Warm, funny, low pressure.",
    "hype": "You are an upbeat hype coach. Short, excited, supportive.",
    "study": "You are a calm study buddy. Precise, gentle, focused.",
    "quiet": "You are quiet and minimal. Very short replies, no fluff.",
}


def build_system_prompt(user: dict, tasks: List[dict]) -> str:
    vibe = VIBE_PROMPTS.get(user.get("vibe", "chill"), VIBE_PROMPTS["chill"])
    task_lines = [
        f"- {t['title']} ({t.get('course') or 'general'}, due {t.get('due_at') or 'no due date'})"
        for t in tasks[:8]
    ]
    task_text = "\n".join(task_lines) if task_lines else "(no tasks yet)"
    return (
        "You are Raku — an AI academic operating system for a college student.\n"
        f"{vibe}\n"
        "Rules:\n"
        "- Always simple language. Short sentences. Like the student is tired but smart.\n"
        "- Offer 1–2 clear options max. Never long menus.\n"
        "- Never guilt-trip. Playful, supportive.\n"
        "- Use their pronouns; if unknown, use 'you'.\n"
        "- If asked 'what now?', pick ONE best next step from their tasks and explain in 1-2 short lines.\n"
        "- If asked to plan an assignment, give 3–7 tiny steps.\n"
        "- Keep replies under ~80 words.\n\n"
        f"Student pronouns: {user.get('pronouns', 'they/them')}\n"
        f"Current tasks:\n{task_text}\n"
    )


def task_score(t: dict, now: datetime) -> float:
    importance = t.get("importance", 3)
    effort = t.get("effort_min", 30)
    due = t.get("due_at")
    urgency = 0.0
    if due:
        try:
            due_dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
            hours_left = max((due_dt - now).total_seconds() / 3600.0, 0.1)
            urgency = 100.0 / hours_left
        except Exception:
            urgency = 0.0
    return urgency + importance * 5 + 10.0 / max(effort, 5)


def _friendly_greeting(user: dict, n_tasks: int) -> str:
    name = (user.get("name") or "").split(" ")[0] or "friend"
    hour = datetime.now(timezone.utc).hour
    tod = "morning" if hour < 12 else ("afternoon" if hour < 18 else "evening")
    if n_tasks == 0:
        return f"Good {tod}, {name}. nothing urgent — breathe."
    if n_tasks == 1:
        return f"Good {tod}, {name}. just one thing worth doing."
    return f"Good {tod}, {name}. {n_tasks} tiny things. we'll do them together."


# ─────────── Seed (per-user on first login) ───────────
SEED_INTEGRATIONS = [
    {"id": "brightspace", "name": "Brightspace", "status": "ready", "description": "Scans assignments via Raku Chrome extension."},
    {"id": "google_calendar", "name": "Google Calendar", "status": "mock", "description": "Pulls class times + personal events."},
    {"id": "notion", "name": "Notion", "status": "mock", "description": "Syncs a tasks database you pick."},
]


async def seed_user_if_empty(user_id: str) -> None:
    if await db.integrations.count_documents({"user_id": user_id}) == 0:
        for i in SEED_INTEGRATIONS:
            await db.integrations.insert_one({**i, "user_id": user_id})
    if await db.tasks.count_documents({"user_id": user_id}) == 0:
        now = datetime.now(timezone.utc)
        samples = [
            ("Read Chapter 4 — Intro to Sociology", "SOC 101", now + timedelta(hours=20), 40, 3, "brightspace",
             ["Skim headings (3 min)", "Read section 4.1", "Write 3 bullet takeaways"]),
            ("Problem Set 3", "MATH 220", now + timedelta(days=2), 90, 5, "brightspace",
             ["Open problem set", "Do Q1–Q3", "Break", "Do Q4–Q6", "Check answers"]),
            ("Draft essay intro — Identity & Memory", "ENG 210", now + timedelta(days=4), 45, 4, "notion",
             ["Pick 1 angle", "Write thesis sentence", "Write 3 support bullets"]),
            ("Email professor about extension", "BIO 130", now + timedelta(hours=6), 10, 4, "manual",
             ["Open email", "Draft 4 lines", "Send"]),
        ]
        for title, course, due, eff, imp, src, steps in samples:
            await db.tasks.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title, "course": course, "source": src,
                "due_at": _iso(due), "effort_min": eff, "importance": imp,
                "status": "todo", "steps": steps,
                "created_at": _iso(now),
            })
    if await db.events.count_documents({"user_id": user_id}) == 0:
        now = datetime.now(timezone.utc)
        for title, course, start, end, kind, src in [
            ("MATH 220 Lecture", "MATH 220", now.replace(hour=10, minute=0, second=0, microsecond=0),
             now.replace(hour=11, minute=15, second=0, microsecond=0), "class", "google_calendar"),
            ("SOC 101 Lecture", "SOC 101", (now + timedelta(days=1)).replace(hour=13, minute=0, second=0, microsecond=0),
             (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0), "class", "google_calendar"),
            ("MATH 220 Midterm", "MATH 220", (now + timedelta(days=6)).replace(hour=9, minute=0, second=0, microsecond=0),
             (now + timedelta(days=6)).replace(hour=11, minute=0, second=0, microsecond=0), "exam", "brightspace"),
        ]:
            await db.events.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title, "course": course,
                "start_at": _iso(start), "end_at": _iso(end),
                "kind": kind, "source": src,
            })


# ─────────── Routes ───────────
@api.get("/")
async def root():
    return {"app": "raku", "status": "ok"}


@api.get("/me")
async def me(user: dict = Depends(get_current_user)):
    await seed_user_if_empty(user["user_id"])
    return user


@api.patch("/me")
async def patch_me(body: SettingsUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if body.vibe and body.vibe not in VIBE_PROMPTS:
        raise HTTPException(400, "invalid vibe")
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


@api.get("/today")
async def today(user: dict = Depends(get_current_user)):
    await seed_user_if_empty(user["user_id"])
    tasks = await db.tasks.find(
        {"user_id": user["user_id"], "status": {"$in": ["todo", "doing"]}}, {"_id": 0}
    ).to_list(200)
    now = datetime.now(timezone.utc)
    tasks.sort(key=lambda t: task_score(t, now), reverse=True)
    top = tasks[:3]
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    events = await db.events.find(
        {"user_id": user["user_id"], "start_at": {"$gte": _iso(today_start), "$lt": _iso(today_end)}},
        {"_id": 0},
    ).to_list(50)
    return {
        "user": user,
        "greeting": _friendly_greeting(user, len(top)),
        "tasks": top,
        "events": events,
    }


@api.get("/calendar")
async def calendar_view(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    events = await db.events.find(
        {"user_id": user["user_id"], "start_at": {"$gte": _iso(now - timedelta(days=3)), "$lte": _iso(now + timedelta(days=30))}},
        {"_id": 0},
    ).to_list(500)
    tasks = await db.tasks.find(
        {"user_id": user["user_id"], "due_at": {"$ne": None}}, {"_id": 0}
    ).to_list(500)
    task_events = [
        {"id": f"task-{t['id']}", "title": t["title"], "course": t.get("course"),
         "start_at": t["due_at"], "kind": "assignment", "source": t.get("source", "manual"),
         "task_id": t["id"]}
        for t in tasks if t.get("due_at")
    ]
    return {"events": events + task_events}


@api.get("/tasks")
async def list_tasks(user: dict = Depends(get_current_user)):
    return await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)


@api.post("/tasks")
async def create_task(body: TaskCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "status": "todo",
        "created_at": _iso(now),
        **body.model_dump(),
    }
    await db.tasks.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "no fields to update")
    await db.tasks.update_one({"id": task_id, "user_id": user["user_id"]}, {"$set": updates})
    t = await db.tasks.find_one({"id": task_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "task not found")
    return t


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    res = await db.tasks.delete_one({"id": task_id, "user_id": user["user_id"]})
    return {"deleted": res.deleted_count}


@api.post("/assignments/import")
async def import_assignments(
    payload: AssignmentImportPayload, user: dict = Depends(get_current_user)
):
    added: List[dict] = []
    skipped = 0
    now_iso = _iso(datetime.now(timezone.utc))
    for a in payload.assignments:
        existing = await db.tasks.find_one(
            {"user_id": user["user_id"], "title": a.title, "course": a.course, "source": payload.source},
            {"_id": 0},
        )
        if existing:
            skipped += 1
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "title": a.title, "course": a.course,
            "due_at": a.due_at, "source": payload.source,
            "effort_min": 45, "importance": 3, "status": "todo",
            "steps": [
                "Open assignment page", "Read what's being asked (2 min)",
                "Do the first tiny part", "Take a short break", "Finish + submit",
            ],
            "created_at": now_iso,
        }
        await db.tasks.insert_one(dict(doc))
        doc.pop("_id", None)
        added.append(doc)
    await db.integrations.update_one(
        {"id": payload.source, "user_id": user["user_id"]},
        {"$set": {"last_sync_at": now_iso, "status": "live"}},
    )
    return {"added": added, "skipped": skipped, "count": len(added)}


@api.get("/integrations")
async def list_integrations(user: dict = Depends(get_current_user)):
    await seed_user_if_empty(user["user_id"])
    items = await db.integrations.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    # Annotate with whether real creds are configured
    live_hints = {
        "google_calendar": google_ready(),
        "notion": notion_ready(),
    }
    for it in items:
        it["configured"] = live_hints.get(it["id"], False)
    return items


@api.post("/integrations/{integration_id}/sync")
async def sync_integration(integration_id: str, user: dict = Depends(get_current_user)):
    integ = await db.integrations.find_one(
        {"id": integration_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not integ:
        raise HTTPException(404, "integration not found")
    added = 0
    now = datetime.now(timezone.utc)

    if integration_id == "google_calendar":
        if google_ready() and user.get("google_tokens"):
            added = await sync_google(db, user)
        else:
            # mock fallback
            sample = {
                "id": str(uuid.uuid4()),
                "user_id": user["user_id"],
                "title": "Study Group — Organic Chem",
                "course": "CHEM 210",
                "start_at": _iso((now + timedelta(days=2)).replace(hour=18, minute=0, second=0, microsecond=0)),
                "end_at": _iso((now + timedelta(days=2)).replace(hour=19, minute=30, second=0, microsecond=0)),
                "kind": "event",
                "source": "google_calendar",
            }
            exists = await db.events.find_one({"user_id": user["user_id"], "title": sample["title"], "start_at": sample["start_at"]})
            if not exists:
                await db.events.insert_one(sample)
                added = 1
    elif integration_id == "notion":
        if notion_ready():
            # refreshed global credentials; sync into this user
            added = await sync_notion(db, user)
        else:
            sample_item = {
                "title": "Read Hooks — Teaching to Transgress Ch.1",
                "course": "EDU 200",
                "due_at": _iso(now + timedelta(days=3)),
            }
            existing = await db.tasks.find_one(
                {"user_id": user["user_id"], "title": sample_item["title"], "source": "notion"}, {"_id": 0}
            )
            if not existing:
                await db.tasks.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user["user_id"],
                    "source": "notion", "status": "todo", "effort_min": 40, "importance": 3,
                    "steps": [], "created_at": _iso(now), **sample_item,
                })
                added = 1
    # brightspace has no server-side sync

    status = "live" if (added or integration_id == "brightspace") else integ.get("status", "mock")
    await db.integrations.update_one(
        {"id": integration_id, "user_id": user["user_id"]},
        {"$set": {"last_sync_at": _iso(now), "status": status}},
    )
    integ = await db.integrations.find_one({"id": integration_id, "user_id": user["user_id"]}, {"_id": 0})
    return {"integration": integ, "added": added}


@api.post("/integrations/{integration_id}/disconnect")
async def disconnect_integration(integration_id: str, user: dict = Depends(get_current_user)):
    await db.integrations.update_one(
        {"id": integration_id, "user_id": user["user_id"]},
        {"$set": {"status": "disconnected", "last_sync_at": None}},
    )
    if integration_id == "google_calendar":
        await db.users.update_one({"user_id": user["user_id"]}, {"$unset": {"google_tokens": ""}})
    return await db.integrations.find_one({"id": integration_id, "user_id": user["user_id"]}, {"_id": 0})


@api.post("/chat")
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    conversation_id = body.conversation_id or str(uuid.uuid4())
    tasks = await db.tasks.find(
        {"user_id": user["user_id"], "status": {"$in": ["todo", "doing"]}}, {"_id": 0}
    ).to_list(200)
    now = datetime.now(timezone.utc)
    tasks.sort(key=lambda t: task_score(t, now), reverse=True)

    user_msg = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "conversation_id": conversation_id,
        "role": "user",
        "text": body.text,
        "created_at": _iso(now),
    }
    await db.messages.insert_one(dict(user_msg))

    system_prompt = build_system_prompt(user, tasks)
    try:
        chat_client = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation_id,
            system_message=system_prompt,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat_client.send_message(UserMessage(text=body.text))
    except Exception as exc:
        logger.exception("LLM error: %s", exc)
        reply = (
            f"start with: {tasks[0]['title']}. just 5 min. want it broken down?"
            if tasks else "nothing urgent. take 5, drink water, come back when ready."
        )

    assistant_msg = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "conversation_id": conversation_id,
        "role": "assistant",
        "text": reply,
        "created_at": _iso(datetime.now(timezone.utc)),
    }
    await db.messages.insert_one(dict(assistant_msg))
    assistant_msg.pop("_id", None)
    return {"conversation_id": conversation_id, "message": assistant_msg}


@api.get("/chat/{conversation_id}")
async def get_chat(conversation_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.messages.find(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"conversation_id": conversation_id, "messages": msgs}


@api.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user["user_id"]}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$conversation_id", "last": {"$first": "$$ROOT"}}},
        {"$limit": 20},
    ]
    docs = await db.messages.aggregate(pipeline).to_list(20)
    return [
        {"conversation_id": d["_id"], "last_text": d["last"]["text"],
         "last_at": d["last"]["created_at"], "role": d["last"]["role"]}
        for d in docs
    ]


# ─────────── App wiring ───────────
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        # Back-compat: keep demo-user playable without login by seeding a local
        # test session (only if the demo user still exists from earlier build).
        demo = await db.users.find_one({"user_id": "demo-user"}, {"_id": 0})
        if not demo:
            # ensure collections exist so scheduler can run
            pass
        start_scheduler(db)
    except Exception as e:
        logger.exception("startup error: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    stop_scheduler()
    client.close()
