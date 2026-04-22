"""Background worker for proactive Raku nudges.

Two recurring jobs:

1. sync_all (every 30 min): for every user with google or notion connected,
   pull new items into their Raku data.
2. morning_checkin (once per day per user around 8am local): drop a short
   assistant message into the user's most-recent chat conversation — or create
   a fresh one — so when they open Raku there's a warm "hey, ready?" waiting.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from motor.motor_asyncio import AsyncIOMotorDatabase

from integrations_google import sync_for_user as sync_google
from integrations_notion import sync_for_user as sync_notion

logger = logging.getLogger("raku.scheduler")

_scheduler: Optional[AsyncIOScheduler] = None


async def sync_all(db: AsyncIOMotorDatabase) -> None:
    users = await db.users.find({}, {"_id": 0}).to_list(500)
    total_g = total_n = 0
    for u in users:
        try:
            total_g += await sync_google(db, u)
        except Exception as e:
            logger.warning("google sync for %s failed: %s", u.get("user_id"), e)
        try:
            total_n += await sync_notion(db, u)
        except Exception as e:
            logger.warning("notion sync for %s failed: %s", u.get("user_id"), e)
    logger.info("sync_all: +%d google, +%d notion across %d users", total_g, total_n, len(users))


MORNING_LINES = [
    "morning. pick one tiny thing? I’ll help you start.",
    "hey. I looked at your week. it’s doable. ready?",
    "soft start. one task, five minutes, then see.",
    "I’ve got your day laid out. open when you want.",
]


async def morning_checkin(db: AsyncIOMotorDatabase) -> None:
    """Drop a short assistant nudge if we haven't today."""
    import random
    import uuid

    users = await db.users.find({}, {"_id": 0}).to_list(500)
    today_key = datetime.now(timezone.utc).date().isoformat()
    for u in users:
        if u.get("last_checkin_date") == today_key:
            continue
        # find latest conversation for this user, else start a new one
        latest = await db.messages.find(
            {"user_id": u["user_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(1)
        conv_id = latest[0]["conversation_id"] if latest else str(uuid.uuid4())
        msg = {
            "id": str(uuid.uuid4()),
            "user_id": u["user_id"],
            "conversation_id": conv_id,
            "role": "assistant",
            "text": random.choice(MORNING_LINES),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "proactive": True,
        }
        await db.messages.insert_one(msg)
        await db.users.update_one(
            {"user_id": u["user_id"]},
            {"$set": {"last_checkin_date": today_key}},
        )
    logger.info("morning_checkin done for %d users", len(users))


def start_scheduler(db: AsyncIOMotorDatabase) -> AsyncIOScheduler:
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler
    sched = AsyncIOScheduler(timezone="UTC")
    # every 30 min
    sched.add_job(sync_all, "interval", minutes=30, args=[db], id="sync_all", replace_existing=True, next_run_time=datetime.now(timezone.utc) + timedelta(seconds=30))
    # once a day at 13:00 UTC (≈ 8am ET, 9am CT) — user-local TZ is v2
    sched.add_job(morning_checkin, "cron", hour=13, minute=0, args=[db], id="morning", replace_existing=True)
    sched.start()
    _scheduler = sched
    logger.info("raku scheduler started")
    return sched


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
