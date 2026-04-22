"""Notion real integration for Raku.

Uses notion-client SDK.  User configures NOTION_TOKEN + NOTION_TASKS_DB_ID in
backend/.env (shared, single workspace v1).  Can be swapped to per-user tokens
later by storing tokens on users.notion_tokens.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from notion_client import AsyncClient

logger = logging.getLogger("raku.notion")


def is_configured() -> bool:
    return bool(os.environ.get("NOTION_TOKEN") and os.environ.get("NOTION_TASKS_DB_ID"))


def _parse_page(page: dict) -> Optional[dict]:
    props = page.get("properties", {}) or {}
    title = ""
    status = None
    due_at = None
    course = None

    for _, v in props.items():
        t = v.get("type")
        if t == "title":
            title = "".join(
                x.get("plain_text", "") for x in (v.get("title") or [])
            ).strip()
        elif t in ("select", "status") and not status:
            sel = v.get(t)
            if sel:
                status = sel.get("name")
        elif t == "date" and not due_at:
            d = v.get("date") or {}
            start = d.get("start")
            if start:
                try:
                    # Normalize to ISO UTC
                    if "T" in start:
                        dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    else:
                        dt = datetime.fromisoformat(start + "T23:59:00+00:00")
                    due_at = dt.astimezone(timezone.utc).isoformat()
                except Exception:
                    due_at = None
        elif t == "rich_text" and not course:
            rt = v.get("rich_text") or []
            joined = "".join(x.get("plain_text", "") for x in rt).strip()
            if joined:
                course = joined

    if not title:
        return None
    return {
        "title": title,
        "course": course,
        "due_at": due_at,
        "notion_status": status,
        "notion_page_id": page.get("id"),
    }


async def fetch_tasks() -> List[dict]:
    if not is_configured():
        return []
    token = os.environ["NOTION_TOKEN"]
    db_id = os.environ["NOTION_TASKS_DB_ID"]
    client = AsyncClient(auth=token)
    results: List[dict] = []
    try:
        cursor = None
        while True:
            q = {"database_id": db_id, "page_size": 100}
            if cursor:
                q["start_cursor"] = cursor
            page = await client.databases.query(**q)
            for p in page.get("results", []):
                parsed = _parse_page(p)
                if parsed:
                    results.append(parsed)
            if not page.get("has_more"):
                break
            cursor = page.get("next_cursor")
    except Exception as e:  # pragma: no cover
        logger.warning("notion fetch failed: %s", e)
    finally:
        await client.aclose()
    return results


async def sync_for_user(db: AsyncIOMotorDatabase, user: dict) -> int:
    """Import Notion tasks into this user's tasks. Skips already-imported pages."""
    items = await fetch_tasks()
    if not items:
        return 0
    added = 0
    now = datetime.now(timezone.utc).isoformat()
    for it in items:
        # Skip if a notion task with same page id already exists for this user
        existing = await db.tasks.find_one(
            {
                "user_id": user["user_id"],
                "source": "notion",
                "notion_page_id": it["notion_page_id"],
            },
            {"_id": 0},
        )
        if existing:
            continue
        # Skip if Notion page is marked Done
        if it.get("notion_status") and it["notion_status"].lower() in ("done", "complete", "archived"):
            continue
        import uuid as _uuid

        await db.tasks.insert_one(
            {
                "id": str(_uuid.uuid4()),
                "user_id": user["user_id"],
                "title": it["title"],
                "course": it.get("course"),
                "source": "notion",
                "due_at": it.get("due_at"),
                "effort_min": 40,
                "importance": 3,
                "status": "todo",
                "steps": [],
                "notion_page_id": it["notion_page_id"],
                "created_at": now,
            }
        )
        added += 1
    return added
