"""Tests for POST /me/luma/connect, /disconnect, /sync."""
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.db import get_db
from app.luma_crypto import encrypt_secret
from app.main import app
from app.models import Event, Person, User


def _auth_client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    token = client.post("/auth/demo-login").json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# /connect
# ---------------------------------------------------------------------------

def test_connect_requires_auth(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    try:
        res = client.post(
            "/me/luma/connect",
            json={"api_key": "luma-test-key"},
            headers={"Authorization": "Bearer not-a-token"},
        )
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_connect_api_key_sets_connected(db_session):
    client = next(_auth_client(db_session))
    res = client.post("/me/luma/connect", json={"api_key": "luma-test-key-123"})
    assert res.status_code == 200
    body = res.json()
    assert body["luma_connected"] is True


def test_connect_start_code_sent(db_session):
    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.request_email_sign_in_code",
        new=AsyncMock(return_value={"ok": True, "status": "code_sent"}),
    ):
        res = client.post("/me/luma/connect/start", json={"email": "me@luma.test"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "code_sent"
    assert body["email"] == "me@luma.test"


def test_connect_start_failure_returns_400(db_session):
    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.request_email_sign_in_code",
        new=AsyncMock(
            return_value={
                "ok": False,
                "status": "error",
                "detail": "Couldn’t send the Luma code automatically.",
            }
        ),
    ):
        res = client.post("/me/luma/connect/start", json={"email": "me@luma.test"})
    assert res.status_code == 400
    assert "code" in res.json()["detail"].lower()


def test_connect_with_email_code_success(db_session):
    fake_cookies = [{"name": "luma.auth", "value": "tok", "domain": ".lu.ma", "path": "/"}]
    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.establish_session_from_email_code",
        new=AsyncMock(return_value=fake_cookies),
    ):
        res = client.post(
            "/me/luma/connect",
            json={"email": "me@luma.test", "code": "123456"},
        )
    assert res.status_code == 200
    assert res.json()["luma_connected"] is True


def test_connect_with_email_code_failure_returns_400(db_session):
    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.establish_session_from_email_code",
        new=AsyncMock(return_value=None),
    ):
        res = client.post(
            "/me/luma/connect",
            json={"email": "me@luma.test", "code": "000000"},
        )
    assert res.status_code == 400
    assert "code" in res.json()["detail"].lower()


def test_connect_with_magic_link_success(db_session):
    fake_cookies = [{"name": "luma.auth", "value": "tok", "domain": ".lu.ma", "path": "/"}]
    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.establish_session_from_magic_link",
        new=AsyncMock(return_value=fake_cookies),
    ):
        res = client.post(
            "/me/luma/connect",
            json={"magic_link": "https://lu.ma/signin/magic?token=abc"},
        )
    assert res.status_code == 200
    assert res.json()["luma_connected"] is True


def test_connect_with_magic_link_failure_returns_400(db_session):
    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.establish_session_from_magic_link",
        new=AsyncMock(return_value=None),
    ):
        res = client.post(
            "/me/luma/connect",
            json={"magic_link": "https://lu.ma/signin/magic?token=expired"},
        )
    assert res.status_code == 400
    detail = res.json()["detail"].lower()
    assert "sign-in" in detail or "code" in detail or "magic" in detail


