from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.auth import get_current_user, get_optional_user
from app.db import get_db
from app.models import Plan, User
from app.routers.plans import _assemble_plan_text


def _override_user(db_session, name):
    user = User(email=f"composer_{name}@example.com")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_optional_user] = lambda: user
    return user


NOW = datetime(2026, 8, 23, 12, 0, tzinfo=timezone.utc)


def test_assemble_hour_scale_duration():
    assert _assemble_plan_text(
        "coffee", "open_to_chat", NOW, NOW + timedelta(hours=2), None
    ) == "Grabbing coffee, open to chat — around for the next 2 hours."


def test_assemble_singular_hour():
    assert _assemble_plan_text(
        "cowork", "heads_down", NOW, NOW + timedelta(hours=1), None
    ) == "Working from a spot nearby, heads down, but say hi — around for the next 1 hour."


def test_assemble_sub_hour_duration():
    assert _assemble_plan_text(
        "meal", "actively_meeting", NOW, NOW + timedelta(minutes=30), None
    ) == (
        "Grabbing food, actively looking to meet people "
        "— around for the next 30 minutes."
    )


def test_assemble_half_hour_rounding():
    assert _assemble_plan_text(
        "ride_share", "open_to_chat", NOW, NOW + timedelta(minutes=95), None
    ) == "Heading out, ride share, open to chat — around for the next 1.5 hours."


def test_assemble_appends_detail():
    assert _assemble_plan_text(
        "other", "open_to_chat", NOW, NOW + timedelta(hours=3), "Blue jacket, back patio."
    ) == (
        "Making plans, open to chat — around for the next 3 hours. "
        "Blue jacket, back patio."
    )


def test_assemble_ignores_blank_detail():
    assert _assemble_plan_text(
        "coffee", "open_to_chat", NOW, NOW + timedelta(hours=1), "   "
    ) == "Grabbing coffee, open to chat — around for the next 1 hour."


def test_create_plan_stores_structured_fields_and_assembled_text(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "structured")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    ends = now + timedelta(hours=2)
    resp = client.post("/plans", json={
        "activity": "coffee",
        "openness": "open_to_chat",
        "detail": "Corner table by the window.",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": ends.isoformat(),
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["activity"] == "coffee"
    assert body["openness"] == "open_to_chat"
    assert body["detail"] == "Corner table by the window."
    assert body["text"] == _assemble_plan_text(
        "coffee", "open_to_chat", now, ends, "Corner table by the window."
    )

    stored = db_session.query(Plan).filter(Plan.id == body["id"]).one()
    assert stored.activity == "coffee"
    assert stored.openness == "open_to_chat"
    assert stored.text == body["text"]
    app.dependency_overrides.clear()


def test_create_plan_without_detail(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "nodetail")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    ends = now + timedelta(minutes=45)
    resp = client.post("/plans", json={
        "activity": "cowork", "openness": "heads_down",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": ends.isoformat(),
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["detail"] is None
    assert body["text"] == (
        "Working from a spot nearby, heads down, but say hi "
        "— around for the next 45 minutes."
    )
    app.dependency_overrides.clear()


def test_blocked_content_in_detail_is_rejected(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "blocked_detail")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    resp = client.post("/plans", json={
        "activity": "coffee", "openness": "open_to_chat",
        "detail": "wire transfer needed, click here to claim your prize",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=1)).isoformat(),
    })
    assert resp.status_code == 422
    app.dependency_overrides.clear()


def test_invalid_activity_key_rejected(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "bad_activity")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    resp = client.post("/plans", json={
        "activity": "skydiving", "openness": "open_to_chat",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=1)).isoformat(),
    })
    assert resp.status_code == 422
    app.dependency_overrides.clear()


def test_invalid_openness_key_rejected(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "bad_openness")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    resp = client.post("/plans", json={
        "activity": "coffee", "openness": "vibing",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=1)).isoformat(),
    })
    assert resp.status_code == 422
    app.dependency_overrides.clear()
