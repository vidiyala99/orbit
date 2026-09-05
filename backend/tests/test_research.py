from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.db import get_db
from app.main import app
from app.models import Plan, User


def _user(db_session, email="researcher@example.com"):
    user = User(email=email, first_name="Ada", onboarded_at=datetime.now(timezone.utc))
    db_session.add(user)
    db_session.commit()
    return user


def _client_as(db_session, user):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def test_research_requires_auth(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    resp = client.post(
        "/research",
        json={"query": "AI meetup downtown"},
        headers={"Authorization": "Bearer not-a-token"},
    )
    assert resp.status_code == 401
    app.dependency_overrides.clear()


def test_research_offline_brief_when_linkup_key_missing(db_session):
    user = _user(db_session)
    client = _client_as(db_session, user)

    resp = client.post("/research", json={"query": "coffee chat in Palo Alto"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "offline"
    assert "coffee chat in Palo Alto" in body["answer"]
    assert body["sources"] == []
    app.dependency_overrides.clear()


def test_research_uses_linkup_when_key_is_set(db_session, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "linkup_api_key", "lk_test")
    user = _user(db_session)
    client = _client_as(db_session, user)

    fake = {
        "answer": "Founders coffee is a weekly Palo Alto meetup.",
        "sources": [{"name": "Luma", "url": "https://lu.ma/example"}],
    }
    with patch("app.linkup.httpx.post") as mock_post:
        mock_post.return_value.raise_for_status = lambda: None
        mock_post.return_value.json.return_value = fake
        resp = client.post("/research", json={"query": "founders coffee palo alto"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "linkup"
    assert "Founders coffee" in body["answer"]
    assert body["sources"][0]["url"] == "https://lu.ma/example"
    sent = mock_post.call_args.kwargs["json"]
    assert sent["depth"] == "deep"
    assert sent["outputType"] == "sourcedAnswer"
    app.dependency_overrides.clear()


def test_plan_research_includes_plan_text(db_session):
    user = _user(db_session)
    now = datetime.now(timezone.utc)
    plan = Plan(
        user_id=user.id,
        activity="event",
        openness="open_to_chat",
        detail="Burning Token side event",
        text="Heading to an event, open to chat — around for the next 2 hours. Burning Token side event",
        lat=37.442,
        lon=-122.143,
        location="SRID=4326;POINT(-122.143 37.442)",
        starts_at=now,
        ends_at=now + timedelta(hours=2),
    )
    db_session.add(plan)
    db_session.commit()
    client = _client_as(db_session, user)

    resp = client.post(f"/plans/{plan.id}/research", json={})

    assert resp.status_code == 200
    assert "Burning Token" in resp.json()["answer"]
    app.dependency_overrides.clear()


def test_plan_research_404_for_unknown_plan(db_session):
    user = _user(db_session)
    client = _client_as(db_session, user)
    resp = client.post(f"/plans/{uuid4()}/research", json={})
    assert resp.status_code == 404
    app.dependency_overrides.clear()
