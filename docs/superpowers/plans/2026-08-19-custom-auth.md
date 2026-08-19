# Custom Auth (replace Clerk) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Clerk with self-issued email/password + Google OAuth auth, owned end-to-end by our own FastAPI backend, with a fully custom-styled frontend.

**Architecture:** FastAPI issues and verifies its own JWTs (HS256, 7-day expiry, `sub` = user UUID) instead of verifying Clerk's. The existing Bearer-token-per-request shape is unchanged everywhere it's used in a fetch call; only where the token is parked between requests changes — a `sc_token` cookie (non-httpOnly, so both Next.js Server Components via `next/headers` and client components via `document.cookie` can read it) replaces Clerk's session. Password hashing via `passlib`'s argon2 scheme. Verification and password-reset use single-use, expiring opaque tokens emailed via Resend's HTTP API (called directly with `httpx`, already a dependency — no new SDK). Google OAuth is a direct authorization-code flow against Google, not brokered through a vendor.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, `passlib[argon2]`, `pyjwt` (already present), `httpx` (already present) for both Resend and Google API calls, pytest. Next.js 16 App Router (Server + Client Components), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-19-custom-auth-design.md` — read it alongside this plan; this plan implements it in full, including the cookie-storage correction recorded there.

## Global Constraints

- JWT: HS256, `sub` claim = user UUID (string), 7-day expiry, no refresh token (spec: Session mechanism)
- Password hashing: `passlib` argon2 scheme (spec: Backend endpoints)
- Verification token expiry: 24h. Password-reset token expiry: 1h. Both single-use (spec: Data model changes)
- `email_verified_at` is tracked but never blocks posting/messaging in v1 (spec: Backend endpoints)
- Password-reset request always returns success regardless of whether the email exists, to avoid account enumeration (spec: Backend endpoints)
- Cookie name `sc_token`, path `/`, `SameSite=Lax`, `Secure` in production only, 7-day max-age (spec: Session mechanism, as corrected)
- Google OAuth code exchanged for the JWT via a short-lived one-time code (`POST /auth/google/exchange`), never putting the JWT itself in a redirect URL (spec: Backend endpoints)

---

## Backend

### Task 1: Dependencies and config

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`

**Interfaces:**
- Produces: `settings.jwt_secret: str`, `settings.jwt_algorithm: str`, `settings.resend_api_key: str`, `settings.resend_from_email: str`, `settings.google_client_id: str`, `settings.google_client_secret: str`, `settings.google_redirect_uri: str` — consumed by Tasks 3, 5, 6, 8.

- [ ] **Step 1: Add `passlib[argon2]` to requirements**

Append to `backend/requirements.txt`:
```
passlib[argon2]==1.7.4
```

- [ ] **Step 2: Install it**

Run: `cd backend && .venv/Scripts/pip install -r requirements.txt` (Windows venv layout already in use per the repo)
Expected: `passlib` and `argon2-cffi` install successfully.

- [ ] **Step 3: Add new settings fields, remove the Clerk one**

Edit `backend/app/config.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://stayconnected:localdev@localhost:5433/stayconnected"
    frontend_origin: str = "http://localhost:3000"

    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"

    resend_api_key: str = ""
    resend_from_email: str = "StayConnected <noreply@stayconnected.app>"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: Update the env template**

Replace `backend/.env.example` contents:
```
# Copy to backend/.env and fill in. Never commit the real .env.

# Local Postgres/PostGIS from docker-compose (host port 5433).
DATABASE_URL=postgresql+psycopg://stayconnected:localdev@localhost:5433/stayconnected

# Origin allowed by CORS (where the Next.js app is served from).
FRONTEND_ORIGIN=http://localhost:3000

# Long random string used to sign our own session JWTs. Generate with:
# python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=change-me-to-a-real-secret

# Resend (https://resend.com) API key + verified sender for verification/reset emails.
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=StayConnected <noreply@yourdomain.com>

# Google OAuth 2.0 client, from the Google Cloud Console.
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/config.py backend/.env.example
git commit -m "chore: add auth dependencies and settings for custom auth"
```

---

