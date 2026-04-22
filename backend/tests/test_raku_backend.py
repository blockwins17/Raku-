"""End-to-end API tests for Raku backend (demo-user mode)."""
import os
import time
import uuid

import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent.parent / "frontend" / ".env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─── User / Settings ─────────────────────────────────────────────────
class TestUser:
    def test_get_me(self, client):
        r = client.get(f"{API}/me")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "demo-user"
        assert "accent_color" in data
        assert "vibe" in data

    def test_patch_me_accent_and_vibe(self, client):
        r = client.patch(f"{API}/me", json={"accent_color": "#F5B841", "vibe": "study"})
        assert r.status_code == 200
        assert r.json()["accent_color"] == "#F5B841"
        assert r.json()["vibe"] == "study"
        # verify persistence
        r2 = client.get(f"{API}/me")
        assert r2.json()["accent_color"] == "#F5B841"
        assert r2.json()["vibe"] == "study"


# ─── Today ───────────────────────────────────────────────────────────
class TestToday:
    def test_today(self, client):
        r = client.get(f"{API}/today")
        assert r.status_code == 200
        data = r.json()
        assert "greeting" in data and isinstance(data["greeting"], str)
        assert "tasks" in data and isinstance(data["tasks"], list)
        assert len(data["tasks"]) <= 3
        assert "events" in data and isinstance(data["events"], list)
        assert "user" in data


# ─── Calendar ────────────────────────────────────────────────────────
class TestCalendar:
    def test_calendar(self, client):
        r = client.get(f"{API}/calendar")
        assert r.status_code == 200
        data = r.json()
        assert "events" in data
        assert isinstance(data["events"], list)
        # events should include both native events and task-derived items
        kinds = {e.get("kind") for e in data["events"]}
        assert any(k in kinds for k in ("class", "exam", "event", "assignment"))


# ─── Tasks CRUD ──────────────────────────────────────────────────────
class TestTasksCRUD:
    created_id = None

    def test_list_tasks(self, client):
        r = client.get(f"{API}/tasks")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_task(self, client):
        payload = {
            "title": f"TEST_task_{uuid.uuid4().hex[:6]}",
            "course": "TEST 999",
            "effort_min": 20,
            "importance": 2,
        }
        r = client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == payload["title"]
        assert data["status"] == "todo"
        assert "id" in data
        TestTasksCRUD.created_id = data["id"]

        # verify via list
        r2 = client.get(f"{API}/tasks")
        assert any(t["id"] == data["id"] for t in r2.json())

    def test_update_task_status(self, client):
        assert TestTasksCRUD.created_id, "previous create failed"
        r = client.patch(
            f"{API}/tasks/{TestTasksCRUD.created_id}", json={"status": "done"}
        )
        assert r.status_code == 200
        assert r.json()["status"] == "done"

    def test_delete_task(self, client):
        assert TestTasksCRUD.created_id
        r = client.delete(f"{API}/tasks/{TestTasksCRUD.created_id}")
        assert r.status_code == 200
        assert r.json()["deleted"] == 1
        # verify gone
        r2 = client.get(f"{API}/tasks")
        assert not any(t["id"] == TestTasksCRUD.created_id for t in r2.json())


# ─── Assignment Import (dedupe) ──────────────────────────────────────
class TestAssignmentImport:
    def test_import_and_dedupe(self, client):
        unique_title = f"TEST_import_{uuid.uuid4().hex[:6]}"
        payload = {
            "source": "brightspace",
            "assignments": [
                {"title": unique_title, "course": "TEST 100"},
                {"title": unique_title, "course": "TEST 100"},  # dup same batch => but dedupe fires on DB existence
            ],
        }
        r = client.post(f"{API}/assignments/import", json=payload)
        assert r.status_code == 200
        data = r.json()
        # First insert adds it; second call in same list: first inserts then second finds it
        assert data["count"] >= 1
        assert len(data["added"]) >= 1
        task = data["added"][0]
        assert task["source"] == "brightspace"
        assert isinstance(task.get("steps"), list) and len(task["steps"]) > 0

        # Re-import same → should be deduped
        r2 = client.post(f"{API}/assignments/import", json=payload)
        d2 = r2.json()
        assert d2["count"] == 0
        assert d2["skipped"] >= 1

        # cleanup
        for t in data["added"]:
            client.delete(f"{API}/tasks/{t['id']}")


# ─── Integrations ────────────────────────────────────────────────────
class TestIntegrations:
    def test_list_integrations(self, client):
        r = client.get(f"{API}/integrations")
        assert r.status_code == 200
        items = r.json()
        ids = {i["id"] for i in items}
        assert {"brightspace", "google_calendar", "notion"}.issubset(ids)
        bs = next(i for i in items if i["id"] == "brightspace")
        assert bs["status"] in ("ready", "live")

    def test_sync_google_calendar(self, client):
        r = client.post(f"{API}/integrations/google_calendar/sync")
        assert r.status_code == 200
        data = r.json()
        assert data["integration"]["id"] == "google_calendar"
        assert data["integration"]["status"] == "live"
        assert data["integration"]["last_sync_at"] is not None

    def test_sync_notion(self, client):
        r = client.post(f"{API}/integrations/notion/sync")
        assert r.status_code == 200
        data = r.json()
        assert data["integration"]["id"] == "notion"
        assert data["integration"]["last_sync_at"] is not None

    def test_disconnect_integration(self, client):
        r = client.post(f"{API}/integrations/google_calendar/disconnect")
        assert r.status_code == 200
        assert r.json()["status"] == "disconnected"
        # re-sync to restore for later/UI testing
        client.post(f"{API}/integrations/google_calendar/sync")


# ─── Chat ────────────────────────────────────────────────────────────
class TestChat:
    def test_chat_send_and_replay(self, client):
        r = client.post(f"{API}/chat", json={"text": "what now?"}, timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "conversation_id" in data
        assert "message" in data
        msg = data["message"]
        assert msg["role"] == "assistant"
        assert isinstance(msg["text"], str) and len(msg["text"]) > 0
        conv_id = data["conversation_id"]

        # Send follow-up
        r2 = client.post(
            f"{API}/chat",
            json={"text": "break it into steps", "conversation_id": conv_id},
            timeout=60,
        )
        assert r2.status_code == 200
        assert r2.json()["conversation_id"] == conv_id

        # Replay
        time.sleep(0.5)
        r3 = client.get(f"{API}/chat/{conv_id}")
        assert r3.status_code == 200
        msgs = r3.json()["messages"]
        assert len(msgs) >= 4  # 2 user + 2 assistant
        roles = [m["role"] for m in msgs]
        assert roles[0] == "user" and roles[1] == "assistant"
        # chronological
        times = [m["created_at"] for m in msgs]
        assert times == sorted(times)
