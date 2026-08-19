from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.models import WaitlistSignup


def _client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_join_waitlist_creates_signup(db_session):
    client = next(_client(db_session))
    res = client.post("/waitlist", json={"email": "interested@example.com"})
    assert res.status_code == 201
    assert res.json() == {"ok": True}

    signup = db_session.query(WaitlistSignup).filter(WaitlistSignup.email == "interested@example.com").one()
    assert signup.created_at is not None


def test_join_waitlist_is_idempotent_for_duplicate_email(db_session):
    client = next(_client(db_session))
    first = client.post("/waitlist", json={"email": "dup@example.com"})
    second = client.post("/waitlist", json={"email": "dup@example.com"})

    assert first.status_code == 201
    assert second.status_code == 201

    count = db_session.query(WaitlistSignup).filter(WaitlistSignup.email == "dup@example.com").count()
    assert count == 1


def test_waitlist_count_reflects_signups(db_session):
    client = next(_client(db_session))
    client.post("/waitlist", json={"email": "a@example.com"})
    client.post("/waitlist", json={"email": "b@example.com"})

    res = client.get("/waitlist/count")
    assert res.status_code == 200
    assert res.json() == {"count": 2}


def test_waitlist_count_is_zero_initially(db_session):
    client = next(_client(db_session))
    res = client.get("/waitlist/count")
    assert res.json() == {"count": 0}
