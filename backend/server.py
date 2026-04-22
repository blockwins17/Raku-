"""Raku backend — AI academic OS for college students.

Minimal, single-user demo instance.  Every API route is prefixed with /api so
Kubernetes ingress routes it correctly.  Data lives in MongoDB via motor.
Chat is powered by Claude Sonnet 4.5 through the Emergent LLM key.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ───────────────────────── Setup ────────────────────────────────────────
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
DEMO_USER_ID = "demo-user"

app = FastAPI(title="Raku API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("raku")


# ───────────────────────── Models ───────────────────────────────────────
def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Student"
    pronouns: str = "they/them"
    accent_color: str = "#8BE3B4"  # soft mint
    vibe: Literal["chill", "hype", "study", "quiet"] = "chill"
    created_at: str = Field(default_factory=lambda: _iso(datetime.now(timezone.utc)))


class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEMO_USER_ID
    title: str
    course: Optional[str] = None
    source: Literal["manual", "brightspace", "notion", "google_calendar", "raku"] = "manual"
    due_at: Optional[str] = None  # ISO
    effort_min: int = 30  # minutes estimate
    importance: int = 3  # 1..5
    status: Literal["todo", "doing", "done", "later"] = "todo"
    steps: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: _iso(datetime.now(timezone.utc)))


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


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = DEMO_USER_ID
    title: str
    course: Optional[str] = None
    start_at: str
    end_at: Optional[str] = None
    source: Literal["manual", "google_calendar", "brightspace", "notion", "raku"] = "manual"
    kind: Literal["class", "exam", "assignment", "event"] = "event"


class Integration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    status: Literal["ready", "mock", "live", "disconnected"] = "ready"
    last_sync_at: Optional[str] = None
    description: str = ""


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: Literal["user", "assistant"]
    text: str
    created_at: str = Field(default_factory=lambda: _iso(datetime.now(timezone.utc)))


class ChatRequest(BaseModel):
    text: str
    conversation_id: Optional[str] = None


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


# ───────────────────────── Helpers ──────────────────────────────────────
async def get_or_create_user() -> dict:
    existing = await db.users.find_one({"id": DEMO_USER_ID}, {"_id": 0})
    if existing:
        return existing
    user = User(id=DEMO_USER_ID).model_dump()
    await db.users.insert_one(user)
    return user


VIBE_PROMPTS = {
    "chill": "You are a chill, caring friend. Warm, funny, low pressure.",
    "hype": "You are an upbeat hype coach. Short, excited, supportive.",
    "study": "You are a calm study buddy. Precise, gentle, focused.",
    "quiet": "You are quiet and minimal. Very short replies, no fluff.",
}


def build_system_prompt(user: dict, tasks: List[dict]) -> str:
    vibe = VIBE_PROMPTS.get(user.get("vibe", "chill"), VIBE_PROMPTS["chill"])
    task_lines = []
    for t in tasks[:8]:
        due = t.get("due_at") or "no due date"
        task_lines.append(f"- {t['title']} ({t.get('course') or 'general'}, due {due})")
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
    """Higher = should be done sooner."""
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
    low_effort_bonus = 10.0 / max(effort, 5)
    return urgency + importance * 5 + low_effort_bonus


# ───────────────────────── Seed ─────────────────────────────────────────
SEED_INTEGRATIONS = [
    {
        "id": "brightspace",
        "name": "Brightspace",
        "status": "ready",
        "description": "Scans assignments via Raku Chrome extension.",
    },
    {
        "id": "google_calendar",
        "name": "Google Calendar",
        "status": "mock",
        "description": "Pulls class times + personal events.",
    },
    {
        "id": "notion",
        "name": "Notion",
        "status": "mock",
        "description": "Syncs a tasks database you pick.",
    },
]


async def seed_if_empty() -> None:
    await get_or_create_user()
    if await db.integrations.count_documents({}) == 0:
        await db.integrations.insert_many([dict(i) for i in SEED_INTEGRATIONS])
    if await db.tasks.count_documents({"user_id": DEMO_USER_ID}) == 0:
        now = datetime.now(timezone.utc)
        demo = [
            Task(
                title="Read Chapter 4 — Intro to Sociology",
                course="SOC 101",
                due_at=_iso(now + timedelta(hours=20)),
                effort_min=40,
                importance=3,
                source="brightspace",
                steps=["Skim headings (3 min)", "Read section 4.1", "Write 3 bullet takeaways"],
            ),
            Task(
                title="Problem Set 3",
                course="MATH 220",
                due_at=_iso(now + timedelta(days=2)),
                effort_min=90,
                importance=5,
                source="brightspace",
                steps=["Open problem set", "Do Q1–Q3", "Break", "Do Q4–Q6", "Check answers"],
            ),
            Task(
                title="Draft essay intro — Identity & Memory",
                course="ENG 210",
                due_at=_iso(now + timedelta(days=4)),
                effort_min=45,
                importance=4,
                source="notion",
                steps=["Pick 1 angle", "Write thesis sentence", "Write 3 support bullets"],
            ),
            Task(
                title="Email professor about extension",
                course="BIO 130",
                due_at=_iso(now + timedelta(hours=6)),
                effort_min=10,
                importance=4,
                source="manual",
                steps=["Open email", "Draft 4 lines", "Send"],
            ),
        ]
        await db.tasks.insert_many([t.model_dump() for t in demo])
    if await db.events.count_documents({"user_id": DEMO_USER_ID}) == 0:
        now = datetime.now(timezone.utc)
        demo_events = [
            Event(
                title="MATH 220 Lecture",
                course="MATH 220",
                start_at=_iso(now.replace(hour=10, minute=0, second=0, microsecond=0)),
                end_at=_iso(now.replace(hour=11, minute=15, second=0, microsecond=0)),
                kind="class",
                source="google_calendar",
            ),
            Event(
                title="SOC 101 Lecture",
                course="SOC 101",
                start_at=_iso((now + timedelta(days=1)).replace(hour=13, minute=0, second=0, microsecond=0)),
                end_at=_iso((now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)),
                kind="class",
                source="google_calendar",
            ),
            Event(
                title="MATH 220 Midterm",
                course="MATH 220",
                start_at=_iso((now + timedelta(days=6)).replace(hour=9, minute=0, second=0, microsecond=0)),
                end_at=_iso((now + timedelta(days=6)).replace(hour=11, minute=0, second=0, microsecond=0)),
                kind="exam",
                source="brightspace",
            ),
        ]
        await db.events.insert_many([e.model_dump() for e in demo_events])


# ───────────────────────── Routes ──────────────────────────────────────
@api.get("/")
async def root():
    return {"app": "raku", "status": "ok"}


@api.get("/me")
async def me():
    user = await get_or_create_user()
    user.pop("_id", None)
    return user


@api.patch("/me")
async def patch_me(body: SettingsUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": DEMO_USER_ID}, {"$set": updates}, upsert=True)
    user = await db.users.find_one({"id": DEMO_USER_ID}, {"_id": 0})
    return user


@api.get("/today")
async def today():
    user = await get_or_create_user()
    tasks = await db.tasks.find(
        {"user_id": DEMO_USER_ID, "status": {"$in": ["todo", "doing"]}}, {"_id": 0}
    ).to_list(200)
    now = datetime.now(timezone.utc)
    tasks.sort(key=lambda t: task_score(t, now), reverse=True)
    top = tasks[:3]
    # Today events
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    events = await db.events.find(
        {
            "user_id": DEMO_USER_ID,
            "start_at": {"$gte": _iso(today_start), "$lt": _iso(today_end)},
        },
        {"_id": 0},
    ).to_list(50)
    return {
        "user": user,
        "greeting": _friendly_greeting(user, len(top)),
        "tasks": top,
        "events": events,
    }


def _friendly_greeting(user: dict, n_tasks: int) -> str:
    name = user.get("name", "").split(" ")[0] or "friend"
    hour = datetime.now(timezone.utc).hour
    tod = "morning" if hour < 12 else ("afternoon" if hour < 18 else "evening")
    if n_tasks == 0:
        return f"Good {tod}, {name}. nothing urgent — breathe."
    if n_tasks == 1:
        return f"Good {tod}, {name}. just one thing worth doing."
    return f"Good {tod}, {name}. {n_tasks} tiny things. we'll do them together."


@api.get("/calendar")
async def calendar_view(start: Optional[str] = None, end: Optional[str] = None):
    now = datetime.now(timezone.utc)
    start_dt = datetime.fromisoformat(start) if start else now - timedelta(days=3)
    end_dt = datetime.fromisoformat(end) if end else now + timedelta(days=30)
    events = await db.events.find(
        {"user_id": DEMO_USER_ID, "start_at": {"$gte": _iso(start_dt), "$lte": _iso(end_dt)}},
        {"_id": 0},
    ).to_list(500)
    tasks = await db.tasks.find(
        {"user_id": DEMO_USER_ID, "due_at": {"$ne": None}}, {"_id": 0}
    ).to_list(500)
    # convert tasks with due_at into lightweight event-like entries
    task_events = [
        {
            "id": f"task-{t['id']}",
            "title": t["title"],
            "course": t.get("course"),
            "start_at": t["due_at"],
            "kind": "assignment",
            "source": t.get("source", "manual"),
            "task_id": t["id"],
        }
        for t in tasks
        if t.get("due_at")
    ]
    return {"events": events + task_events}


@api.get("/tasks")
async def list_tasks():
    tasks = await db.tasks.find({"user_id": DEMO_USER_ID}, {"_id": 0}).to_list(500)
    return tasks


@api.post("/tasks")
async def create_task(body: TaskCreate):
    t = Task(user_id=DEMO_USER_ID, **body.model_dump()).model_dump()
    await db.tasks.insert_one(dict(t))
    t.pop("_id", None)
    return t


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "no fields to update")
    await db.tasks.update_one({"id": task_id, "user_id": DEMO_USER_ID}, {"$set": updates})
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "task not found")
    return t


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    res = await db.tasks.delete_one({"id": task_id, "user_id": DEMO_USER_ID})
    return {"deleted": res.deleted_count}


@api.post("/assignments/import")
async def import_assignments(payload: AssignmentImportPayload):
    """Called by the Chrome extension (and Notion/Google sync) to bulk add tasks."""
    added: List[dict] = []
    skipped = 0
    for a in payload.assignments:
        # dedupe by (title, course, source)
        existing = await db.tasks.find_one(
            {
                "user_id": DEMO_USER_ID,
                "title": a.title,
                "course": a.course,
                "source": payload.source,
            },
            {"_id": 0},
        )
        if existing:
            skipped += 1
            continue
        t = Task(
            user_id=DEMO_USER_ID,
            title=a.title,
            course=a.course,
            due_at=a.due_at,
            source=payload.source,  # type: ignore[arg-type]
            effort_min=45,
            importance=3,
            steps=_quick_steps(a.title),
        ).model_dump()
        await db.tasks.insert_one(dict(t))
        t.pop("_id", None)
        added.append(t)
    # update integration last_sync
    await db.integrations.update_one(
        {"id": payload.source},
        {"$set": {"last_sync_at": _iso(datetime.now(timezone.utc)), "status": "live"}},
        upsert=False,
    )
    return {"added": added, "skipped": skipped, "count": len(added)}


def _quick_steps(title: str) -> List[str]:
    return [
        "Open assignment page",
        "Read what's being asked (2 min)",
        "Do the first tiny part",
        "Take a short break",
        "Finish + submit",
    ]


@api.get("/integrations")
async def list_integrations():
    items = await db.integrations.find({}, {"_id": 0}).to_list(50)
    return items


@api.post("/integrations/{integration_id}/sync")
async def sync_integration(integration_id: str):
    """Mock sync for Google Calendar & Notion. Brightspace is scanned by extension."""
    integ = await db.integrations.find_one({"id": integration_id}, {"_id": 0})
    if not integ:
        raise HTTPException(404, "integration not found")
    now = datetime.now(timezone.utc)
    added = 0
    if integration_id == "google_calendar":
        sample = [
            Event(
                title="Study Group — Organic Chem",
                course="CHEM 210",
                start_at=_iso((now + timedelta(days=2)).replace(hour=18, minute=0, second=0, microsecond=0)),
                end_at=_iso((now + timedelta(days=2)).replace(hour=19, minute=30, second=0, microsecond=0)),
                kind="event",
                source="google_calendar",
            ),
        ]
        for e in sample:
            exists = await db.events.find_one({"title": e.title, "start_at": e.start_at})
            if not exists:
                await db.events.insert_one(e.model_dump())
                added += 1
    elif integration_id == "notion":
        sample = [
            AssignmentImportItem(
                title="Read Hooks — Teaching to Transgress Ch.1",
                course="EDU 200",
                due_at=_iso(now + timedelta(days=3)),
            ),
        ]
        res = await import_assignments(
            AssignmentImportPayload(assignments=sample, source="notion")
        )
        added = res["count"]
    elif integration_id == "brightspace":
        # real syncing happens via extension; mark ready
        pass
    await db.integrations.update_one(
        {"id": integration_id},
        {"$set": {"last_sync_at": _iso(now), "status": "live" if added or integration_id == "brightspace" else integ.get("status", "mock")}},
    )
    integ = await db.integrations.find_one({"id": integration_id}, {"_id": 0})
    return {"integration": integ, "added": added}


@api.post("/integrations/{integration_id}/disconnect")
async def disconnect_integration(integration_id: str):
    await db.integrations.update_one(
        {"id": integration_id}, {"$set": {"status": "disconnected", "last_sync_at": None}}
    )
    integ = await db.integrations.find_one({"id": integration_id}, {"_id": 0})
    return integ


# ───────────── Chat ──────────────
@api.post("/chat")
async def chat(body: ChatRequest):
    user = await get_or_create_user()
    conversation_id = body.conversation_id or str(uuid.uuid4())
    tasks = await db.tasks.find(
        {"user_id": DEMO_USER_ID, "status": {"$in": ["todo", "doing"]}}, {"_id": 0}
    ).to_list(200)
    now = datetime.now(timezone.utc)
    tasks.sort(key=lambda t: task_score(t, now), reverse=True)

    # Save user message
    user_msg = ChatMessage(conversation_id=conversation_id, role="user", text=body.text).model_dump()
    await db.messages.insert_one(dict(user_msg))

    # Replay recent history into the LlmChat session for memory
    history = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(40)

    system_prompt = build_system_prompt(user, tasks)

    try:
        chat_client = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation_id,
            system_message=system_prompt,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        # Feed prior turns (skip the one we just saved — last item) so the model has context
        for m in history[:-1]:
            if m["role"] == "user":
                await chat_client.send_message(UserMessage(text=m["text"]))
        reply = await chat_client.send_message(UserMessage(text=body.text))
    except Exception as exc:  # pragma: no cover
        logger.exception("LLM error: %s", exc)
        reply = _fallback_reply(body.text, tasks)

    assistant_msg = ChatMessage(
        conversation_id=conversation_id, role="assistant", text=reply
    ).model_dump()
    await db.messages.insert_one(dict(assistant_msg))

    assistant_msg.pop("_id", None)
    return {
        "conversation_id": conversation_id,
        "message": assistant_msg,
    }


def _fallback_reply(text: str, tasks: list) -> str:
    if not tasks:
        return "nothing urgent. take 5, drink water, come back when ready."
    top = tasks[0]
    return f"start with: {top['title']}. just the first 5 minutes. want me to break it down?"


@api.get("/chat/{conversation_id}")
async def get_chat(conversation_id: str):
    msgs = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"conversation_id": conversation_id, "messages": msgs}


@api.get("/conversations")
async def list_conversations():
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$conversation_id", "last": {"$first": "$$ROOT"}}},
        {"$limit": 20},
    ]
    docs = await db.messages.aggregate(pipeline).to_list(20)
    return [
        {
            "conversation_id": d["_id"],
            "last_text": d["last"]["text"],
            "last_at": d["last"]["created_at"],
            "role": d["last"]["role"],
        }
        for d in docs
    ]


# ───────────────────────── App wiring ──────────────────────────────────
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
        await seed_if_empty()
        logger.info("raku seeded demo data")
    except Exception as e:  # pragma: no cover
        logger.exception("seed failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
