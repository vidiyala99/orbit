from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.auth import get_current_user
from app.models import User

def _login_as(db_session, name):
    user = User(email=f"user_{name}@example.com")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user
    return user

def test_creating_thread_twice_returns_same_thread(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya")
    dev = User(email="user_dev@example.com")
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
    dev = User(email="user_dev2@example.com")
    db_session.add(dev); db_session.commit()

    client = TestClient(app)
    thread = client.post("/threads", json={"other_user_id": str(dev.id)}).json()

    outsider = _login_as(db_session, "outsider")
    resp = client.get(f"/threads/{thread['id']}/messages")
    assert resp.status_code == 403
    app.dependency_overrides.clear()

def test_same_user_calling_twice_does_not_confirm_stamp(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya_stamp_twice")
    dev = User(email="user_dev_stamp_twice@example.com")
    db_session.add(dev); db_session.commit()

    client = TestClient(app)
    thread = client.post("/threads", json={"other_user_id": str(dev.id)}).json()

    first = client.post(f"/threads/{thread['id']}/stamp")
    assert first.json()["confirmed"] is False

    second = client.post(f"/threads/{thread['id']}/stamp")
    assert second.json()["confirmed"] is False
    assert second.json()["confirmed_at"] is None

    app.dependency_overrides[get_current_user] = lambda: dev
    third = client.post(f"/threads/{thread['id']}/stamp")
    assert third.json()["confirmed"] is True
    assert third.json()["confirmed_at"] is not None

    app.dependency_overrides.clear()

def test_stamp_requires_both_sides_to_confirm(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya_stamp")
    dev = User(email="user_dev_stamp@example.com")
    db_session.add(dev); db_session.commit()

    client = TestClient(app)
    thread = client.post("/threads", json={"other_user_id": str(dev.id)}).json()

    first = client.post(f"/threads/{thread['id']}/stamp")
    assert first.status_code == 200
    assert first.json()["confirmed"] is False

    app.dependency_overrides[get_current_user] = lambda: dev
    second = client.post(f"/threads/{thread['id']}/stamp")
    assert second.json()["confirmed"] is True
    assert second.json()["confirmed_at"] is not None

    app.dependency_overrides.clear()

def test_cannot_start_thread_with_a_blocked_user(db_session):
    from app.models import Block
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya_block")
    dev = User(email="user_dev_block@example.com")
    db_session.add(dev); db_session.commit()
    db_session.add(Block(blocker_id=priya.id, blocked_id=dev.id))
    db_session.commit()

    client = TestClient(app)
    resp = client.post("/threads", json={"other_user_id": str(dev.id)})
    assert resp.status_code == 403

    # and the block holds in the other direction too
    app.dependency_overrides[get_current_user] = lambda: dev
    reverse = client.post("/threads", json={"other_user_id": str(priya.id)})
    assert reverse.status_code == 403

    app.dependency_overrides.clear()