### Task 2: Data model — User fields, verification/reset token tables

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`
- Create: `backend/alembic/versions/<new>_custom_auth.py` (generated, then hand-adjusted)
- Modify: `backend/tests/test_models.py`

**Interfaces:**
- Produces: `User.email: str`, `User.password_hash: str | None`, `User.email_verified_at: datetime | None`, `User.google_id: str | None` (drops `User.clerk_id`); `EmailVerificationToken(id, user_id, token, expires_at, used_at)`; `PasswordResetToken(id, user_id, token, expires_at, used_at)` — consumed by Tasks 4, 6, 7, 8.

- [ ] **Step 1: Update the `User` model and add the two token tables**

Edit `backend/app/models.py` — replace the `clerk_id` line and add the new tables after `User`:
```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    headline: Mapped[str | None] = mapped_column(String(160), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
```

- [ ] **Step 2: Update `UserOut` schema**

Edit `backend/app/schemas.py` — replace the `UserOut` class:
```python
class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    email_verified_at: datetime | None
    name: str
    headline: str | None
    linkedin_url: str | None
    avatar_url: str | None

    class Config:
        from_attributes = True
```

- [ ] **Step 3: Write a failing test for the new uniqueness constraints**

Add to `backend/tests/test_models.py`:
```python
import pytest
from sqlalchemy.exc import IntegrityError
from app.models import User


def test_duplicate_email_rejected(db_session):
    db_session.add(User(email="dup@example.com", name="A"))
    db_session.commit()
    db_session.add(User(email="dup@example.com", name="B"))
    with pytest.raises(IntegrityError):
        db_session.commit()
```

- [ ] **Step 4: Run it to verify it fails**

Run: `cd backend && .venv/Scripts/pytest tests/test_models.py::test_duplicate_email_rejected -v`
Expected: FAIL — `clerk_id` is still required/`email` column doesn't exist yet (model not updated in the running import) or similar error, since Step 1 hasn't been applied when you check test-first. If you're implementing Step 1 before running this, it will instead FAIL because the table in the test DB (created fresh per test via `Base.metadata.create_all`) doesn't yet reflect the change until Step 1's model edit is saved — apply Step 1 first, then this step confirms IntegrityError is actually raised.

- [ ] **Step 5: Generate and adjust the Alembic migration**

Run: `cd backend && .venv/Scripts/alembic revision --autogenerate -m "custom auth: user fields, verification and reset tokens"`

Open the generated file in `backend/alembic/versions/` and verify it:
- Drops the `ix_users_clerk_id` index and `clerk_id` column
- Adds `email` (unique, indexed, not null), `password_hash` (nullable), `email_verified_at` (nullable), `google_id` (unique, indexed, nullable) to `users`
- Creates `email_verification_tokens` and `password_reset_tokens` tables matching Step 1's models

If autogenerate produces a `NOT NULL` `email` column on a table that might have existing rows (e.g. from local dev seed data), that's fine for this project's stage (pre-launch, no real users) — no backfill migration needed.

- [ ] **Step 6: Run the test suite to verify it passes**

Run: `cd backend && .venv/Scripts/pytest tests/test_models.py -v`
Expected: PASS. (`db_session` fixture creates tables directly from the SQLAlchemy models via `Base.metadata.create_all`, not from the Alembic migration, so this validates the model changes independently of the migration file.)

- [ ] **Step 7: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/alembic/versions/ backend/tests/test_models.py
git commit -m "feat: add email/password/google fields, verification and reset token tables"
```

---

### Task 3: Password hashing and JWT utilities

**Files:**
- Create: `backend/app/security.py`
- Create: `backend/tests/test_security.py`

**Interfaces:**
- Consumes: `settings.jwt_secret`, `settings.jwt_algorithm` (Task 1)
- Produces: `hash_password(password: str) -> str`, `verify_password(password: str, password_hash: str) -> bool`, `create_access_token(user_id: uuid.UUID) -> str`, `decode_access_token(token: str) -> uuid.UUID` (raises `jwt.PyJWTError` on invalid/expired), `generate_opaque_token() -> str` — consumed by Tasks 4, 6, 7, 8.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_security.py`:
```python
import uuid
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from app.security import (
    hash_password, verify_password, create_access_token, decode_access_token, generate_opaque_token,
)
from app.config import settings


def test_hash_and_verify_roundtrip():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_hash_is_not_plaintext():
    assert hash_password("secret") != "secret"


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    assert decode_access_token(token) == user_id


def test_expired_token_rejected():
    user_id = uuid.uuid4()
    expired = jwt.encode(
        {"sub": str(user_id), "iat": datetime.now(timezone.utc) - timedelta(days=8),
         "exp": datetime.now(timezone.utc) - timedelta(days=1)},
        settings.jwt_secret, algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(expired)


def test_tampered_token_rejected():
    token = create_access_token(uuid.uuid4())
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(token + "tampered")


def test_generate_opaque_token_is_unique_and_urlsafe():
    a, b = generate_opaque_token(), generate_opaque_token()
    assert a != b
    assert all(c.isalnum() or c in "-_" for c in a)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && .venv/Scripts/pytest tests/test_security.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.security'`

- [ ] **Step 3: Implement `app/security.py`**

```python
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from .config import settings

_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

ACCESS_TOKEN_LIFETIME = timedelta(days=7)


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + ACCESS_TOKEN_LIFETIME}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> uuid.UUID:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return uuid.UUID(payload["sub"])


def generate_opaque_token() -> str:
    return secrets.token_urlsafe(32)
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && .venv/Scripts/pytest tests/test_security.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/security.py backend/tests/test_security.py
git commit -m "feat: add password hashing and self-issued JWT utilities"
```

---

### Task 4: Rewrite `app/auth.py` dependencies to use our own JWTs

**Files:**
- Modify: `backend/app/auth.py`
- Modify: `backend/app/routers/chat_ws.py:20-27`
- Modify: `backend/tests/test_auth.py`
- Modify: `backend/tests/test_chat_ws.py` (wherever it constructs a fake Clerk token — adjust to use `create_access_token`)

**Interfaces:**
- Consumes: `decode_access_token(token: str) -> uuid.UUID` (Task 3)
- Produces: `get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)) -> User` (signature unchanged from before), `get_optional_user(...) -> User | None` (unchanged), `verify_token(token: str) -> uuid.UUID` (return type changes from `str` clerk_id to `uuid.UUID` user id) — consumed by every router already using these (Tasks unaffected: `me.py`, `plans.py`, `moderation.py`, `stamps.py`, `threads.py` need no changes since they only depend on the `User` object/signature, not on `verify_token`'s internals — only `chat_ws.py` calls `verify_token` directly and must adapt to the new return type)

- [ ] **Step 1: Check `backend/tests/test_chat_ws.py` for how it builds tokens**

Read the file and find how it currently produces a token for the WebSocket test client (likely mocking `verify_token` or constructing a fake Clerk JWT). Note the pattern — Step 5 below adjusts it to use `create_access_token(user.id)` from Task 3 instead.

- [ ] **Step 2: Rewrite `test_auth.py` for the new behavior**

Replace `backend/tests/test_auth.py`:
```python
import uuid
from fastapi import HTTPException
import pytest
from app.auth import get_current_user, get_optional_user
from app.security import create_access_token
from app.models import User


def test_missing_bearer_prefix_raises_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="not-a-bearer-token", db=db_session)
    assert exc.value.status_code == 401


def test_valid_token_resolves_existing_user(db_session):
    user = User(email="a@example.com", name="Dev Kulkarni")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user.id)
    resolved = get_current_user(authorization=f"Bearer {token}", db=db_session)

    assert resolved.id == user.id


def test_unknown_user_id_raises_401(db_session):
    token = create_access_token(uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization=f"Bearer {token}", db=db_session)
    assert exc.value.status_code == 401


def test_invalid_token_raises_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="Bearer not-a-real-jwt", db=db_session)
    assert exc.value.status_code == 401


def test_get_optional_user_returns_none_when_missing(db_session):
    assert get_optional_user(authorization=None, db=db_session) is None


def test_get_optional_user_returns_user_when_valid(db_session):
    user = User(email="b@example.com", name="Priya")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    token = create_access_token(user.id)

    resolved = get_optional_user(authorization=f"Bearer {token}", db=db_session)
    assert resolved is not None
    assert resolved.id == user.id
```

Note: `get_current_user` no longer auto-creates a user on first sight (that behavior existed because Clerk was the source of truth for identity; now our own `/auth/signup` and `/auth/google/callback` are the only places a `User` row gets created). `test_unknown_user_id_raises_401` replaces the old "creates user on first sight" test.

- [ ] **Step 3: Run to verify it fails**

Run: `cd backend && .venv/Scripts/pytest tests/test_auth.py -v`
Expected: FAIL — `app.auth` still imports `PyJWKClient` and looks up by `clerk_id`, which no longer exists on `User`.

- [ ] **Step 4: Rewrite `app/auth.py`**

```python
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
import jwt
import uuid

from .db import get_db
from .models import User
from .security import decode_access_token


def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        user_id = decode_access_token(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")

    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="user not found")
    return user


def get_optional_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User | None:
    """Like get_current_user, but returns None instead of raising when no/invalid credentials are present.
    Used by endpoints that are public but personalize their response for signed-in callers."""
    if not authorization:
        return None
    try:
        return get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None


def verify_token(token: str) -> uuid.UUID:
    """Returns the user id (sub claim) or raises jwt.PyJWTError."""
    return decode_access_token(token)
```

- [ ] **Step 5: Update `chat_ws.py` for the new `verify_token` return type**

Edit `backend/app/routers/chat_ws.py:20-27` — replace:
```python
    try:
        clerk_id = verify_token(token)
    except Exception:
        await websocket.close(code=4401)
        return

    user = db.query(User).filter(User.clerk_id == clerk_id).one_or_none()
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
```
with:
```python
    try:
        user_id = verify_token(token)
    except Exception:
        await websocket.close(code=4401)
        return

    user = db.query(User).filter(User.id == user_id).one_or_none()
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
```

- [ ] **Step 6: Update `test_chat_ws.py`'s token construction**

Using what you found in Step 1, replace whatever built a fake Clerk token with `create_access_token(user.id)` from `app.security`, matching the pattern from Step 2 above.

- [ ] **Step 7: Run the full backend test suite**

Run: `cd backend && .venv/Scripts/pytest -v`
Expected: PASS — including `test_auth.py`, `test_chat_ws.py`, and every other existing test file (they depend on `get_current_user`'s behavior, not its internals, so they should be unaffected — this step is a regression check).

- [ ] **Step 8: Commit**

```bash
git add backend/app/auth.py backend/app/routers/chat_ws.py backend/tests/test_auth.py backend/tests/test_chat_ws.py
git commit -m "feat: verify our own JWTs instead of Clerk's"
```

---

### Task 5: Email sending via Resend

**Files:**
- Create: `backend/app/email.py`
- Create: `backend/tests/test_email.py`

**Interfaces:**
- Consumes: `settings.resend_api_key`, `settings.resend_from_email`, `settings.frontend_origin` (Task 1)
- Produces: `send_verification_email(to_email: str, token: str) -> None`, `send_password_reset_email(to_email: str, token: str) -> None` — consumed by Task 6, 7

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_email.py`:
```python
from unittest.mock import patch, MagicMock
from app.email import send_verification_email, send_password_reset_email


@patch("app.email.httpx.post")
def test_send_verification_email_calls_resend(mock_post):
    mock_post.return_value = MagicMock(status_code=200)

    send_verification_email("user@example.com", "abc123")

    assert mock_post.called
    args, kwargs = mock_post.call_args
    assert args[0] == "https://api.resend.com/emails"
    assert kwargs["json"]["to"] == ["user@example.com"]
    assert "abc123" in kwargs["json"]["html"]
    assert "verify-email" in kwargs["json"]["html"]


@patch("app.email.httpx.post")
def test_send_password_reset_email_calls_resend(mock_post):
    mock_post.return_value = MagicMock(status_code=200)

    send_password_reset_email("user@example.com", "xyz789")

    assert mock_post.called
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["to"] == ["user@example.com"]
    assert "xyz789" in kwargs["json"]["html"]
    assert "reset-password" in kwargs["json"]["html"]
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && .venv/Scripts/pytest tests/test_email.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.email'`

- [ ] **Step 3: Implement `app/email.py`**

```python
import httpx

from .config import settings

RESEND_URL = "https://api.resend.com/emails"


def _send(to_email: str, subject: str, html: str) -> None:
    httpx.post(
        RESEND_URL,
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json={"from": settings.resend_from_email, "to": [to_email], "subject": subject, "html": html},
        timeout=10.0,
    )


def send_verification_email(to_email: str, token: str) -> None:
    link = f"{settings.frontend_origin}/verify-email?token={token}"
    _send(
        to_email,
        "Verify your StayConnected email",
        f'<p>Confirm your email to finish setting up your account.</p>'
        f'<p><a href="{link}">Verify email</a></p>',
    )


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f"{settings.frontend_origin}/reset-password?token={token}"
    _send(
        to_email,
        "Reset your StayConnected password",
        f'<p>Someone requested a password reset for this account. If that was you:</p>'
        f'<p><a href="{link}">Reset password</a></p>'
        f'<p>If you didn\'t request this, you can ignore this email.</p>',
    )
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && .venv/Scripts/pytest tests/test_email.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/email.py backend/tests/test_email.py
git commit -m "feat: add Resend email sending for verification and password reset"
```

---

### Task 6: `POST /auth/signup` and `POST /auth/login`

**Files:**
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_auth_router.py`

**Interfaces:**
- Consumes: `hash_password`, `verify_password`, `create_access_token`, `generate_opaque_token` (Task 3); `send_verification_email` (Task 5); `EmailVerificationToken` model (Task 2)
- Produces: `router` (FastAPI `APIRouter`, mounted at no prefix — paths are `/auth/...`), consumed by Task 7 and 8 which add more routes to the same router, and by Task 9 (main.py wiring, done in this task already)

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_auth_router.py`:
```python
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && .venv/Scripts/pytest tests/test_auth_router.py -v`
Expected: FAIL — `404` on `/auth/signup` (router doesn't exist yet) or `ModuleNotFoundError`.

- [ ] **Step 3: Add request/response schemas**

Add to `backend/app/schemas.py`:
```python
class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=255)
    name: str = Field(min_length=1, max_length=120)

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    user: UserOut
```

- [ ] **Step 4: Implement `app/routers/auth.py` (signup + login only for now)**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User, EmailVerificationToken
from ..schemas import SignupRequest, LoginRequest, TokenOut
from ..security import hash_password, verify_password, create_access_token, generate_opaque_token
from ..email import send_verification_email
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFICATION_TOKEN_LIFETIME = timedelta(hours=24)


@router.post("/signup", response_model=TokenOut, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).one_or_none() is not None:
        raise HTTPException(status_code=409, detail="email already registered")

    user = User(email=body.email, name=body.name, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    verification_token = generate_opaque_token()
    db.add(EmailVerificationToken(
        user_id=user.id, token=verification_token,
        expires_at=datetime.now(timezone.utc) + VERIFICATION_TOKEN_LIFETIME,
    ))
    db.commit()
    send_verification_email(user.email, verification_token)

    return TokenOut(access_token=create_access_token(user.id), user=user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).one_or_none()
    if user is None or user.password_hash is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid email or password")

    return TokenOut(access_token=create_access_token(user.id), user=user)
```

- [ ] **Step 5: Wire the router into `main.py`**

Edit `backend/app/main.py`:
```python
from .routers import plans, threads, stamps, moderation, chat_ws, me, auth
```
and add, alongside the other `include_router` calls:
```python
app.include_router(auth.router)
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd backend && .venv/Scripts/pytest tests/test_auth_router.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/auth.py backend/app/main.py backend/app/schemas.py backend/tests/test_auth_router.py
git commit -m "feat: add signup and login endpoints"
```

---

### Task 7: Email verification and password reset endpoints

**Files:**
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/tests/test_auth_router.py`

**Interfaces:**
- Consumes: everything from Task 6, plus `PasswordResetToken` model (Task 2), `send_password_reset_email` (Task 5)
- Produces: no new interfaces consumed elsewhere — this is the end of the auth-token-flow surface

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_auth_router.py`:
```python
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && .venv/Scripts/pytest tests/test_auth_router.py -v`
Expected: FAIL — `404` on the new endpoints.

- [ ] **Step 3: Add the schemas**

Append to `backend/app/schemas.py`:
```python
class VerifyEmailRequest(BaseModel):
    token: str

class RequestPasswordResetRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=255)

class OkResponse(BaseModel):
    ok: bool = True
```

- [ ] **Step 4: Implement the three endpoints**

Append to `backend/app/routers/auth.py`:
```python
from ..models import PasswordResetToken
from ..schemas import VerifyEmailRequest, RequestPasswordResetRequest, ResetPasswordRequest, OkResponse
from ..email import send_password_reset_email

PASSWORD_RESET_TOKEN_LIFETIME = timedelta(hours=1)


@router.post("/verify-email", response_model=OkResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    record = db.query(EmailVerificationToken).filter(EmailVerificationToken.token == body.token).one_or_none()
    now = datetime.now(timezone.utc)
    if record is None or record.used_at is not None or record.expires_at < now:
        raise HTTPException(status_code=400, detail="invalid or expired token")

    record.used_at = now
    user = db.query(User).filter(User.id == record.user_id).one()
    user.email_verified_at = now
    db.commit()
    return OkResponse()


@router.post("/request-password-reset", response_model=OkResponse)
def request_password_reset(body: RequestPasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).one_or_none()
    if user is not None:
        token = generate_opaque_token()
        db.add(PasswordResetToken(
            user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) + PASSWORD_RESET_TOKEN_LIFETIME,
        ))
        db.commit()
        send_password_reset_email(user.email, token)
    # Always 200, whether or not the email exists — avoids account enumeration.
    return OkResponse()


@router.post("/reset-password", response_model=OkResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token == body.token).one_or_none()
    now = datetime.now(timezone.utc)
    if record is None or record.used_at is not None or record.expires_at < now:
        raise HTTPException(status_code=400, detail="invalid or expired token")

    record.used_at = now
    user = db.query(User).filter(User.id == record.user_id).one()
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return OkResponse()
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && .venv/Scripts/pytest tests/test_auth_router.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/auth.py backend/app/schemas.py backend/tests/test_auth_router.py
git commit -m "feat: add email verification and password reset endpoints"
```

---

### Task 8: Google OAuth

**Files:**
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/tests/test_auth_router.py`

**Interfaces:**
- Consumes: `settings.google_client_id`, `settings.google_client_secret`, `settings.google_redirect_uri` (Task 1); `create_access_token`, `generate_opaque_token` (Task 3)
- Produces: an in-memory one-time-code store (module-level dict, matching the existing in-process pattern already used for WebSocket connections in `chat_ws.py` — acceptable for v1 single-instance deployment, same tradeoff already accepted there)

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_auth_router.py`:
```python
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && .venv/Scripts/pytest tests/test_auth_router.py -v`
Expected: FAIL — `404` on the Google endpoints.

- [ ] **Step 3: Add the schema**

Append to `backend/app/schemas.py`:
```python
class GoogleExchangeRequest(BaseModel):
    code: str
```

- [ ] **Step 4: Implement the Google OAuth endpoints**

Append to `backend/app/routers/auth.py`:
```python
import httpx
from fastapi.responses import RedirectResponse
from ..config import settings
from ..schemas import GoogleExchangeRequest

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# In-process one-time-code -> user_id store. Same single-instance tradeoff
# already accepted for chat_ws.py's connection registry; fine for v1.
_pending_exchanges: dict[str, uuid.UUID] = {}


@router.get("/google")
def google_authorize():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    token_res = httpx.post(GOOGLE_TOKEN_URL, data={
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    })
    google_access_token = token_res.json()["access_token"]

    userinfo_res = httpx.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {google_access_token}"})
    info = userinfo_res.json()
    google_id, email, name = info["sub"], info["email"], info.get("name", "New user")

    user = db.query(User).filter(User.google_id == google_id).one_or_none()
    if user is None:
        user = db.query(User).filter(User.email == email).one_or_none()
        if user is None:
            user = User(email=email, name=name, google_id=google_id)
            db.add(user)
        else:
            user.google_id = google_id
        db.commit()
        db.refresh(user)

    one_time_code = generate_opaque_token()
    _pending_exchanges[one_time_code] = user.id
    return RedirectResponse(f"{settings.frontend_origin}/auth/google/callback?code={one_time_code}")


@router.post("/google/exchange", response_model=TokenOut)
def google_exchange(body: GoogleExchangeRequest, db: Session = Depends(get_db)):
    user_id = _pending_exchanges.pop(body.code, None)
    if user_id is None:
        raise HTTPException(status_code=400, detail="invalid or already-used code")

    user = db.query(User).filter(User.id == user_id).one()
    return TokenOut(access_token=create_access_token(user.id), user=user)
```

Add `import uuid` at the top of `backend/app/routers/auth.py` if not already present from earlier tasks.

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && .venv/Scripts/pytest tests/test_auth_router.py -v`
Expected: PASS

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && .venv/Scripts/pytest -v`
Expected: PASS, all files.

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/auth.py backend/app/schemas.py backend/tests/test_auth_router.py
git commit -m "feat: add direct Google OAuth sign-in"
```

---

## Frontend

### Task 9: Remove Clerk, add cookie-based token helpers

**Files:**
- Modify: `frontend/package.json`
- Delete: `frontend/middleware.ts`
- Create: `frontend/lib/auth.ts`
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/api.ts`
- Create: `frontend/lib/__tests__/auth.test.ts`
- Modify: `frontend/.env.local.example`

**Interfaces:**
- Produces: `getClientToken(): string | null`, `setClientToken(token: string): void`, `clearClientToken(): void` (all read/write the `sc_token` cookie via `document.cookie`, for use in Client Components); `signup(email, password, name): Promise<{access_token: string; user: UserT}>`, `login(email, password): Promise<{access_token: string; user: UserT}>`, `requestPasswordReset(email): Promise<void>`, `resetPassword(token, newPassword): Promise<void>`, `verifyEmail(token): Promise<void>`, `exchangeGoogleCode(code): Promise<{access_token: string; user: UserT}>` — consumed by Tasks 11, 12, 13, 14

- [ ] **Step 1: Remove the Clerk dependency**

Edit `frontend/package.json` — remove the `"@clerk/nextjs": "^7.7.8",` line from `dependencies`.

Run: `cd frontend && npm install`
Expected: lockfile updates, `@clerk/nextjs` removed from `node_modules`.

- [ ] **Step 2: Delete the Clerk middleware**

Delete `frontend/middleware.ts`. The app has no route gating at the Next.js layer in v1 (every page is publicly reachable; per-request auth is enforced by the backend, same as today for e.g. plan creation).

- [ ] **Step 3: Write the failing test for the cookie helpers**

Create `frontend/lib/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getClientToken, setClientToken, clearClientToken } from "@/lib/auth";

describe("client token cookie helpers", () => {
  beforeEach(() => {
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("returns null when no cookie is set", () => {
    expect(getClientToken()).toBeNull();
  });

  it("round-trips a token through set and get", () => {
    setClientToken("abc123");
    expect(getClientToken()).toBe("abc123");
  });

  it("clears the token", () => {
    setClientToken("abc123");
    clearClientToken();
    expect(getClientToken()).toBeNull();
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `cd frontend && npm test -- lib/__tests__/auth.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 5: Implement `lib/auth.ts`**

```typescript
const COOKIE_NAME = "sc_token";
const MAX_AGE_SECONDS = 7 * 24 * 3600;

export function getClientToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setClientToken(token: string): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${secure}`;
}

export function clearClientToken(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export { COOKIE_NAME };
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd frontend && npm test -- lib/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 7: Update `lib/types.ts`**

Replace `UserT`:
```typescript
export type UserT = {
  id: string;
  email: string;
  email_verified_at: string | null;
  name: string;
  headline: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
};
```

- [ ] **Step 8: Add auth API functions to `lib/api.ts`**

Append to `frontend/lib/api.ts`:
```typescript
export async function signup(
  email: string, password: string, name: string,
): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Signup failed");
  return res.json();
}

export async function login(
  email: string, password: string,
): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Login failed");
  return res.json();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Could not request password reset");
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not reset password");
}

export async function verifyEmail(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not verify email");
}

export async function exchangeGoogleCode(
  code: string,
): Promise<{ access_token: string; user: UserT }> {
  const res = await fetch(`${API_BASE}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? "Could not sign in with Google");
  return res.json();
}
```

- [ ] **Step 9: Update the frontend env template**

Replace `frontend/.env.local.example`:
```
# Copy to frontend/.env.local and fill in. Never commit the real .env.local.

# Base URL of the FastAPI backend.
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/auth.ts frontend/lib/types.ts frontend/lib/api.ts frontend/lib/__tests__/auth.test.ts frontend/.env.local.example
git rm frontend/middleware.ts
git commit -m "feat: add cookie-based token helpers and auth API client, remove Clerk"
```

---

### Task 10: Remove `ClerkProvider` from the root layout

**Files:**
- Modify: `frontend/app/layout.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing new (no other file imports from `layout.tsx`)

- [ ] **Step 1: Remove the Clerk import and provider**

Replace `frontend/app/layout.tsx`:
```typescript
import { Space_Grotesk, Source_Sans_3, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-space-grotesk" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-source-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-plex-mono" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${sourceSans.variable} ${plexMono.variable} ${caveat.variable}`}>
      <body className="bg-board font-body text-ink">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new type errors from this file (other files still referencing `@clerk/nextjs` will still error until later tasks — that's expected at this point in the plan).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "feat: remove ClerkProvider from root layout"
```

---

### Task 11: Custom sign-up and sign-in pages

**Files:**
- Modify: `frontend/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `frontend/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `frontend/app/sign-up/__tests__/page.test.tsx`
- Create: `frontend/app/sign-in/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `signup`, `login` (Task 9's `lib/api.ts` additions), `setClientToken` (Task 9's `lib/auth.ts`)
- Produces: nothing new consumed elsewhere

- [ ] **Step 1: Write the failing test for sign-up**

Create `frontend/app/sign-up/__tests__/page.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignUpPage from "../[[...sign-up]]/page";
import * as api from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("SignUpPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("submits email, password, and name, stores the token, and redirects home", async () => {
    vi.spyOn(api, "signup").mockResolvedValue({
      access_token: "tok123",
      user: { id: "u1", email: "a@b.com", email_verified_at: null, name: "A", headline: null, linkedin_url: null, avatar_url: null },
    });

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(document.cookie).toContain("sc_token=tok123");
  });

  it("shows an error message when signup fails", async () => {
    vi.spyOn(api, "signup").mockRejectedValue(new Error("email already registered"));

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npm test -- app/sign-up/__tests__/page.test.tsx`
Expected: FAIL — the page still renders Clerk's `<SignUp />`, no form fields with those labels exist.

- [ ] **Step 3: Implement the sign-up page**

Replace `frontend/app/sign-up/[[...sign-up]]/page.tsx`:
```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/lib/api";
import { setClientToken } from "@/lib/auth";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not create account";
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { access_token } = await signup(email, password, name);
      setClientToken(access_token);
      router.push("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-board p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card bg-card p-6">
        <h1 className="font-display text-xl font-bold text-ink">Post your first plan</h1>
        <p className="mt-1 font-body text-xs text-ink2">Free, takes 30 seconds</p>

        <label className="mt-4 block font-mono text-[9px] uppercase text-ink2" htmlFor="name">Name</label>
        <input
          id="name" value={name} onChange={(e) => setName(e.target.value)} required
          className="mt-1 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
        />

        <label className="mt-3 block font-mono text-[9px] uppercase text-ink2" htmlFor="email">Email</label>
        <input
          id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="mt-1 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
        />

        <label className="mt-3 block font-mono text-[9px] uppercase text-ink2" htmlFor="password">Password</label>
        <input
          id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
          className="mt-1 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
        />

        {error && <p className="mt-2 font-mono text-[10px] text-accent">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="mt-4 w-full rounded-full bg-ink py-3 font-display font-semibold text-card"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <a href={`${process.env.NEXT_PUBLIC_API_BASE}/auth/google`} className="mt-3 block w-full rounded-full border border-rule py-2.5 text-center font-display text-sm font-semibold text-ink">
          Continue with Google
        </a>

        <p className="mt-4 text-center font-body text-xs text-ink2">
          Already have an account? <Link href="/sign-in" className="font-semibold text-accent">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run to verify sign-up passes**

Run: `cd frontend && npm test -- app/sign-up/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the failing test for sign-in**

Create `frontend/app/sign-in/__tests__/page.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignInPage from "../[[...sign-in]]/page";
import * as api from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("SignInPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    document.cookie = "sc_token=; path=/; max-age=0";
  });

  it("submits email and password, stores the token, and redirects home", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      access_token: "tok456",
      user: { id: "u1", email: "a@b.com", email_verified_at: null, name: "A", headline: null, linkedin_url: null, avatar_url: null },
    });

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(document.cookie).toContain("sc_token=tok456");
  });

  it("shows an error message on invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("invalid email or password"));

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `cd frontend && npm test -- app/sign-in/__tests__/page.test.tsx`
Expected: FAIL — page still renders Clerk's `<SignIn />`.

- [ ] **Step 7: Implement the sign-in page**

Replace `frontend/app/sign-in/[[...sign-in]]/page.tsx`:
```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { setClientToken } from "@/lib/auth";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not sign in";
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { access_token } = await login(email, password);
      setClientToken(access_token);
      router.push("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-board p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card bg-card p-6">
        <h1 className="font-display text-xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 font-body text-xs text-ink2">Sign in to see what&apos;s live nearby</p>

        <label className="mt-4 block font-mono text-[9px] uppercase text-ink2" htmlFor="email">Email</label>
        <input
          id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="mt-1 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
        />

        <label className="mt-3 block font-mono text-[9px] uppercase text-ink2" htmlFor="password">Password</label>
        <input
          id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          className="mt-1 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
        />

        {error && <p className="mt-2 font-mono text-[10px] text-accent">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="mt-4 w-full rounded-full bg-ink py-3 font-display font-semibold text-card"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <a href={`${process.env.NEXT_PUBLIC_API_BASE}/auth/google`} className="mt-3 block w-full rounded-full border border-rule py-2.5 text-center font-display text-sm font-semibold text-ink">
          Continue with Google
        </a>

        <p className="mt-4 text-center font-body text-xs text-ink2">
          <Link href="/forgot-password" className="font-semibold text-accent">Forgot password?</Link>
        </p>
      </form>
    </main>
  );
}
```

- [ ] **Step 8: Run to verify sign-in passes**

Run: `cd frontend && npm test -- app/sign-in/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/app/sign-up frontend/app/sign-in
git commit -m "feat: replace Clerk sign-up/sign-in with custom-styled forms"
```

---

### Task 12: Verify-email, forgot-password, reset-password, and Google callback pages

**Files:**
- Create: `frontend/app/verify-email/page.tsx`
- Create: `frontend/app/forgot-password/page.tsx`
- Create: `frontend/app/reset-password/page.tsx`
- Create: `frontend/app/auth/google/callback/page.tsx`
- Create: `frontend/app/verify-email/__tests__/page.test.tsx`
- Create: `frontend/app/reset-password/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `verifyEmail`, `resetPassword`, `requestPasswordReset`, `exchangeGoogleCode` (Task 9), `setClientToken` (Task 9)
- Produces: nothing new consumed elsewhere

- [ ] **Step 1: Write the failing test for verify-email**

Create `frontend/app/verify-email/__tests__/page.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifyEmailPage from "../page";
import * as api from "@/lib/api";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=abc123"),
}));

describe("VerifyEmailPage", () => {
  it("calls verifyEmail with the token from the query string and shows success", async () => {
    const spy = vi.spyOn(api, "verifyEmail").mockResolvedValue(undefined);
    render(<VerifyEmailPage />);
    expect(await screen.findByText(/verified/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith("abc123");
  });

  it("shows an error if verification fails", async () => {
    vi.spyOn(api, "verifyEmail").mockRejectedValue(new Error("invalid or expired token"));
    render(<VerifyEmailPage />);
    expect(await screen.findByText(/invalid or expired token/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npm test -- app/verify-email/__tests__/page.test.tsx`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: Implement `app/verify-email/page.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/lib/api";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not verify email";
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setError("Missing verification token");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(errorMessage(err));
      });
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-board p-6">
      <div className="w-full max-w-sm rounded-card bg-card p-6 text-center">
        {status === "pending" && <p className="font-body text-sm text-ink">Verifying...</p>}
        {status === "success" && (
          <>
            <p className="font-display text-lg font-bold text-ink">Email verified</p>
            <Link href="/" className="mt-3 inline-block font-mono text-xs text-accent">Back to the board</Link>
          </>
        )}
        {status === "error" && <p className="font-mono text-xs text-accent">{error}</p>}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd frontend && npm test -- app/verify-email/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Implement `app/forgot-password/page.tsx`** (no test — thin form wrapper, same shape already covered by sign-in/sign-up tests in Task 11)

```typescript
"use client";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await requestPasswordReset(email);
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-board p-6">
      <div className="w-full max-w-sm rounded-card bg-card p-6">
        {submitted ? (
          <p className="font-body text-sm text-ink">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="font-display text-lg font-bold text-ink">Reset your password</h1>
            <label className="mt-4 block font-mono text-[9px] uppercase text-ink2" htmlFor="email">Email</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
            />
            <button
              type="submit" disabled={submitting}
              className="mt-4 w-full rounded-full bg-ink py-3 font-display font-semibold text-card"
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Write the failing test for reset-password**

Create `frontend/app/reset-password/__tests__/page.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "../page";
import * as api from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams("token=reset-tok"),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => pushMock.mockClear());

  it("submits the new password with the token from the query string", async () => {
    const spy = vi.spyOn(api, "resetPassword").mockResolvedValue(undefined);
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpassword2" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("reset-tok", "newpassword2"));
    expect(await screen.findByText(/sign in/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `cd frontend && npm test -- app/reset-password/__tests__/page.test.tsx`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 8: Implement `app/reset-password/page.tsx`**

```typescript
"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const token = searchParams.get("token") ?? "";
    await resetPassword(token, password);
    setSubmitting(false);
    setDone(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-board p-6">
      <div className="w-full max-w-sm rounded-card bg-card p-6">
        {done ? (
          <>
            <p className="font-body text-sm text-ink">Password updated.</p>
            <Link href="/sign-in" className="mt-3 inline-block font-mono text-xs text-accent">Sign in</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="font-display text-lg font-bold text-ink">Set a new password</h1>
            <label className="mt-4 block font-mono text-[9px] uppercase text-ink2" htmlFor="password">New password</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              className="mt-1 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
            />
            <button
              type="submit" disabled={submitting}
              className="mt-4 w-full rounded-full bg-ink py-3 font-display font-semibold text-card"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `cd frontend && npm test -- app/reset-password/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 10: Implement the Google OAuth callback landing page** (no separate test — thin glue covered end-to-end by the backend's Google tests in Task 8; this page's only job is to call one already-tested API function and redirect)

```typescript
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeGoogleCode } from "@/lib/api";
import { setClientToken } from "@/lib/auth";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing code from Google");
      return;
    }
    exchangeGoogleCode(code)
      .then(({ access_token }) => {
        setClientToken(access_token);
        router.push("/");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not sign in with Google"));
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-board p-6">
      <div className="w-full max-w-sm rounded-card bg-card p-6 text-center">
        <p className="font-body text-sm text-ink">{error ?? "Signing you in..."}</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add frontend/app/verify-email frontend/app/forgot-password frontend/app/reset-password frontend/app/auth
git commit -m "feat: add verify-email, forgot/reset-password, and Google callback pages"
```

---

### Task 13: Update existing pages to read the cookie instead of Clerk

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/plans/[id]/page.tsx`
- Modify: `frontend/app/chats/[threadId]/page.tsx`
- Modify: `frontend/app/post/page.tsx`
- Create: `frontend/components/UserMenu.tsx`

**Interfaces:**
- Consumes: `getClientToken`, `clearClientToken` (Task 9's `lib/auth.ts`)
- Produces: nothing new consumed elsewhere — this is the final wiring task

- [ ] **Step 1: Update `app/page.tsx`**

Replace the Clerk-dependent parts of `frontend/app/page.tsx`:
```typescript
import Link from "next/link";
import { cookies } from "next/headers";
import { fetchNearbyPlans } from "@/lib/api";
import PlanFeed from "@/components/PlanFeed";
import UserMenu from "@/components/UserMenu";

export default async function Page() {
  const token = (await cookies()).get("sc_token")?.value;
  // Discovery is public — anyone can see what's around, signed in or not.
  // Mountain View, CA — replace with browser geolocation in a follow-up task
  const plans = await fetchNearbyPlans(37.3861, -122.0839, 5000, new Date().toISOString(), token);

  return (
    <main>
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <span className="font-display text-sm font-bold text-card">StayConnected</span>
          <p className="font-mono text-[11px] text-rule">
            Networking runs on luck. This is the app for when it isn&apos;t.
          </p>
        </div>
        {token ? (
          <UserMenu />
        ) : (
          <div className="flex gap-3">
            <Link href="/sign-in" className="font-mono text-xs text-rule">Sign in</Link>
            <Link href="/sign-up" className="font-mono text-xs font-bold text-accent">Sign up</Link>
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between p-4">
        <div>
          <h1 className="font-hand text-2xl text-card">Today</h1>
          <p className="font-mono text-xs text-rule">{plans.length} plans pinned near you</p>
        </div>
        <Link href="/post" className="font-mono text-xs text-accent">
          + Post a plan
        </Link>
      </div>
      <PlanFeed plans={plans} />
    </main>
  );
}
```

- [ ] **Step 2: Create `components/UserMenu.tsx`** (replaces Clerk's `<UserButton />`)

```typescript
"use client";
import { useRouter } from "next/navigation";
import { clearClientToken } from "@/lib/auth";

export default function UserMenu() {
  const router = useRouter();

  function handleSignOut() {
    clearClientToken();
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="font-mono text-xs text-rule">
      Sign out
    </button>
  );
}
```

- [ ] **Step 3: Update `app/plans/[id]/page.tsx`**

Replace the Clerk-dependent parts:
```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchPlan, startThread } from "@/lib/api";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get("sc_token")?.value ?? "";
  const plan = await fetchPlan(id, token);

  const now = Date.now();
  const isLive = new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();

  async function messagePoster() {
    "use server";
    const t = (await cookies()).get("sc_token")?.value ?? "";
    const thread = await startThread(plan.user_id, t);
    redirect(`/chats/${thread.id}`);
  }

  return (
    <main className="flex justify-center p-6">
      <div className="relative w-full max-w-sm rotate-[-0.8deg] rounded-card bg-card p-5 shadow-[3px_6px_14px_rgba(0,0,0,0.32)]">
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-accent" />
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink2">Plan</p>
        <h1 className="font-display text-xl font-bold text-ink">{plan.text}</h1>
        <div className="my-3 flex justify-between border-y border-dashed border-rule py-3">
          <div>
            <p className="font-mono text-[9.5px] uppercase text-ink2">Status</p>
            <p className="font-mono text-xs font-bold text-accent">{isLive ? "LIVE NOW" : "ENDED"}</p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] uppercase text-ink2">Until</p>
            <p className="font-mono text-lg font-bold text-accent">
              {new Date(plan.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <form action={messagePoster}>
          <button type="submit" className="mt-2 w-full rounded-full bg-ink py-3 font-display font-semibold text-card">
            Message
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Update `app/chats/[threadId]/page.tsx`**

Replace the Clerk-dependent parts:
```typescript
import { cookies } from "next/headers";
import { fetchMe, fetchMessages } from "@/lib/api";
import ChatThread from "@/components/ChatThread";

export default async function ChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const token = (await cookies()).get("sc_token")?.value ?? "";
  // `me.id` is the backend UUID that messages' sender_id references.
  const [me, messages] = await Promise.all([fetchMe(token), fetchMessages(threadId, token)]);

  return (
    <ChatThread threadId={threadId} initialMessages={messages} currentUserId={me.id} token={token} />
  );
}
```

- [ ] **Step 5: Update `app/post/page.tsx`**

Replace the Clerk import and token retrieval:
```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
```
and inside `handleSubmit`, replace:
```typescript
      const token = (await getToken()) ?? "";
```
with:
```typescript
      const token = getClientToken() ?? "";
```
and remove the now-unused `const { getToken } = useAuth();` line at the top of the component.

- [ ] **Step 6: Run the frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — all existing and new test files (`PlanCard.test.tsx`, `PlanFeed.test.tsx`, and everything added in Tasks 9, 11, 12).

- [ ] **Step 7: Run the TypeScript build check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors — confirms no remaining `@clerk/nextjs` imports anywhere.

Run: `cd frontend && grep -r "@clerk" app lib components` (or equivalent search) to double check no stray references remain.
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/page.tsx frontend/app/plans frontend/app/chats frontend/app/post frontend/components/UserMenu.tsx
git commit -m "feat: wire existing pages to cookie-based auth instead of Clerk"
```

---

### Task 14: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && .venv/Scripts/pytest -v`
Expected: PASS, all files, no skips.

- [ ] **Step 2: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS, all files.

- [ ] **Step 3: Run the frontend build**

Run: `cd frontend && npm run build`
Expected: succeeds — confirms no leftover Clerk references break the production build (dev mode can be more forgiving than build mode about missing modules).

- [ ] **Step 4: Manual smoke test**

With the backend running (`cd backend && .venv/Scripts/uvicorn app.main:app --reload`) and frontend running (`cd frontend && npm run dev`):
1. Visit `/sign-up`, create an account, confirm redirect to `/` and that the header shows "Sign out" instead of "Sign in / Sign up"
2. Post a plan, confirm it appears on the board
3. Sign out, sign back in via `/sign-in` with the same credentials
4. Visit `/forgot-password`, request a reset (check the backend logs or Resend dashboard for the email, since a real inbox may not be configured locally)

Report any failures found — do not fix silently, since a failure here means an earlier task's code doesn't match how the app actually runs end-to-end, and the task list may need a follow-up fix task.

- [ ] **Step 5: Update `README.md` if it documents Clerk setup**

Search `README.md` for "Clerk" and replace any setup instructions with the new `JWT_SECRET`/`RESEND_API_KEY`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env vars from Task 1.

- [ ] **Step 6: Commit if README changed**

```bash
git add README.md
git commit -m "docs: update setup instructions for custom auth"
```
