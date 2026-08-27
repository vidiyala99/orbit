from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.auth import get_current_user
from app.models import Message, Thread, User


def _user(db_session, name, **kwargs):
    user = User(email=f"inbox_{name}@example.com", **kwargs)
    db_session.add(user)
    db_session.commit()
    return user


def _login_as(user):
    app.dependency_overrides[get_current_user] = lambda: user


def test_inbox_is_empty_for_a_user_with_no_threads(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    _login_as(_user(db_session, "loner"))

    resp = TestClient(app).get("/threads")

    assert resp.status_code == 200
    assert resp.json() == []
    app.dependency_overrides.clear()


def test_inbox_orders_threads_by_most_recent_message(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _user(db_session, "priya")
    dev = _user(db_session, "dev")
    sam = _user(db_session, "sam")
    _login_as(priya)

    client = TestClient(app)
    stale = client.post("/threads", json={"other_user_id": str(dev.id)}).json()
    fresh = client.post("/threads", json={"other_user_id": str(sam.id)}).json()

    now = datetime.now(timezone.utc)
    db_session.add(
        Message(
            thread_id=stale["id"],
            sender_id=dev.id,
            body="old news",
            created_at=now - timedelta(hours=2),
        )
    )
    db_session.add(
        Message(
            thread_id=fresh["id"],
            sender_id=priya.id,
            body="just now",
            created_at=now - timedelta(minutes=1),
        )
    )
    db_session.commit()

    body = client.get("/threads").json()

    assert [t["id"] for t in body] == [fresh["id"], stale["id"]]
    assert body[0]["last_message"]["body"] == "just now"
    assert body[0]["last_message"]["sender_id"] == str(priya.id)
    assert body[1]["last_message"]["body"] == "old news"
    app.dependency_overrides.clear()


def test_last_message_is_the_newest_one_in_the_thread(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _user(db_session, "priya_multi")
    dev = _user(db_session, "dev_multi")
    _login_as(priya)

    client = TestClient(app)
    thread = client.post("/threads", json={"other_user_id": str(dev.id)}).json()

    now = datetime.now(timezone.utc)
    for offset, body in ((30, "first"), (20, "second"), (10, "latest")):
        db_session.add(
            Message(
                thread_id=thread["id"],
                sender_id=dev.id,
                body=body,
                created_at=now - timedelta(minutes=offset),
            )
        )
    db_session.commit()

    row = client.get("/threads").json()[0]

    assert row["last_message"]["body"] == "latest"
    app.dependency_overrides.clear()


def test_thread_with_no_messages_still_appears_sorted_by_its_created_at(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _user(db_session, "priya_empty")
    dev = _user(db_session, "dev_empty")
    sam = _user(db_session, "sam_empty")
    _login_as(priya)

    now = datetime.now(timezone.utc)
    chatty = Thread(user_a_id=priya.id, user_b_id=dev.id, created_at=now - timedelta(days=1))
    silent = Thread(user_a_id=priya.id, user_b_id=sam.id, created_at=now - timedelta(minutes=5))
    db_session.add_all([chatty, silent])
    db_session.commit()
    db_session.add(
        Message(
            thread_id=chatty.id,
            sender_id=dev.id,
            body="hello",
            created_at=now - timedelta(hours=3),
        )
    )
    db_session.commit()

    body = TestClient(app).get("/threads").json()

    assert [t["id"] for t in body] == [str(silent.id), str(chatty.id)]
    assert body[0]["last_message"] is None
    app.dependency_overrides.clear()


def test_other_participant_is_correct_from_both_sides(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _user(db_session, "priya_sides", first_name="Priya", last_name="R", avatar_url="https://x/p.png")
    dev = _user(db_session, "dev_sides", first_name="Dev", last_name="K", avatar_url="https://x/d.png")

    # Threads store the pair sorted by str(id), so this covers both orientations
    # regardless of which uuid sorts first.
    a, b = sorted([priya.id, dev.id], key=str)
    thread = Thread(user_a_id=a, user_b_id=b)
    db_session.add(thread)
    db_session.commit()

    client = TestClient(app)

    _login_as(priya)
    from_priya = client.get("/threads").json()[0]
    assert from_priya["other_user"]["id"] == str(dev.id)
    assert from_priya["other_user"]["first_name"] == "Dev"
    assert from_priya["other_user"]["last_name"] == "K"
    assert from_priya["other_user"]["avatar_url"] == "https://x/d.png"

    _login_as(dev)
    from_dev = client.get("/threads").json()[0]
    assert from_dev["id"] == from_priya["id"]
    assert from_dev["other_user"]["id"] == str(priya.id)
    assert from_dev["other_user"]["first_name"] == "Priya"

    app.dependency_overrides.clear()


def test_inbox_excludes_threads_the_caller_is_not_part_of(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _user(db_session, "priya_excl")
    dev = _user(db_session, "dev_excl")
    outsider = _user(db_session, "outsider_excl")

    a, b = sorted([priya.id, dev.id], key=str)
    db_session.add(Thread(user_a_id=a, user_b_id=b))
    db_session.commit()

    _login_as(outsider)
    assert TestClient(app).get("/threads").json() == []
    app.dependency_overrides.clear()
