from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.db import get_db
from app.main import app
from app.models import (
    Plan,
    Room,
    RoomMember,
    RoomMessage,
    TimeProposal,
    TimeProposalConfirmation,
    User,
)


@pytest.fixture()
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def demo_enabled(monkeypatch):
    monkeypatch.setattr(settings, "demo_login_enabled", True)


def _counts(db):
    return {
        model.__name__: db.query(model).count()
        for model in (
            User, Plan, Room, RoomMember, RoomMessage,
            TimeProposal, TimeProposalConfirmation,
        )
    }


# ------------------------------------------------------------------ off

def test_flag_defaults_to_off_when_unset_in_the_environment():
    """Local dev sets DEMO_LOGIN_ENABLED in backend/.env; anywhere that doesn't
    (staging, prod) must get demo login off without doing anything."""
    assert Settings(_env_file=None).demo_login_enabled is False


def test_demo_login_is_404_when_disabled(client, db_session, monkeypatch):
    """404, not 403: the endpoint must not even look like it exists."""
    monkeypatch.setattr(settings, "demo_login_enabled", False)
    resp = client.post("/auth/demo-login")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Not Found"}
    assert db_session.query(User).count() == 0


# ------------------------------------------------------------------- on

def test_demo_login_returns_login_shaped_token(client, db_session, demo_enabled):
    resp = client.post("/auth/demo-login")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"access_token", "user"}
    assert body["user"]["email"] == "demo@stayconnected.app"

    # The token is a normal session token: it authenticates a normal request.
    me = client.get("/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["id"] == body["user"]["id"]


def test_demo_user_is_fully_onboarded(client, db_session, demo_enabled):
    user = client.post("/auth/demo-login").json()["user"]
    assert user["first_name"] == "Demo"
    assert user["city"] == "Mountain View, CA"
    assert user["lat"] == pytest.approx(37.3861)
    assert user["lon"] == pytest.approx(-122.0839)
    assert user["onboarded_at"] is not None


def test_demo_login_seeds_plans_rooms_and_room_chat(client, db_session, demo_enabled):
    token = client.post("/auth/demo-login").json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    plans = client.get("/plans", params={
        "lat": 37.3861, "lon": -122.0839, "radius_m": 5000,
        "at": datetime.now(timezone.utc).isoformat(),
    }, headers=auth).json()
    assert len(plans) >= 2
    assert len({p["activity"] for p in plans}) > 1
    assert len({p["openness"] for p in plans}) > 1

    rooms = client.get("/rooms", params={
        "lat": 37.3861, "lon": -122.0839, "radius_m": 5000,
    }, headers=auth).json()
    mine = [r for r in rooms if r["is_member"]]
    assert len(mine) >= 2

    # At least one room has a populated thread with both card kinds.
    threads = {
        r["id"]: client.get(f"/rooms/{r['id']}/messages", headers=auth).json()
        for r in mine
    }
    chatty = max(threads.values(), key=len)
    assert len(chatty) >= 4
    kinds = {m["kind"] for m in chatty}
    assert {"text", "plan_share", "time_proposal"} <= kinds
    share = next(m for m in chatty if m["kind"] == "plan_share")
    assert share["plan"] is not None
    card = next(m for m in chatty if m["kind"] == "time_proposal")
    assert card["time_proposal"] is not None

    room_id = next(rid for rid, msgs in threads.items() if msgs is chatty)
    proposals = client.get(f"/rooms/{room_id}/proposals", headers=auth).json()
    assert len(proposals) == 1
    proposal = proposals[0]
    # Open, and partially confirmed, so the UI has something to act on.
    assert proposal["status"] == "proposed"
    assert 0 < len(proposal["confirmations"]) < proposal["member_count"]
    assert proposal["confirmed_by_me"] is False


def test_demo_login_twice_seeds_nothing_new(client, db_session, demo_enabled):
    first = client.post("/auth/demo-login")
    assert first.status_code == 200
    after_first = _counts(db_session)

    second = client.post("/auth/demo-login")
    assert second.status_code == 200
    assert second.json()["user"]["id"] == first.json()["user"]["id"]
    assert _counts(db_session) == after_first


def test_demo_login_refreshes_stale_plans_so_they_are_live(client, db_session, demo_enabled):
    client.post("/auth/demo-login")
    long_ago = datetime.now(timezone.utc) - timedelta(days=3)
    for plan in db_session.query(Plan).all():
        plan.starts_at = long_ago
        plan.ends_at = long_ago + timedelta(hours=1)
    db_session.commit()

    token = client.post("/auth/demo-login").json()["access_token"]
    live = client.get("/plans", params={
        "lat": 37.3861, "lon": -122.0839, "radius_m": 5000,
        "at": datetime.now(timezone.utc).isoformat(),
    }, headers={"Authorization": f"Bearer {token}"}).json()
    assert len(live) >= 2
