"""Raku backend tests — multi-user auth + integrations + chat (iteration 2)."""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://focus-nudge-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ─────────── Helpers ───────────
def _plant_session(prefix="A"):
    cli = MongoClient(MONGO_URL)
    db = cli[DB_NAME]
    uid = f"test_user_{prefix}_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    tok = f"test_session_{prefix}_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    db.users.insert_one({
        "user_id": uid,
        "email": f"test.{uid}@example.com",
        "name": f"Test Student {prefix}",
        "picture": "https://via.placeholder.com/150",
        "accent_color": "#8BE3B4",
        "vibe": "chill",
        "pronouns": "they/them",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid,
        "session_token": tok,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    cli.close()
    return uid, tok


def _cleanup_user(uid, tok):
    cli = MongoClient(MONGO_URL)
    db = cli[DB_NAME]
    db.users.delete_many({"user_id": uid})
    db.user_sessions.delete_many({"session_token": tok})
    db.tasks.delete_many({"user_id": uid})
    db.events.delete_many({"user_id": uid})
    db.integrations.delete_many({"user_id": uid})
    db.messages.delete_many({"user_id": uid})
    cli.close()


@pytest.fixture(scope="module")
def session_a():
    uid, tok = _plant_session("A")
    yield uid, tok
    _cleanup_user(uid, tok)


@pytest.fixture(scope="module")
def session_b():
    uid, tok = _plant_session("B")
    yield uid, tok
    _cleanup_user(uid, tok)


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ─────────── Auth tests ───────────
class TestAuth:
    def test_me_unauthenticated_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_authenticated_200(self, session_a):
        uid, tok = session_a
        r = requests.get(f"{API}/auth/me", headers=_h(tok))
        assert r.status_code == 200
        data = r.json()
        assert data["user_id"] == uid
        assert "email" in data

    def test_session_invalid_session_id(self):
        r = requests.post(f"{API}/auth/session", json={"session_id": "bogus_xyz_123"})
        assert r.status_code == 401

    def test_logout_clears_session(self):
        uid, tok = _plant_session("LOGOUT")
        try:
            r1 = requests.get(f"{API}/auth/me", headers=_h(tok))
            assert r1.status_code == 200
            r2 = requests.post(f"{API}/auth/logout", headers=_h(tok))
            assert r2.status_code == 200
            r3 = requests.get(f"{API}/auth/me", headers=_h(tok))
            assert r3.status_code == 401
        finally:
            _cleanup_user(uid, tok)


# ─────────── Protected route gating ───────────
class TestProtectedGating:
    @pytest.mark.parametrize("path,method", [
        ("/auth/me", "GET"),
        ("/me", "GET"),
        ("/today", "GET"),
        ("/calendar", "GET"),
        ("/tasks", "GET"),
        ("/integrations", "GET"),
    ])
    def test_returns_401_unauthenticated(self, path, method):
        r = requests.request(method, f"{API}{path}")
        assert r.status_code == 401, f"{path} returned {r.status_code}"

    def test_chat_unauthenticated_401(self):
        r = requests.post(f"{API}/chat", json={"text": "hi"})
        assert r.status_code == 401

    def test_assignments_import_unauthenticated_401(self):
        r = requests.post(f"{API}/assignments/import", json={"assignments": [], "source": "brightspace"})
        assert r.status_code == 401

    def test_tasks_post_unauthenticated_401(self):
        r = requests.post(f"{API}/tasks", json={"title": "x"})
        assert r.status_code == 401


# ─────────── Today auto-seed ───────────
class TestTodayAutoSeed:
    def test_today_seeds_for_new_user(self):
        uid, tok = _plant_session("SEED")
        try:
            r = requests.get(f"{API}/today", headers=_h(tok))
            assert r.status_code == 200
            data = r.json()
            assert "user" in data and "tasks" in data and "events" in data and "greeting" in data
            assert data["user"]["user_id"] == uid
            # Per-user data should be seeded
            assert len(data["tasks"]) >= 1
        finally:
            _cleanup_user(uid, tok)


# ─────────── Integrations ───────────
class TestIntegrations:
    def test_list_integrations_scoped(self, session_a):
        uid, tok = session_a
        r = requests.get(f"{API}/integrations", headers=_h(tok))
        assert r.status_code == 200
        items = r.json()
        ids = {i["id"]: i for i in items}
        assert "google_calendar" in ids and "notion" in ids and "brightspace" in ids
        # google + notion: env vars empty → configured: false
        assert ids["google_calendar"]["configured"] is False
        assert ids["notion"]["configured"] is False
        assert ids["google_calendar"]["status"] == "mock"
        assert ids["notion"]["status"] == "mock"

    def test_google_sync_mock_adds_event_and_live(self, session_a):
        uid, tok = session_a
        r = requests.post(f"{API}/integrations/google_calendar/sync", headers=_h(tok))
        assert r.status_code == 200
        data = r.json()
        assert data["integration"]["status"] == "live"
        assert data["added"] >= 0  # First call adds 1; second call dedupes
        # Verify event persisted
        r2 = requests.get(f"{API}/calendar", headers=_h(tok))
        assert r2.status_code == 200
        titles = [e["title"] for e in r2.json()["events"]]
        assert any("Study Group" in t for t in titles)

    def test_notion_sync_mock_adds_task(self, session_a):
        uid, tok = session_a
        r = requests.post(f"{API}/integrations/notion/sync", headers=_h(tok))
        assert r.status_code == 200
        data = r.json()
        assert data["integration"]["status"] == "live"
        # Verify task persisted
        r2 = requests.get(f"{API}/tasks", headers=_h(tok))
        titles = [t["title"] for t in r2.json()]
        assert any("Hooks" in t for t in titles)

    def test_oauth_google_connect_503(self, session_a):
        uid, tok = session_a
        r = requests.get(f"{API}/oauth/google/connect", headers=_h(tok))
        assert r.status_code == 503


# ─────────── Per-user isolation ───────────
class TestIsolation:
    def test_tasks_isolated_between_users(self, session_a, session_b):
        uid_a, tok_a = session_a
        uid_b, tok_b = session_b
        # Create a task as A
        r = requests.post(f"{API}/tasks", headers=_h(tok_a), json={"title": "TEST_A_PRIVATE_TASK", "course": "A101"})
        assert r.status_code == 200
        a_task_id = r.json()["id"]
        # B should not see it
        r2 = requests.get(f"{API}/tasks", headers=_h(tok_b))
        assert r2.status_code == 200
        b_titles = [t["title"] for t in r2.json()]
        assert "TEST_A_PRIVATE_TASK" not in b_titles
        # B's calendar shouldn't include it either
        r3 = requests.get(f"{API}/calendar", headers=_h(tok_b))
        b_cal_titles = [e["title"] for e in r3.json()["events"]]
        assert "TEST_A_PRIVATE_TASK" not in b_cal_titles
        # cleanup the task
        requests.delete(f"{API}/tasks/{a_task_id}", headers=_h(tok_a))


# ─────────── Tasks CRUD ───────────
class TestTasksCRUD:
    def test_create_update_delete_task(self, session_a):
        uid, tok = session_a
        # CREATE
        r = requests.post(f"{API}/tasks", headers=_h(tok), json={"title": "TEST_CRUD_TASK", "effort_min": 25})
        assert r.status_code == 200
        tid = r.json()["id"]
        assert r.json()["title"] == "TEST_CRUD_TASK"
        # UPDATE
        r2 = requests.patch(f"{API}/tasks/{tid}", headers=_h(tok), json={"status": "done"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "done"
        # DELETE
        r3 = requests.delete(f"{API}/tasks/{tid}", headers=_h(tok))
        assert r3.status_code == 200
        assert r3.json()["deleted"] == 1


# ─────────── Chat ───────────
class TestChat:
    def test_chat_persists_message(self, session_a):
        uid, tok = session_a
        r = requests.post(f"{API}/chat", headers=_h(tok), json={"text": "what now?"})
        assert r.status_code == 200
        data = r.json()
        assert "conversation_id" in data and "message" in data
        assert data["message"]["role"] == "assistant"
        assert isinstance(data["message"]["text"], str) and len(data["message"]["text"]) > 0
        # Verify both user + assistant msgs persisted with user_id
        cli = MongoClient(MONGO_URL)
        db = cli[DB_NAME]
        msgs = list(db.messages.find({"user_id": uid, "conversation_id": data["conversation_id"]}))
        cli.close()
        assert len(msgs) >= 2
        roles = {m["role"] for m in msgs}
        assert "user" in roles and "assistant" in roles


# ─────────── Assignments import ───────────
class TestAssignmentsImport:
    def test_import_authenticated(self, session_a):
        uid, tok = session_a
        payload = {
            "assignments": [
                {"title": "TEST_IMPORT_HW1", "course": "TEST101", "due_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()},
            ],
            "source": "brightspace",
        }
        r = requests.post(f"{API}/assignments/import", headers=_h(tok), json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 1
        # Re-import should dedupe
        r2 = requests.post(f"{API}/assignments/import", headers=_h(tok), json=payload)
        assert r2.json()["count"] == 0
        assert r2.json()["skipped"] == 1
