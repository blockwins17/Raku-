"""Emergent-managed Google Auth for Raku.

Flow:
1. Frontend kicks user to https://auth.emergentagent.com/?redirect=<dashboard>
2. Emergent bounces back to dashboard with #session_id=<id>
3. Frontend posts that id to /api/auth/session
4. We exchange id → {id, email, name, picture, session_token} via
   GET https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data
   (X-Session-ID header)
5. We upsert the user, persist the session_token (7 days) and set an httpOnly
   cookie.  Every subsequent request reads session_token from cookie or
   Authorization: Bearer header.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

SESSION_COOKIE = "raku_session"
SESSION_TTL_DAYS = 7
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class SessionCreate(BaseModel):
    session_id: str


class AuthedUser(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    accent_color: str = "#8BE3B4"
    vibe: str = "chill"
    pronouns: str = "they/them"


async def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _resolve_session_token(request: Request) -> Optional[str]:
    tok = request.cookies.get(SESSION_COOKIE)
    if tok:
        return tok
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def build_auth_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/auth", tags=["auth"])

    async def get_current_user(request: Request) -> dict:
        token = await _resolve_session_token(request)
        if not token:
            raise HTTPException(status_code=401, detail="not authenticated")
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not sess:
            raise HTTPException(status_code=401, detail="invalid session")
        expires_at = sess["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            await db.user_sessions.delete_one({"session_token": token})
            raise HTTPException(status_code=401, detail="session expired")
        user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="user missing")
        return user

    @router.post("/session")
    async def create_session(body: SessionCreate, response: Response):
        # Exchange session_id with Emergent
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                EMERGENT_SESSION_URL,
                headers={"X-Session-ID": body.session_id},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="invalid session_id")
        data = r.json()
        email = data["email"]
        now = datetime.now(timezone.utc)

        # Upsert user (by email). Generate a stable user_id if new.
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            user_id = existing["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "name": data.get("name") or existing.get("name"),
                        "picture": data.get("picture") or existing.get("picture"),
                        "last_login_at": now.isoformat(),
                    }
                },
            )
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one(
                {
                    "user_id": user_id,
                    "email": email,
                    "name": data.get("name") or email.split("@")[0],
                    "picture": data.get("picture"),
                    "accent_color": "#8BE3B4",
                    "vibe": "chill",
                    "pronouns": "they/them",
                    "created_at": now.isoformat(),
                    "last_login_at": now.isoformat(),
                }
            )

        token = data["session_token"]
        expires = now + timedelta(days=SESSION_TTL_DAYS)
        await db.user_sessions.update_one(
            {"session_token": token},
            {
                "$set": {
                    "session_token": token,
                    "user_id": user_id,
                    "expires_at": expires.isoformat(),
                    "created_at": now.isoformat(),
                }
            },
            upsert=True,
        )

        response.set_cookie(
            key=SESSION_COOKIE,
            value=token,
            max_age=SESSION_TTL_DAYS * 24 * 3600,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"user": user}

    @router.post("/guest")
    async def guest(response: Response):
        """One-click demo login — creates a throwaway user + 7-day session.
        Handy for showing the prototype without Google OAuth."""
        import secrets

        now = datetime.now(timezone.utc)
        user_id = f"guest_{uuid.uuid4().hex[:12]}"
        token = f"guest_{secrets.token_urlsafe(24)}"
        expires = now + timedelta(days=SESSION_TTL_DAYS)
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": f"{user_id}@guest.raku",
                "name": "Guest",
                "picture": None,
                "accent_color": "#8BE3B4",
                "vibe": "chill",
                "pronouns": "they/them",
                "is_guest": True,
                "created_at": now.isoformat(),
                "last_login_at": now.isoformat(),
            }
        )
        await db.user_sessions.insert_one(
            {
                "session_token": token,
                "user_id": user_id,
                "expires_at": expires.isoformat(),
                "created_at": now.isoformat(),
            }
        )
        response.set_cookie(
            key=SESSION_COOKIE,
            value=token,
            max_age=SESSION_TTL_DAYS * 24 * 3600,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"user": user}

    @router.get("/me")
    async def me(current_user: dict = Depends(get_current_user)):
        return current_user

    @router.post("/logout")
    async def logout(request: Request, response: Response):
        token = await _resolve_session_token(request)
        if token:
            await db.user_sessions.delete_one({"session_token": token})
        response.delete_cookie(SESSION_COOKIE, path="/")
        return {"ok": True}

    # expose dependency for other routers
    router.get_current_user = get_current_user  # type: ignore[attr-defined]
    return router
