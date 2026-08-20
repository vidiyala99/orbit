from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.models import User
from app.security import hash_password


def _client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@patch("app.routers.auth.send_verification_email")
def test_signup_creates_user_and_sends_verification(mock_send, db_session):
    client = next(_client(db_session))
    res = client.post("/auth/signup", json={
        "email": "new@example.com", "password": "hunter2hunter2", "name": "New User",
    })
    assert res.status_code == 201
    body = res.json()
    assert "access_token" in body
    assert mock_send.called

    user = db_session.query(User).filter(User.email == "new@example.com").one()
    assert user.password_hash is not None
    assert user.email_verified_at is None


@patch("app.routers.auth.send_verification_email")
def test_signup_rejects_duplicate_email(mock_send, db_session):
    client = next(_client(db_session))
    client.post("/auth/signup", json={"email": "dup@example.com", "password": "hunter2hunter2", "name": "A"})
    res = client.post("/auth/signup", json={"email": "dup@example.com", "password": "hunter2hunter2", "name": "B"})
    assert res.status_code == 409


def test_login_with_correct_password_succeeds(db_session):
    client = next(_client(db_session))
    db_session.add(User(email="login@example.com", name="L", password_hash=hash_password("correcthorse")))
    db_session.commit()

    res = client.post("/auth/login", json={"email": "login@example.com", "password": "correcthorse"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_with_wrong_password_rejected(db_session):
    client = next(_client(db_session))
    db_session.add(User(email="login2@example.com", name="L", password_hash=hash_password("correcthorse")))
    db_session.commit()

    res = client.post("/auth/login", json={"email": "login2@example.com", "password": "wrongpassword"})
    assert res.status_code == 401


def test_login_with_unknown_email_rejected(db_session):
    client = next(_client(db_session))
    res = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert res.status_code == 401


def test_login_rejected_for_google_only_account(db_session):
    client = next(_client(db_session))
    db_session.add(User(email="googleonly@example.com", name="G", google_id="g-123", password_hash=None))
    db_session.commit()

    res = client.post("/auth/login", json={"email": "googleonly@example.com", "password": "anything12345"})
    assert res.status_code == 401
