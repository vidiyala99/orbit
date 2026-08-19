from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.auth import get_current_user
from app.models import User

def _login_as(db_session, name):
    user = User(clerk_id=f"user_{name}", name=name)
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user
    return user

def test_creating_thread_twice_returns_same_thread(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya")
    dev = User(clerk_id="user_dev", name="Dev")
    db_session.add(dev); db_session.commit()

    client = TestClient(app)
    first = client.post("/threads", json={"other_user_id": str(dev.id)})

    app.dependency_overrides[get_current_user] = lambda: dev  # switch caller to dev; reversed direction
    second = client.post("/threads", json={"other_user_id": str(priya.id)})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    app.dependency_overrides.clear()

def test_cannot_create_thread_with_self(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya")

    client = TestClient(app)
    resp = client.post("/threads", json={"other_user_id": str(priya.id)})

    assert resp.status_code == 400
    app.dependency_overrides.clear()

def test_non_participant_cannot_read_messages(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya")
    dev = User(clerk_id="user_dev2", name="Dev")
    db_session.add(dev); db_session.commit()

    client = TestClient(app)
    thread = client.post("/threads", json={"other_user_id": str(dev.id)}).json()

    outsider = _login_as(db_session, "outsider")
    resp = client.get(f"/threads/{thread['id']}/messages")
    assert resp.status_code == 403
    app.dependency_overrides.clear()
