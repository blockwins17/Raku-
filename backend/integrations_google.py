"""Google Calendar real OAuth integration for Raku.

Per-user refresh_token stored in users.google_tokens.  Reads events (read-only)
and converts them into Raku Events.

Env vars (added to backend/.env but optional — mock path is used when missing):
    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
    GOOGLE_REDIRECT_URI   e.g. https://<frontend>.preview.emergentagent.com/api/oauth/google/callback
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("raku.google_cal")

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def _creds_env():
    return (
        os.environ.get("GOOGLE_CLIENT_ID", ""),
        os.environ.get("GOOGLE_CLIENT_SECRET", ""),
        os.environ.get("GOOGLE_REDIRECT_URI", ""),
    )


def is_configured() -> bool:
    cid, sec, uri = _creds_env()
    return bool(cid and sec and uri)


def build_google_router(db: AsyncIOMotorDatabase, get_current_user) -> APIRouter:
    router = APIRouter(prefix="/oauth/google", tags=["google_calendar"])

    @router.get("/connect")
    async def connect(user: dict = Depends(get_current_user)):
        cid, _sec, uri = _creds_env()
        if not is_configured():
            raise HTTPException(
                status_code=503,
                detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI in backend/.env.",
            )
        # state = user_id so callback can attribute tokens
        import urllib.parse as up

        params = {
            "client_id": cid,
            "redirect_uri": uri,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": user["user_id"],
        }
        return {"authorization_url": f"{AUTH_BASE}?{up.urlencode(params)}"}

    @router.get("/callback")
    async def callback(code: str = Query(...), state: str = Query(...)):
        cid, sec, uri = _creds_env()
        if not is_configured():
            raise HTTPException(status_code=503, detail="not configured")
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                TOKEN_URL,
                data={
                    "code": code,
                    "client_id": cid,
                    "client_secret": sec,
                    "redirect_uri": uri,
                    "grant_type": "authorization_code",
                },
            )
        if r.status_code != 200:
            logger.error("google token exchange failed: %s", r.text)
            raise HTTPException(status_code=400, detail="token exchange failed")
        tokens = r.json()
        await db.users.update_one(
            {"user_id": state},
            {"$set": {"google_tokens": tokens, "google_connected_at": datetime.now(timezone.utc).isoformat()}},
        )
        await db.integrations.update_one(
            {"id": "google_calendar", "user_id": state},
            {"$set": {"status": "live", "last_sync_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        # Bounce back to the app's connections page
        frontend = os.environ.get("FRONTEND_URL") or "/"
        return RedirectResponse(url=f"{frontend}/connections?google=ok")

    return router


async def _credentials_for(db: AsyncIOMotorDatabase, user: dict) -> Optional[Credentials]:
    cid, sec, _uri = _creds_env()
    if not is_configured():
        return None
    tok = (user or {}).get("google_tokens")
    if not tok:
        return None
    creds = Credentials(
        token=tok.get("access_token"),
        refresh_token=tok.get("refresh_token"),
        token_uri=TOKEN_URL,
        client_id=cid,
        client_secret=sec,
        scopes=SCOPES,
    )
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"google_tokens.access_token": creds.token}},
            )
        except Exception as e:
            logger.warning("google refresh failed: %s", e)
            return None
    return creds


async def sync_for_user(db: AsyncIOMotorDatabase, user: dict) -> int:
    """Pull next 30 days of events into our events collection. Returns count added."""
    creds = await _credentials_for(db, user)
    if not creds:
        return 0
    now = datetime.now(timezone.utc)
    try:
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        res = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=(now + timedelta(days=30)).isoformat(),
            singleEvents=True,
            orderBy="startTime",
            maxResults=100,
        ).execute()
    except Exception as e:
        logger.warning("google events fetch failed: %s", e)
        return 0
    added = 0
    for ev in res.get("items", []):
        start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date")
        end = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date")
        if not start:
            continue
        key = {"user_id": user["user_id"], "external_id": ev.get("id"), "source": "google_calendar"}
        doc = {
            **key,
            "id": ev.get("id"),
            "title": ev.get("summary") or "(untitled)",
            "start_at": start,
            "end_at": end,
            "kind": "event",
        }
        exists = await db.events.find_one(key, {"_id": 0})
        if not exists:
            await db.events.insert_one(doc)
            added += 1
    return added
