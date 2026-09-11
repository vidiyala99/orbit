from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.models import Event, Person, User


def _auth_client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    token = client.post("/auth/demo-login").json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
    app.dependency_overrides.clear()


def test_list_events_includes_shortlist_count(db_session):
    client = next(_auth_client(db_session))
    user_id = client.get("/me").json()["id"]

    event = Event(
        user_id=user_id,
        title="Blinkko Launch Party",
        starts_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db_session.add(event)
    db_session.flush()
    db_session.add(Person(user_id=user_id, name="Shuo Chen", event_id=event.id, priority="needs_you"))
    db_session.add(Person(user_id=user_id, name="Fabien Bouhier", event_id=event.id, priority="high"))
    db_session.commit()

    res = client.get("/events")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["title"] == "Blinkko Launch Party"
    assert body[0]["shortlist_count"] == 1


def test_create_event_returns_201_and_lists(db_session):
    client = next(_auth_client(db_session))
    starts = datetime.now(timezone.utc) + timedelta(hours=2)
    res = client.post(
        "/events",
        json={
            "title": "The Corgi Cup",
            "source_url": "https://lu.ma/corgi-cup",
            "location": "9 Claude Ln",
            "starts_at": starts.isoformat(),
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "The Corgi Cup"
    assert body["source_url"] == "https://lu.ma/corgi-cup"
    assert body["location"] == "9 Claude Ln"
    assert body["guest_count"] is None
    assert body["shortlist_count"] == 0

    listed = client.get("/events").json()
    assert any(row["id"] == body["id"] for row in listed)


def test_create_event_requires_auth(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    try:
        res = client.post(
            "/events",
            json={
                "title": "No Auth Event",
                "starts_at": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Authorization": "Bearer not-a-token"},
        )
        assert res.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_get_single_event_requires_ownership(db_session):
    client = next(_auth_client(db_session))
    other_user = User(email="someone-else@example.com")
    db_session.add(other_user)
    db_session.flush()
    other_event = Event(
        user_id=other_user.id,
        title="Not mine",
        starts_at=datetime.now(timezone.utc),
    )
    db_session.add(other_event)
    db_session.commit()

    res = client.get(f"/events/{other_event.id}")
    assert res.status_code == 404


def test_sync_event_recomputes_guest_count_and_synced_at(db_session):
    client = next(_auth_client(db_session))
    user_id = client.get("/me").json()["id"]

    event = Event(
        user_id=user_id,
        title="Blinkko Launch Party",
        starts_at=datetime.now(timezone.utc) + timedelta(days=1),
        guest_count=None,
        synced_at=None,
    )
    db_session.add(event)
    db_session.flush()
    db_session.add(Person(user_id=user_id, name="Shuo Chen", event_id=event.id, priority="needs_you"))
    db_session.add(Person(user_id=user_id, name="Fabien Bouhier", event_id=event.id, priority="high"))
    db_session.commit()

    before = datetime.now(timezone.utc)
    res = client.post(f"/events/{event.id}/sync")
    assert res.status_code == 200
    body = res.json()
    assert body["guest_count"] == 2
    assert body["synced_at"] is not None
    synced_at = datetime.fromisoformat(body["synced_at"].replace("Z", "+00:00"))
    assert synced_at >= before

    db_session.refresh(event)
    assert event.guest_count == 2
    assert event.synced_at is not None


def test_sync_event_requires_ownership(db_session):
    client = next(_auth_client(db_session))
    other_user = User(email="someone-else-sync@example.com")
    db_session.add(other_user)
    db_session.flush()
    other_event = Event(
        user_id=other_user.id,
        title="Not mine",
        starts_at=datetime.now(timezone.utc),
    )
    db_session.add(other_event)
    db_session.commit()

    res = client.post(f"/events/{other_event.id}/sync")
    assert res.status_code == 404


def test_sync_event_not_found(db_session):
    client = next(_auth_client(db_session))
    res = client.post("/events/00000000-0000-0000-0000-000000000000/sync")
    assert res.status_code == 404