def test_connect_with_email_password_success(db_session):
    """establish_session returning a cookie list → connected."""
    fake_cookies = [{"name": "session", "value": "abc123", "domain": "lu.ma", "path": "/"}]

    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.establish_session",
        new=AsyncMock(return_value=fake_cookies),
    ):
        res = client.post(
            "/me/luma/connect",
            json={"email": "me@example.com", "password": "secret123"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["luma_connected"] is True


def test_connect_with_email_password_session_none_returns_400(db_session):
    """establish_session returning None → 400 with helpful message."""
    client = next(_auth_client(db_session))
    with patch(
        "app.routers.luma.establish_session",
        new=AsyncMock(return_value=None),
    ):
        res = client.post(
            "/me/luma/connect",
            json={"email": "me@example.com", "password": "secret123"},
        )
    assert res.status_code == 400
    detail = res.json()["detail"].lower()
    assert "password" in detail or "code" in detail or "email" in detail


def test_connect_missing_both_modes_returns_422(db_session):
    """No api_key and no email/password → validation error."""
    client = next(_auth_client(db_session))
    res = client.post("/me/luma/connect", json={})
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# /disconnect
# ---------------------------------------------------------------------------

def test_disconnect_clears_connection(db_session):
    client = next(_auth_client(db_session))
    # First connect
    client.post("/me/luma/connect", json={"api_key": "luma-key"})
    me = client.get("/me").json()
    assert me["luma_connected"] is True

    # Then disconnect
    res = client.post("/me/luma/disconnect")
    assert res.status_code == 200
    body = res.json()
    assert body["luma_connected"] is False

    # Verify /me also reflects it
    me2 = client.get("/me").json()
    assert me2["luma_connected"] is False


def test_disconnect_requires_auth(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    try:
        res = client.post(
            "/me/luma/disconnect",
            headers={"Authorization": "Bearer bad-token"},
        )
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# /sync
# ---------------------------------------------------------------------------

def test_sync_requires_connection(db_session):
    client = next(_auth_client(db_session))
    res = client.post("/me/luma/sync")
    assert res.status_code == 400
    assert "connect" in res.json()["detail"].lower()


def test_sync_creates_events_and_people_via_api_key(db_session):
    """Mock fetch_via_api_key + fetch_event_guests_via_api_key returning data."""
    starts = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    ends = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()

    fake_events = [
        {
            "title": "SF AI Meetup",
            "source_url": "https://lu.ma/sf-ai-meetup",
            "location": "Mission District",
            "starts_at": starts,
            "ends_at": ends,
            "_event_api_id": "evt-sfai123",
        }
    ]
    fake_guests = [
        {"name": "Alice Chen", "role": "ML Engineer", "avatar_url": None,
         "linkedin_url": None, "x_url": None, "relevance": "Works on transformers"},
        {"name": "Bob Park", "role": "Founder", "avatar_url": None,
         "linkedin_url": None, "x_url": None, "relevance": None},
    ]

    client = next(_auth_client(db_session))
    # Connect via api_key
    client.post("/me/luma/connect", json={"api_key": "luma-host-key"})

    with patch("app.routers.luma.fetch_via_api_key", new=AsyncMock(return_value=fake_events)), \
         patch("app.routers.luma.fetch_event_guests_via_api_key", new=AsyncMock(return_value=fake_guests)):
        res = client.post("/me/luma/sync")

    assert res.status_code == 200
    body = res.json()
    assert body["connected"] is True
    assert body["events"] == 1
    assert body["people"] == 2

    # Verify DB state
    user_id = client.get("/me").json()["id"]
    events = db_session.query(Event).filter(Event.user_id == user_id).all()
    assert len(events) == 1
    ev = events[0]
    assert ev.title == "SF AI Meetup"
    assert ev.source_url == "https://lu.ma/sf-ai-meetup"
    assert ev.guest_count == 2
    assert ev.synced_at is not None

    people = db_session.query(Person).filter(Person.event_id == ev.id).all()
    assert len(people) == 2
    names = {p.name for p in people}
    assert names == {"Alice Chen", "Bob Park"}


def test_sync_creates_events_and_people_via_session(db_session):
    """Mock fetch_going_events_today + fetch_event_guests returning data."""
    starts = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    fake_events = [
        {
            "title": "Startup Social",
            "source_url": "https://lu.ma/startup-social",
            "location": "SOMA",
            "starts_at": starts,
            "ends_at": None,
        }
    ]
    fake_guests = [
        {"name": "Dana Kim", "role": "Designer", "avatar_url": None,
         "linkedin_url": None, "x_url": None, "relevance": None},
    ]

    fake_cookies = [{"name": "session", "value": "tok", "domain": "lu.ma", "path": "/"}]

    client = next(_auth_client(db_session))
    with patch("app.routers.luma.establish_session", new=AsyncMock(return_value=fake_cookies)):
        client.post("/me/luma/connect", json={"email": "u@example.com", "password": "pass1234"})

    with patch("app.routers.luma.fetch_going_events_today", new=AsyncMock(return_value=fake_events)), \
         patch("app.routers.luma.fetch_event_guests", new=AsyncMock(return_value=fake_guests)):
        res = client.post("/me/luma/sync")

    assert res.status_code == 200
    body = res.json()
    assert body["events"] == 1
    assert body["people"] == 1


def test_sync_deduplicates_events(db_session):
    """Running sync twice does not create duplicate events."""
    starts = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    fake_events = [
        {
            "title": "Dedup Test Event",
            "source_url": "https://lu.ma/dedup-event",
            "location": None,
            "starts_at": starts,
            "ends_at": None,
            "_event_api_id": "evt-dedup",
        }
    ]

    client = next(_auth_client(db_session))
    client.post("/me/luma/connect", json={"api_key": "key"})

    with patch("app.routers.luma.fetch_via_api_key", new=AsyncMock(return_value=fake_events)), \
         patch("app.routers.luma.fetch_event_guests_via_api_key", new=AsyncMock(return_value=[])):
        client.post("/me/luma/sync")
        res2 = client.post("/me/luma/sync")

    assert res2.status_code == 200
    body = res2.json()
    assert body["events"] == 0  # second run: event already exists


def test_sync_deduplicates_people(db_session):
    """Running sync twice does not create duplicate Person rows."""
    starts = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    fake_events = [
        {
            "title": "People Dedup Event",
            "source_url": "https://lu.ma/people-dedup",
            "location": None,
            "starts_at": starts,
            "ends_at": None,
            "_event_api_id": "evt-pdedup",
        }
    ]
    fake_guests = [{"name": "Evan Ng", "role": None, "avatar_url": None,
                    "linkedin_url": None, "x_url": None, "relevance": None}]

    client = next(_auth_client(db_session))
    client.post("/me/luma/connect", json={"api_key": "key2"})

    with patch("app.routers.luma.fetch_via_api_key", new=AsyncMock(return_value=fake_events)), \
         patch("app.routers.luma.fetch_event_guests_via_api_key", new=AsyncMock(return_value=fake_guests)):
        client.post("/me/luma/sync")
        client.post("/me/luma/sync")

    user_id = client.get("/me").json()["id"]
    events = db_session.query(Event).filter(Event.user_id == user_id,
                                            Event.source_url == "https://lu.ma/people-dedup").all()
    assert len(events) == 1
    people = db_session.query(Person).filter(Person.event_id == events[0].id).all()
    assert len(people) == 1


# ---------------------------------------------------------------------------
# /me exposes luma_connected
# ---------------------------------------------------------------------------

def test_me_exposes_luma_connected_false_by_default(db_session):
    client = next(_auth_client(db_session))
    me = client.get("/me").json()
    assert "luma_connected" in me
    assert me["luma_connected"] is False


def test_me_exposes_luma_connected_true_after_connect(db_session):
    client = next(_auth_client(db_session))
    client.post("/me/luma/connect", json={"api_key": "some-key"})
    me = client.get("/me").json()
    assert me["luma_connected"] is True
