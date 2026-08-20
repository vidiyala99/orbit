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


from datetime import datetime, timedelta, timezone
from app.models import EmailVerificationToken, PasswordResetToken
from app.security import generate_opaque_token


def test_verify_email_marks_user_verified(db_session):
    client = next(_client(db_session))
    user = User(email="verify@example.com", name="V", password_hash=hash_password("password123"))
    db_session.add(user)
    db_session.commit()
    token = generate_opaque_token()
    db_session.add(EmailVerificationToken(
        user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    ))
    db_session.commit()

    res = client.post("/auth/verify-email", json={"token": token})
    assert res.status_code == 200

    db_session.refresh(user)
    assert user.email_verified_at is not None


def test_verify_email_rejects_expired_token(db_session):
    client = next(_client(db_session))
    user = User(email="expired@example.com", name="E", password_hash=hash_password("password123"))
    db_session.add(user)
    db_session.commit()
    token = generate_opaque_token()
    db_session.add(EmailVerificationToken(
        user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    ))
    db_session.commit()

    res = client.post("/auth/verify-email", json={"token": token})
    assert res.status_code == 400


def test_verify_email_rejects_reused_token(db_session):
    client = next(_client(db_session))
    user = User(email="reuse@example.com", name="R", password_hash=hash_password("password123"))
    db_session.add(user)
    db_session.commit()
    token = generate_opaque_token()
    db_session.add(EmailVerificationToken(
        user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    ))
    db_session.commit()

    client.post("/auth/verify-email", json={"token": token})
    res = client.post("/auth/verify-email", json={"token": token})
    assert res.status_code == 400


@patch("app.routers.auth.send_password_reset_email")
def test_request_password_reset_always_returns_200(mock_send, db_session):
    client = next(_client(db_session))
    res_known = client.post("/auth/request-password-reset", json={"email": "nobody@example.com"})
    assert res_known.status_code == 200
    assert not mock_send.called  # unknown email — no email sent, but same response


@patch("app.routers.auth.send_password_reset_email")
def test_request_password_reset_sends_email_for_known_user(mock_send, db_session):
    client = next(_client(db_session))
    db_session.add(User(email="known@example.com", name="K", password_hash=hash_password("oldpassword1")))
    db_session.commit()

    res = client.post("/auth/request-password-reset", json={"email": "known@example.com"})
    assert res.status_code == 200
    assert mock_send.called


def test_reset_password_updates_hash_and_invalidates_token(db_session):
    client = next(_client(db_session))
    user = User(email="reset@example.com", name="R", password_hash=hash_password("oldpassword1"))
    db_session.add(user)
    db_session.commit()
    token = generate_opaque_token()
    db_session.add(PasswordResetToken(
        user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    ))
    db_session.commit()

    res = client.post("/auth/reset-password", json={"token": token, "new_password": "newpassword2"})
    assert res.status_code == 200

    login_res = client.post("/auth/login", json={"email": "reset@example.com", "password": "newpassword2"})
    assert login_res.status_code == 200

    reuse_res = client.post("/auth/reset-password", json={"token": token, "new_password": "anotherone3"})
    assert reuse_res.status_code == 400


from unittest.mock import MagicMock


@patch("app.routers.auth.httpx.get")
@patch("app.routers.auth.httpx.post")
def test_google_callback_creates_new_user_and_redirects_with_code(mock_post, mock_get, db_session):
    client = next(_client(db_session))
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "google-access-token"})
    mock_get.return_value = MagicMock(
        status_code=200,
        json=lambda: {"sub": "google-user-123", "email": "googleuser@example.com", "name": "Google User"},
    )

    res = client.get("/auth/google/callback?code=fake-auth-code", follow_redirects=False)
    assert res.status_code == 307
    location = res.headers["location"]
    assert "code=" in location

    user = db_session.query(User).filter(User.email == "googleuser@example.com").one()
    assert user.google_id == "google-user-123"


@patch("app.routers.auth.httpx.get")
@patch("app.routers.auth.httpx.post")
def test_google_callback_links_existing_password_account_by_email(mock_post, mock_get, db_session):
    client = next(_client(db_session))
    db_session.add(User(email="existing@example.com", name="E", password_hash=hash_password("somepassword1")))
    db_session.commit()

    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "google-access-token"})
    mock_get.return_value = MagicMock(
        status_code=200,
        json=lambda: {"sub": "google-user-456", "email": "existing@example.com", "name": "Existing"},
    )

    client.get("/auth/google/callback?code=fake-auth-code", follow_redirects=False)

    user = db_session.query(User).filter(User.email == "existing@example.com").one()
    assert user.google_id == "google-user-456"
    assert user.password_hash is not None  # still has their password too


@patch("app.routers.auth.httpx.get")
@patch("app.routers.auth.httpx.post")
def test_google_exchange_returns_jwt_for_valid_code(mock_post, mock_get, db_session):
    client = next(_client(db_session))
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "google-access-token"})
    mock_get.return_value = MagicMock(
        status_code=200,
        json=lambda: {"sub": "google-user-789", "email": "exchange@example.com", "name": "Exchange"},
    )
    callback_res = client.get("/auth/google/callback?code=fake-auth-code", follow_redirects=False)
    one_time_code = callback_res.headers["location"].split("code=")[1]

    exchange_res = client.post("/auth/google/exchange", json={"code": one_time_code})
    assert exchange_res.status_code == 200
    assert "access_token" in exchange_res.json()


def test_google_exchange_rejects_unknown_code(db_session):
    client = next(_client(db_session))
    res = client.post("/auth/google/exchange", json={"code": "not-a-real-code"})
    assert res.status_code == 400


@patch("app.routers.auth.httpx.get")
@patch("app.routers.auth.httpx.post")
def test_google_exchange_code_is_single_use(mock_post, mock_get, db_session):
    client = next(_client(db_session))
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "google-access-token"})
    mock_get.return_value = MagicMock(
        status_code=200,
        json=lambda: {"sub": "google-user-999", "email": "singleuse@example.com", "name": "Single Use"},
    )
    callback_res = client.get("/auth/google/callback?code=fake-auth-code", follow_redirects=False)
    one_time_code = callback_res.headers["location"].split("code=")[1]

    client.post("/auth/google/exchange", json={"code": one_time_code})
    res = client.post("/auth/google/exchange", json={"code": one_time_code})
    assert res.status_code == 400
