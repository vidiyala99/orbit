# Presence & Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the presence/plans layer — post a time-boxed plan pinned to a location, discover nearby plans, message the poster, and mutually confirm an in-person "stamp" once you've met.

**Architecture:** Next.js (App Router, TS) frontend talking to a separate FastAPI backend over REST + WebSocket. Postgres/PostGIS (via a local docker-compose service for dev/test, Neon in production) stores users, plans, threads, messages, stamps, reports, and blocks. Clerk issues auth tokens; the backend verifies them via JWKS and never talks to a Clerk SDK directly.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, GeoAlchemy2, Alembic, PyJWT, pytest — Next.js 14+ (App Router), TypeScript, Tailwind CSS, Clerk (`@clerk/nextjs`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-presence-plans-design.md`

## Global Constraints

- Location precision is fixed to neighborhood/venue-level for every plan — never store or display exact GPS coordinates in any UI (spec: "Discovery flow" / "Out of scope").
- A stamp requires **both** sides of a thread to confirm before it's created — never a one-sided action (spec: "Data model").
- No admin dashboard, no structured ride-share plan type, no native mobile app in this plan (spec: "Out of scope (v1)").
- Visual system: cork ground `#5B4A32`, card surface `#FBF3E3`, ink `#2A2216`, accent `#B8461A`, stamp `#3F7A4C`; fonts Space Grotesk (display), Source Sans 3 (text), IBM Plex Mono (utility, tabular-nums), Caveat (sparing handwritten accents); 2px card radius, real drop shadow + −1.5°..+1.5° rotation per card, no other elevation method (spec: "Visual design system").

---

## File Structure

```
docker-compose.yml                      # local Postgres+PostGIS for dev/test

backend/
  requirements.txt
  alembic.ini
  alembic/env.py
  alembic/versions/0001_initial.py
  app/
    __init__.py
    main.py                             # FastAPI app, router registration
    config.py                           # pydantic-settings
    db.py                               # engine, Session, get_db, Base
    models.py                           # User, Plan, Thread, Message, Stamp, Report, Block
    schemas.py                          # Pydantic request/response models
    auth.py                             # get_current_user (Clerk JWT verification)
    filters.py                          # word-list content filter
    routers/
      plans.py                          # POST/GET /plans
      threads.py                        # POST /threads, GET /threads/{id}/messages
      stamps.py                         # POST /threads/{id}/stamp
      moderation.py                     # POST /reports, POST /blocks
      chat_ws.py                        # WS /ws/threads/{id}
  tests/
    conftest.py                         # db + client fixtures
    test_health.py
    test_models.py
    test_auth.py
    test_plans.py
    test_threads_and_stamps.py
    test_moderation.py
    test_chat_ws.py

frontend/
  package.json, tsconfig.json, tailwind.config.ts, next.config.js
  middleware.ts                         # clerkMiddleware
  app/
    layout.tsx                          # ClerkProvider, fonts, tokens.css
    globals.css                         # design tokens (colors, fonts, radius)
    page.tsx                            # discovery feed (Today)
    post/page.tsx                       # plan composer
    plans/[id]/page.tsx                 # plan detail (pinned card, Message CTA)
    chats/[threadId]/page.tsx           # chat + stamp confirmation
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
  components/
    PlanCard.tsx                        # the pinned index-card component
    PlanFeed.tsx                        # list of PlanCard, day-divider grouping
    ChatThread.tsx                      # message bubbles + StampButton
    StampButton.tsx
  lib/
    api.ts                              # fetch wrapper, attaches Clerk token
    types.ts                            # Plan, Thread, Message, Stamp TS types
  components/__tests__/
    PlanCard.test.tsx
    PlanFeed.test.tsx
```

---

### Task 1: Backend scaffold, local Postgres/PostGIS, health check

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`
- Test: `backend/tests/test_health.py`

**Interfaces:**
- Produces: `app.main:app` (FastAPI instance), `app.config.settings` (`Settings` with `.database_url: str`, `.clerk_jwks_url: str`)

- [ ] **Step 1: Write docker-compose service**

```yaml
# docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: stayconnected
      POSTGRES_USER: stayconnected
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- [ ] **Step 2: Start it and confirm it's healthy**

Run: `docker compose up -d db && docker compose exec db pg_isready -U stayconnected`
Expected: `accepting connections`

- [ ] **Step 3: Write requirements**

```
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
geoalchemy2==0.15.2
psycopg[binary]==3.2.2
alembic==1.13.2
pydantic-settings==2.5.2
pyjwt[crypto]==2.9.0
httpx==0.27.2
pytest==8.3.3
pytest-asyncio==0.24.0
websockets==13.1
```

Run: `cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt` (Windows; use `.venv/bin/pip` on macOS/Linux)

- [ ] **Step 4: Write the failing test**

```python
# backend/tests/test_health.py
from fastapi.testclient import TestClient
from app.main import app

def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'` (or similar import error)

- [ ] **Step 6: Write config and app**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://stayconnected:localdev@localhost:5432/stayconnected"
    clerk_jwks_url: str = "https://example.clerk.accounts.dev/.well-known/jwks.json"

    class Config:
        env_file = ".env"

settings = Settings()
```

```python
# backend/app/main.py
from fastapi import FastAPI
from .routers import plans, threads, stamps, moderation, chat_ws

app = FastAPI(title="StayConnected API")

app.include_router(plans.router)
app.include_router(threads.router)
app.include_router(stamps.router)
app.include_router(moderation.router)
app.include_router(chat_ws.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

Note: `main.py` imports the routers created in later tasks. Create empty placeholder routers now so the app can import — each later task fills one in:

```python
# backend/app/routers/__init__.py
```

```python
# backend/app/routers/plans.py (placeholder — filled in Task 4)
from fastapi import APIRouter
router = APIRouter(prefix="/plans", tags=["plans"])
```

```python
# backend/app/routers/threads.py (placeholder — filled in Task 5)
from fastapi import APIRouter
router = APIRouter(prefix="/threads", tags=["threads"])
```

```python
# backend/app/routers/stamps.py (placeholder — filled in Task 6)
from fastapi import APIRouter
router = APIRouter(tags=["stamps"])
```

```python
# backend/app/routers/moderation.py (placeholder — filled in Task 7)
from fastapi import APIRouter
router = APIRouter(tags=["moderation"])
```

```python
# backend/app/routers/chat_ws.py (placeholder — filled in Task 8)
from fastapi import APIRouter
router = APIRouter(tags=["chat"])
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml backend/
git commit -m "feat(backend): scaffold FastAPI app with health check"
```

---

### Task 2: DB models and initial migration

**Files:**
- Create: `backend/app/db.py`
- Create: `backend/app/models.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial.py`
- Create: `backend/tests/conftest.py`
- Test: `backend/tests/test_models.py`

**Interfaces:**
- Consumes: `app.config.settings.database_url` (Task 1)
- Produces: `app.db.Base`, `app.db.get_db` (FastAPI dependency yielding `Session`), `app.db.SessionLocal`; ORM classes `User`, `Plan`, `Thread`, `Message`, `Stamp`, `Report`, `Block` in `app.models`, each with `id: uuid.UUID` primary key

- [ ] **Step 1: Write db.py**

```python
# backend/app/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Write models.py**

```python
# backend/app/models.py
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text, UniqueConstraint, Float
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from .db import Base

def _uuid() -> uuid.UUID:
    return uuid.uuid4()

def _now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    clerk_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    headline: Mapped[str | None] = mapped_column(String(160), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    location: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class Thread(Base):
    __tablename__ = "threads"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    user_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    __table_args__ = (UniqueConstraint("user_a_id", "user_b_id", name="uq_thread_pair"),)

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("threads.id"))
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class Stamp(Base):
    __tablename__ = "stamps"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("threads.id"), unique=True)
    user_a_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    user_b_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class Report(Base):
    __tablename__ = "reports"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    reporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    target_type: Mapped[str] = mapped_column(String(20))
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class Block(Base):
    __tablename__ = "blocks"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    blocker_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    blocked_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id", name="uq_block_pair"),)
```

- [ ] **Step 3: Set up Alembic**

Run: `cd backend && alembic init alembic`

Edit `backend/alembic/env.py` — replace the `target_metadata = None` line and add imports at the top:

```python
# backend/alembic/env.py (edits)
from app.db import Base
from app.config import settings
from app import models  # noqa: F401 — registers all tables on Base.metadata

config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata
```

- [ ] **Step 4: Enable PostGIS and generate the migration**

Run: `docker compose exec db psql -U stayconnected -d stayconnected -c "CREATE EXTENSION IF NOT EXISTS postgis;"`
Run: `cd backend && alembic revision --autogenerate -m "initial schema"`

This creates `backend/alembic/versions/0001_initial.py` (or similarly-named) — inspect it to confirm it creates all 7 tables, then apply it:

Run: `alembic upgrade head`
Expected: no errors; `\dt` in psql shows `users, plans, threads, messages, stamps, reports, blocks`

- [ ] **Step 5: Write shared test fixtures**

```python
# backend/tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.config import settings

TEST_DATABASE_URL = settings.database_url.replace("/stayconnected", "/stayconnected_test")

@pytest.fixture(scope="session", autouse=True)
def _create_test_db():
    admin_engine = create_engine(settings.database_url.rsplit("/", 1)[0] + "/stayconnected", isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.exec_driver_sql("SELECT 1")  # verify connectivity early with a clear error
    yield

@pytest.fixture()
def db_session():
    engine = create_engine(TEST_DATABASE_URL)
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS postgis")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()
    Base.metadata.drop_all(engine)
```

Run once before tests: `docker compose exec db psql -U stayconnected -d stayconnected -c "CREATE DATABASE stayconnected_test;"`

- [ ] **Step 6: Write the failing test**

```python
# backend/tests/test_models.py
from datetime import datetime, timedelta, timezone
from app.models import User, Plan

def test_create_user_and_plan(db_session):
    user = User(clerk_id="user_abc123", name="Priya Shah")
    db_session.add(user)
    db_session.commit()

    now = datetime.now(timezone.utc)
    plan = Plan(
        user_id=user.id,
        text="Coffee near University Ave",
        lat=37.4419,
        lon=-122.1430,
        location="SRID=4326;POINT(-122.1430 37.4419)",
        starts_at=now,
        ends_at=now + timedelta(hours=2),
    )
    db_session.add(plan)
    db_session.commit()

    fetched = db_session.query(Plan).filter_by(id=plan.id).one()
    assert fetched.text == "Coffee near University Ave"
    assert fetched.user_id == user.id
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd backend && pytest tests/test_models.py -v`
Expected: FAIL if `stayconnected_test` DB doesn't exist yet (`OperationalError`) — create it per Step 5's note, then re-run; should then reach a real assertion, not an import error, confirming scaffolding is wired correctly. If everything is already in place it may PASS immediately — in that case skip to Step 8.

- [ ] **Step 8: Run test to verify it passes**

Run: `cd backend && pytest tests/test_models.py -v`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/app/db.py backend/app/models.py backend/alembic.ini backend/alembic/ backend/tests/conftest.py backend/tests/test_models.py
git commit -m "feat(backend): add DB models and initial migration"
```

---

### Task 3: Clerk JWT authentication

**Files:**
- Create: `backend/app/auth.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `app.models.User` (Task 2), `app.db.get_db` (Task 2), `app.config.settings.clerk_jwks_url` (Task 1)
- Produces: `app.auth.get_current_user(authorization: str, db: Session) -> User` as a FastAPI dependency; raises `HTTPException(401)` on missing/invalid token. First successful verification for an unseen `clerk_id` creates the `User` row.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_auth.py
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
import pytest
from app.auth import get_current_user

def test_missing_bearer_prefix_raises_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="not-a-bearer-token", db=db_session)
    assert exc.value.status_code == 401

@patch("app.auth._jwk_client")
@patch("app.auth.jwt.decode")
def test_valid_token_creates_user_on_first_sight(mock_decode, mock_jwk_client, db_session):
    mock_jwk_client.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")
    mock_decode.return_value = {"sub": "user_new_123", "name": "Dev Kulkarni"}

    user = get_current_user(authorization="Bearer faketoken", db=db_session)

    assert user.clerk_id == "user_new_123"
    assert user.name == "Dev Kulkarni"

    # second call with the same clerk_id must return the same row, not create another
    user_again = get_current_user(authorization="Bearer faketoken", db=db_session)
    assert user_again.id == user.id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.auth'`

- [ ] **Step 3: Implement auth.py**

```python
# backend/app/auth.py
import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .db import get_db
from .models import User
from .config import settings

_jwk_client = PyJWKClient(settings.clerk_jwks_url)

def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        signing_key = _jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")

    clerk_id = payload["sub"]
    user = db.query(User).filter(User.clerk_id == clerk_id).one_or_none()
    if user is None:
        user = User(clerk_id=clerk_id, name=payload.get("name") or "New user")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/auth.py backend/tests/test_auth.py
git commit -m "feat(backend): verify Clerk JWTs and auto-provision users"
```

---

### Task 4: Plans API — create and discover

**Files:**
- Modify: `backend/app/routers/plans.py`
- Create: `backend/app/schemas.py`
- Test: `backend/tests/test_plans.py`

**Interfaces:**
- Consumes: `get_current_user` (Task 3), `get_db` (Task 2), `Plan`/`User` models (Task 2)
- Produces: `POST /plans` (auth required, body `PlanCreate`, returns `PlanOut`, 201); `GET /plans?lat&lon&radius_m&at` (auth required, returns `list[PlanOut]` of plans active at `at` within `radius_m` meters of `(lat, lon)`, nearest first)

- [ ] **Step 1: Write schemas**

```python
# backend/app/schemas.py
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class PlanCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    lat: float
    lon: float
    starts_at: datetime
    ends_at: datetime

class PlanOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    text: str
    lat: float
    lon: float
    starts_at: datetime
    ends_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 2: Write the failing tests**

```python
# backend/tests/test_plans.py
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_current_user
from app.models import User

def _override_user(db_session, name="Priya Shah"):
    user = User(clerk_id=f"user_{name.replace(' ', '_')}", name=name)
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user
    return user

def test_create_and_discover_nearby_plan(db_session):
    from app.db import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    user = _override_user(db_session)
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    create_resp = client.post("/plans", json={
        "text": "Coffee near University Ave",
        "lat": 37.4419,
        "lon": -122.1430,
        "starts_at": now.isoformat(),
        "ends_at": (now + timedelta(hours=2)).isoformat(),
    })
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["text"] == "Coffee near University Ave"
    assert created["user_id"] == str(user.id)

    # 500m away in Palo Alto, within a 2km radius search
    list_resp = client.get("/plans", params={
        "lat": 37.4443, "lon": -122.1598, "radius_m": 2000,
        "at": now.isoformat(),
    })
    assert list_resp.status_code == 200
    ids = [p["id"] for p in list_resp.json()]
    assert created["id"] in ids

    app.dependency_overrides.clear()

def test_discover_excludes_plans_outside_radius(db_session):
    from app.db import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session)
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    client.post("/plans", json={
        "text": "Meetup in SF",
        "lat": 37.7749, "lon": -122.4194,
        "starts_at": now.isoformat(),
        "ends_at": (now + timedelta(hours=2)).isoformat(),
    })

    # Mountain View, ~50km from SF — outside a 5km radius
    list_resp = client.get("/plans", params={
        "lat": 37.3861, "lon": -122.0839, "radius_m": 5000,
        "at": now.isoformat(),
    })
    assert list_resp.json() == []

    app.dependency_overrides.clear()
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_plans.py -v`
Expected: FAIL — `404 Not Found` (router has no routes yet)

- [ ] **Step 4: Implement the router**

```python
# backend/app/routers/plans.py
from fastapi import APIRouter, Depends
from datetime import datetime
from geoalchemy2.functions import ST_DWithin
from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Plan, User
from ..schemas import PlanCreate, PlanOut

router = APIRouter(prefix="/plans", tags=["plans"])

@router.post("", response_model=PlanOut, status_code=201)
def create_plan(body: PlanCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plan = Plan(
        user_id=user.id,
        text=body.text,
        lat=body.lat,
        lon=body.lon,
        location=f"SRID=4326;POINT({body.lon} {body.lat})",
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.get("", response_model=list[PlanOut])
def discover_plans(
    lat: float, lon: float, radius_m: int, at: datetime,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    point = WKTElement(f"POINT({lon} {lat})", srid=4326)
    plans = (
        db.query(Plan)
        .filter(ST_DWithin(Plan.location, point, radius_m))
        .filter(Plan.starts_at <= at, Plan.ends_at >= at)
        .all()
    )
    return plans
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_plans.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/plans.py backend/app/schemas.py backend/tests/test_plans.py
git commit -m "feat(backend): add plan creation and radius-based discovery"
```

---

### Task 5: Threads API — start or resume a DM

**Files:**
- Modify: `backend/app/routers/threads.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_threads_and_stamps.py`

**Interfaces:**
- Consumes: `get_current_user`, `get_db`, `Thread`/`Message`/`User` models
- Produces: `POST /threads {other_user_id}` (auth required, returns `ThreadOut {id, user_a_id, user_b_id}`, idempotent — returns the existing thread for that pair if one exists); `GET /threads/{thread_id}/messages` (auth required, 403 if caller isn't a participant, returns `list[MessageOut]` oldest-first)

- [ ] **Step 1: Add schemas**

```python
# backend/app/schemas.py (append)
class ThreadCreate(BaseModel):
    other_user_id: uuid.UUID

class ThreadOut(BaseModel):
    id: uuid.UUID
    user_a_id: uuid.UUID
    user_b_id: uuid.UUID

    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    id: uuid.UUID
    thread_id: uuid.UUID
    sender_id: uuid.UUID
    body: str
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_threads_and_stamps.py
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
    second = client.post("/threads", json={"other_user_id": str(dev.id)})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pytest tests/test_threads_and_stamps.py -v`
Expected: FAIL — 404 (no routes registered yet)

- [ ] **Step 4: Implement the router**

```python
# backend/app/routers/threads.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Thread, Message, User
from ..schemas import ThreadCreate, ThreadOut, MessageOut

router = APIRouter(prefix="/threads", tags=["threads"])

@router.post("", response_model=ThreadOut, status_code=201)
def start_or_resume_thread(body: ThreadCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a, b = sorted([user.id, body.other_user_id], key=str)
    existing = db.query(Thread).filter(Thread.user_a_id == a, Thread.user_b_id == b).one_or_none()
    if existing:
        return existing
    thread = Thread(user_a_id=a, user_b_id=b)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread

@router.get("/{thread_id}/messages", response_model=list[MessageOut])
def list_messages(thread_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
    if thread is None:
        raise HTTPException(status_code=404, detail="thread not found")
    if user.id not in (thread.user_a_id, thread.user_b_id):
        raise HTTPException(status_code=403, detail="not a participant")
    return (
        db.query(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .all()
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_threads_and_stamps.py -v`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/threads.py backend/app/schemas.py backend/tests/test_threads_and_stamps.py
git commit -m "feat(backend): add thread creation and message listing"
```

---

### Task 6: Stamps API — mutual confirmation

**Files:**
- Modify: `backend/app/routers/stamps.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/tests/test_threads_and_stamps.py`

**Interfaces:**
- Consumes: `get_current_user`, `get_db`, `Thread`/`Stamp` models, `Thread` participant check pattern from Task 5
- Produces: `POST /threads/{thread_id}/stamp` (auth required, caller must be a participant) → creates a `Stamp` row on first call from either side, marks that side confirmed; returns `StampOut {confirmed: bool, confirmed_at: datetime | None}`. `confirmed` becomes `true`, and `confirmed_at` is set, only once **both** sides have called this endpoint.

- [ ] **Step 1: Add schema**

```python
# backend/app/schemas.py (append)
class StampOut(BaseModel):
    confirmed: bool
    confirmed_at: datetime | None

    class Config:
        from_attributes = True
```

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_threads_and_stamps.py (append)
def test_stamp_requires_both_sides_to_confirm(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = _login_as(db_session, "priya_stamp")
    dev = User(clerk_id="user_dev_stamp", name="Dev")
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pytest tests/test_threads_and_stamps.py::test_stamp_requires_both_sides_to_confirm -v`
Expected: FAIL — 404 (no route yet)

- [ ] **Step 4: Implement the router**

```python
# backend/app/routers/stamps.py
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Thread, Stamp, User
from ..schemas import StampOut

router = APIRouter(tags=["stamps"])

@router.post("/threads/{thread_id}/stamp", response_model=StampOut)
def confirm_stamp(thread_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
    if thread is None:
        raise HTTPException(status_code=404, detail="thread not found")
    if user.id not in (thread.user_a_id, thread.user_b_id):
        raise HTTPException(status_code=403, detail="not a participant")

    stamp = db.query(Stamp).filter(Stamp.thread_id == thread_id).one_or_none()
    if stamp is None:
        stamp = Stamp(thread_id=thread_id)
        db.add(stamp)

    if user.id == thread.user_a_id:
        stamp.user_a_confirmed = True
    else:
        stamp.user_b_confirmed = True

    if stamp.user_a_confirmed and stamp.user_b_confirmed and stamp.confirmed_at is None:
        stamp.confirmed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(stamp)
    return StampOut(
        confirmed=bool(stamp.user_a_confirmed and stamp.user_b_confirmed),
        confirmed_at=stamp.confirmed_at,
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_threads_and_stamps.py -v`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/stamps.py backend/app/schemas.py backend/tests/test_threads_and_stamps.py
git commit -m "feat(backend): add mutual-confirmation stamp endpoint"
```

---

### Task 7: Moderation — report, block, and a content filter

**Files:**
- Modify: `backend/app/routers/moderation.py`
- Create: `backend/app/filters.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/routers/plans.py`
- Test: `backend/tests/test_moderation.py`

**Interfaces:**
- Consumes: `get_current_user`, `get_db`, `Report`/`Block`/`Plan` models
- Produces: `app.filters.contains_blocked_content(text: str) -> bool`; `POST /reports {target_type, target_id, reason}` → 201; `POST /blocks {blocked_user_id}` → 201; `create_plan` (Task 4) now returns 422 when `body.text` fails the filter

- [ ] **Step 1: Write the failing filter test**

```python
# backend/tests/test_moderation.py
from app.filters import contains_blocked_content

def test_filter_flags_blocked_words():
    assert contains_blocked_content("visit my site for free crypto giveaway") is True

def test_filter_allows_normal_text():
    assert contains_blocked_content("Coffee near University Ave, open to chat") is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_moderation.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.filters'`

- [ ] **Step 3: Implement the filter**

```python
# backend/app/filters.py
import re

BLOCKED_WORDS = [
    "crypto giveaway", "nude", "onlyfans", "wire transfer", "click here to claim",
]

_PATTERN = re.compile("|".join(re.escape(w) for w in BLOCKED_WORDS), re.IGNORECASE)

def contains_blocked_content(text: str) -> bool:
    return bool(_PATTERN.search(text))
```

- [ ] **Step 4: Wire the filter into plan creation — write the failing test first**

```python
# backend/tests/test_moderation.py (append)
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.auth import get_current_user
from app.models import User
from datetime import datetime, timedelta, timezone

def test_plan_with_blocked_content_is_rejected(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    user = User(clerk_id="user_filter_test", name="Test User")
    db_session.add(user); db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    resp = client.post("/plans", json={
        "text": "wire transfer needed, click here to claim your prize",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=1)).isoformat(),
    })
    assert resp.status_code == 422
    app.dependency_overrides.clear()
```

Run: `cd backend && pytest tests/test_moderation.py::test_plan_with_blocked_content_is_rejected -v`
Expected: FAIL — plan is created (201) since the filter isn't wired in yet

Modify `create_plan` in `backend/app/routers/plans.py`:

```python
# backend/app/routers/plans.py (edit create_plan)
from fastapi import HTTPException
from ..filters import contains_blocked_content

@router.post("", response_model=PlanOut, status_code=201)
def create_plan(body: PlanCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if contains_blocked_content(body.text):
        raise HTTPException(status_code=422, detail="plan text not allowed")
    plan = Plan(
        user_id=user.id,
        text=body.text,
        lat=body.lat,
        lon=body.lon,
        location=f"SRID=4326;POINT({body.lon} {body.lat})",
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan
```

Run: `cd backend && pytest tests/test_moderation.py -v`
Expected: PASS

- [ ] **Step 5: Add report/block schemas and the failing tests**

```python
# backend/app/schemas.py (append)
class ReportCreate(BaseModel):
    target_type: str = Field(pattern="^(plan|message|user)$")
    target_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=500)

class BlockCreate(BaseModel):
    blocked_user_id: uuid.UUID
```

```python
# backend/tests/test_moderation.py (append)
def test_report_and_block_endpoints(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    reporter = User(clerk_id="user_reporter", name="Reporter")
    target = User(clerk_id="user_target", name="Target")
    db_session.add_all([reporter, target]); db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: reporter
    client = TestClient(app)

    report_resp = client.post("/reports", json={
        "target_type": "user", "target_id": str(target.id), "reason": "spam",
    })
    assert report_resp.status_code == 201

    block_resp = client.post("/blocks", json={"blocked_user_id": str(target.id)})
    assert block_resp.status_code == 201
    app.dependency_overrides.clear()
```

- [ ] **Step 6: Run to verify it fails, then implement the router**

Run: `cd backend && pytest tests/test_moderation.py::test_report_and_block_endpoints -v`
Expected: FAIL — 404

```python
# backend/app/routers/moderation.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Report, Block, User
from ..schemas import ReportCreate, BlockCreate

router = APIRouter(tags=["moderation"])

@router.post("/reports", status_code=201)
def create_report(body: ReportCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    report = Report(reporter_id=user.id, target_type=body.target_type, target_id=body.target_id, reason=body.reason)
    db.add(report)
    db.commit()
    return {"id": str(report.id)}

@router.post("/blocks", status_code=201)
def create_block(body: BlockCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    block = Block(blocker_id=user.id, blocked_id=body.blocked_user_id)
    db.add(block)
    db.commit()
    return {"id": str(block.id)}
```

- [ ] **Step 7: Run all moderation tests to verify they pass**

Run: `cd backend && pytest tests/test_moderation.py -v`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/app/filters.py backend/app/routers/moderation.py backend/app/routers/plans.py backend/app/schemas.py backend/tests/test_moderation.py
git commit -m "feat(backend): add content filter, report, and block endpoints"
```

---

### Task 8: Chat over WebSocket

**Files:**
- Modify: `backend/app/routers/chat_ws.py`
- Test: `backend/tests/test_chat_ws.py`

**Interfaces:**
- Consumes: `Thread`/`Message`/`User` models, `_jwk_client`-based verification logic from `app.auth` (reused as a plain function, not the HTTP dependency, since WS auth comes via query param not a header)
- Produces: `WS /ws/threads/{thread_id}?token=<clerk_jwt>` — on connect, verifies the token and thread membership (closes with code 4401/4403 on failure); accepts `{"body": str}` text frames, persists a `Message`, and echoes `{"id", "thread_id", "sender_id", "body", "created_at"}` (ISO 8601) to both connected participants

- [ ] **Step 1: Refactor auth.py to expose a reusable token verifier**

```python
# backend/app/auth.py (add, keep get_current_user as-is)
def verify_token(token: str) -> str:
    """Returns the Clerk user id (sub claim) or raises jwt.PyJWTError."""
    signing_key = _jwk_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
    return payload["sub"]
```

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_chat_ws.py
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.models import User, Thread

@patch("app.routers.chat_ws.verify_token")
def test_two_participants_exchange_a_message(mock_verify, db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = User(clerk_id="user_ws_priya", name="Priya")
    dev = User(clerk_id="user_ws_dev", name="Dev")
    db_session.add_all([priya, dev]); db_session.commit()
    a, b = sorted([priya.id, dev.id], key=str)
    thread = Thread(user_a_id=a, user_b_id=b)
    db_session.add(thread); db_session.commit()

    def fake_verify(token):
        return {"priya-token": "user_ws_priya", "dev-token": "user_ws_dev"}[token]
    mock_verify.side_effect = fake_verify

    client = TestClient(app)
    with client.websocket_connect(f"/ws/threads/{thread.id}?token=priya-token") as ws_priya:
        with client.websocket_connect(f"/ws/threads/{thread.id}?token=dev-token") as ws_dev:
            ws_priya.send_json({"body": "still down for that ride?"})
            received = ws_dev.receive_json()
            assert received["body"] == "still down for that ride?"
            assert received["sender_id"] == str(priya.id)

    app.dependency_overrides.clear()
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pytest tests/test_chat_ws.py -v`
Expected: FAIL — connection rejected (no route registered)

- [ ] **Step 4: Implement the WebSocket router**

```python
# backend/app/routers/chat_ws.py
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from ..db import get_db, SessionLocal
from ..auth import verify_token
from ..models import Thread, Message, User

router = APIRouter(tags=["chat"])

# Minimal in-process connection registry: thread_id -> list of (user_id, websocket)
_connections: dict[uuid.UUID, list[tuple[uuid.UUID, WebSocket]]] = {}

@router.websocket("/ws/threads/{thread_id}")
async def chat_socket(websocket: WebSocket, thread_id: uuid.UUID, token: str):
    db: Session = SessionLocal()
    try:
        clerk_id = verify_token(token)
    except Exception:
        await websocket.close(code=4401)
        db.close()
        return

    user = db.query(User).filter(User.clerk_id == clerk_id).one_or_none()
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
    if user is None or thread is None or user.id not in (thread.user_a_id, thread.user_b_id):
        await websocket.close(code=4403)
        db.close()
        return

    await websocket.accept()
    _connections.setdefault(thread_id, []).append((user.id, websocket))

    try:
        while True:
            data = await websocket.receive_json()
            message = Message(thread_id=thread_id, sender_id=user.id, body=data["body"])
            db.add(message)
            db.commit()
            db.refresh(message)

            payload = {
                "id": str(message.id),
                "thread_id": str(thread_id),
                "sender_id": str(user.id),
                "body": message.body,
                "created_at": message.created_at.isoformat(),
            }
            for _, peer_ws in _connections.get(thread_id, []):
                await peer_ws.send_json(payload)
    except WebSocketDisconnect:
        _connections[thread_id] = [
            (uid, ws) for uid, ws in _connections.get(thread_id, []) if ws is not websocket
        ]
    finally:
        db.close()
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_chat_ws.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/chat_ws.py backend/app/auth.py backend/tests/test_chat_ws.py
git commit -m "feat(backend): add WebSocket chat with per-thread broadcast"
```

---

### Task 9: Frontend scaffold with design tokens and Clerk

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tailwind.config.ts`, `frontend/next.config.js`
- Create: `frontend/middleware.ts`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/page.tsx` (placeholder, filled in Task 10)
- Create: `frontend/lib/types.ts`

**Interfaces:**
- Produces: Tailwind theme tokens (`bg-board`, `bg-card`, `text-ink`, `text-ink2`, `border-rule`, `text-accent`, `text-stamp`, `rounded-card` = 2px, `font-display`, `font-body`, `font-mono`, `font-hand`) usable by every component built in Tasks 10–12; `PlanT`, `ThreadT`, `MessageT`, `StampT` TypeScript types matching the backend's `PlanOut`/`ThreadOut`/`MessageOut`/`StampOut` schemas (Tasks 4–6)

- [ ] **Step 1: Scaffold the Next.js app**

Run: `npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"`

- [ ] **Step 2: Install Clerk**

Run: `cd frontend && npm install @clerk/nextjs`

- [ ] **Step 3: Write design tokens into the Tailwind config**

```ts
// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: "#5B4A32",
        card: "#FBF3E3",
        ink: "#2A2216",
        ink2: "#6B5A3E",
        rule: "#D8C9A3",
        accent: "#B8461A",
        stamp: "#3F7A4C",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        hand: ["var(--font-caveat)"],
        body: ["var(--font-source-sans)"],
        mono: ["var(--font-plex-mono)"],
      },
      borderRadius: {
        card: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Wire fonts and ClerkProvider in the root layout**

```tsx
// frontend/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { Space_Grotesk, Source_Sans_3, IBM_Plex_Mono, Caveat } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-space-grotesk" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-source-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-plex-mono" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${spaceGrotesk.variable} ${sourceSans.variable} ${plexMono.variable} ${caveat.variable}`}>
        <body className="bg-board font-body text-ink">{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

```ts
// frontend/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 5: Write shared types**

```ts
// frontend/lib/types.ts
export type PlanT = {
  id: string;
  user_id: string;
  text: string;
  lat: number;
  lon: number;
  starts_at: string;
  ends_at: string;
};

export type ThreadT = { id: string; user_a_id: string; user_b_id: string };

export type MessageT = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type StampT = { confirmed: boolean; confirmed_at: string | null };
```

- [ ] **Step 6: Add a placeholder home page and verify the app boots**

```tsx
// frontend/app/page.tsx
export default function Page() {
  return <main className="p-6 font-display text-2xl">StayConnected</main>;
}
```

Run: `cd frontend && npm run dev`
Expected: dev server starts on `http://localhost:3000`, page renders "StayConnected" in the dark board background with no console errors

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Next.js app with design tokens and Clerk"
```

---

### Task 10: Discovery feed — PlanCard and PlanFeed

**Files:**
- Create: `frontend/components/PlanCard.tsx`
- Create: `frontend/components/PlanFeed.tsx`
- Create: `frontend/lib/api.ts`
- Modify: `frontend/app/page.tsx`
- Test: `frontend/components/__tests__/PlanCard.test.tsx`
- Test: `frontend/components/__tests__/PlanFeed.test.tsx`

**Interfaces:**
- Consumes: `PlanT` (Task 9), design tokens (Task 9)
- Produces: `<PlanCard plan={PlanT} rotationSeed={number} />`; `<PlanFeed plans={PlanT[]} />`; `fetchNearbyPlans(lat, lon, radiusM, at, token): Promise<PlanT[]>` in `lib/api.ts`

- [ ] **Step 1: Install test tooling**

Run: `cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

Add to `frontend/package.json` scripts: `"test": "vitest run"`

- [ ] **Step 2: Write the failing PlanCard test**

```tsx
// frontend/components/__tests__/PlanCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PlanCard from "../PlanCard";

const plan = {
  id: "1", user_id: "u1", text: "Coffee near University Ave",
  lat: 37.44, lon: -122.14,
  starts_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  ends_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

describe("PlanCard", () => {
  it("shows the plan text and a LIVE badge when within the time window", () => {
    render(<PlanCard plan={plan} rotationSeed={0} />);
    expect(screen.getByText("Coffee near University Ave")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("shows ENDED when the plan's window has passed", () => {
    const ended = { ...plan, starts_at: new Date(Date.now() - 7200000).toISOString(), ends_at: new Date(Date.now() - 3600000).toISOString() };
    render(<PlanCard plan={ended} rotationSeed={0} />);
    expect(screen.getByText("ENDED")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — `Failed to resolve import "../PlanCard"`

- [ ] **Step 4: Implement PlanCard**

```tsx
// frontend/components/PlanCard.tsx
import { PlanT } from "@/lib/types";

const ROTATIONS = ["-rotate-1", "rotate-1", "-rotate-[0.6deg]", "rotate-[1.4deg]"];

export default function PlanCard({ plan, rotationSeed }: { plan: PlanT; rotationSeed: number }) {
  const now = Date.now();
  const isLive = new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();
  const rotation = ROTATIONS[rotationSeed % ROTATIONS.length];

  return (
    <div className={`relative bg-card ${rotation} rounded-card p-3 shadow-[2px_4px_8px_rgba(0,0,0,0.28)]`}>
      <span className="absolute -top-1.5 left-4 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,0.35)]" />
      <p className="font-display font-bold text-ink">{plan.text}</p>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-rule pt-2 font-mono text-[10px] text-ink2">
        {isLive ? (
          <span className="flex items-center gap-1 font-bold text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            LIVE
          </span>
        ) : (
          <span>ENDED</span>
        )}
        <span>{new Date(plan.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the failing PlanFeed test**

```tsx
// frontend/components/__tests__/PlanFeed.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PlanFeed from "../PlanFeed";

const makePlan = (id: string, text: string) => ({
  id, user_id: "u1", text,
  lat: 37.44, lon: -122.14,
  starts_at: new Date(Date.now() - 60000).toISOString(),
  ends_at: new Date(Date.now() + 3600000).toISOString(),
});

describe("PlanFeed", () => {
  it("renders one card per plan", () => {
    render(<PlanFeed plans={[makePlan("1", "Coffee chat"), makePlan("2", "Meetup")]} />);
    expect(screen.getByText("Coffee chat")).toBeInTheDocument();
    expect(screen.getByText("Meetup")).toBeInTheDocument();
  });

  it("shows an empty state with no plans", () => {
    render(<PlanFeed plans={[]} />);
    expect(screen.getByText(/no plans/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — `Failed to resolve import "../PlanFeed"`

- [ ] **Step 8: Implement PlanFeed**

```tsx
// frontend/components/PlanFeed.tsx
import { PlanT } from "@/lib/types";
import PlanCard from "./PlanCard";

export default function PlanFeed({ plans }: { plans: PlanT[] }) {
  if (plans.length === 0) {
    return <p className="p-6 text-center font-mono text-xs text-rule">No plans pinned near you yet.</p>;
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      {plans.map((plan, i) => (
        <PlanCard key={plan.id} plan={plan} rotationSeed={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS (all 4 tests)

- [ ] **Step 10: Wire the API client and the home page**

```ts
// frontend/lib/api.ts
import { PlanT } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchNearbyPlans(
  lat: number, lon: number, radiusM: number, at: string, token: string,
): Promise<PlanT[]> {
  const url = new URL(`${API_BASE}/plans`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("radius_m", String(radiusM));
  url.searchParams.set("at", at);

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`fetchNearbyPlans failed: ${res.status}`);
  return res.json();
}
```

```tsx
// frontend/app/page.tsx
import { auth } from "@clerk/nextjs/server";
import { fetchNearbyPlans } from "@/lib/api";
import PlanFeed from "@/components/PlanFeed";

export default async function Page() {
  const { getToken } = await auth();
  const token = (await getToken()) ?? "";
  // Mountain View, CA — replace with browser geolocation in a follow-up task
  const plans = token
    ? await fetchNearbyPlans(37.3861, -122.0839, 5000, new Date().toISOString(), token)
    : [];

  return (
    <main>
      <div className="p-4">
        <h1 className="font-hand text-2xl text-card">Today</h1>
        <p className="font-mono text-xs text-rule">{plans.length} plans pinned near you</p>
      </div>
      <PlanFeed plans={plans} />
    </main>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add frontend/components/ frontend/lib/api.ts frontend/app/page.tsx frontend/package.json
git commit -m "feat(frontend): add PlanCard, PlanFeed, and the discovery page"
```

---

### Task 11: Plan detail page and starting a chat

**Files:**
- Create: `frontend/app/plans/[id]/page.tsx`
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Consumes: `PlanT`, `ThreadT` (Task 9), design tokens (Task 9)
- Produces: `fetchPlan(id, token): Promise<PlanT>`, `startThread(otherUserId, token): Promise<ThreadT>` in `lib/api.ts`; page navigates to `/chats/{threadId}` on "Message" click

Note: the backend has no `GET /plans/{id}` endpoint yet — add it now since this page depends on it directly.

- [ ] **Step 1: Add the missing backend endpoint — write the failing test**

```python
# backend/tests/test_plans.py (append)
def test_get_single_plan(db_session):
    from app.db import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "single_plan_user")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    created = client.post("/plans", json={
        "text": "Founders Coffee", "lat": 37.44, "lon": -122.16,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=1)).isoformat(),
    }).json()

    resp = client.get(f"/plans/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["text"] == "Founders Coffee"
    app.dependency_overrides.clear()
```

Run: `cd backend && pytest tests/test_plans.py::test_get_single_plan -v`
Expected: FAIL — 404

Add to `backend/app/routers/plans.py`:

```python
# backend/app/routers/plans.py (append)
import uuid
from fastapi import HTTPException

@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plan = db.query(Plan).filter(Plan.id == plan_id).one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    return plan
```

Run: `cd backend && pytest tests/test_plans.py -v`
Expected: PASS, then commit: `git add backend/app/routers/plans.py backend/tests/test_plans.py && git commit -m "feat(backend): add get-single-plan endpoint"`

- [ ] **Step 2: Extend the frontend API client**

```ts
// frontend/lib/api.ts (append)
import { ThreadT } from "./types";

export async function fetchPlan(id: string, token: string): Promise<PlanT> {
  const res = await fetch(`${API_BASE}/plans/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`fetchPlan failed: ${res.status}`);
  return res.json();
}

export async function startThread(otherUserId: string, token: string): Promise<ThreadT> {
  const res = await fetch(`${API_BASE}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ other_user_id: otherUserId }),
  });
  if (!res.ok) throw new Error(`startThread failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 3: Build the detail page**

```tsx
// frontend/app/plans/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchPlan, startThread } from "@/lib/api";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = (await getToken()) ?? "";
  const plan = await fetchPlan(id, token);

  const now = Date.now();
  const isLive = new Date(plan.starts_at).getTime() <= now && now <= new Date(plan.ends_at).getTime();

  async function messagePoster() {
    "use server";
    const { getToken } = await auth();
    const t = (await getToken()) ?? "";
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

- [ ] **Step 4: Manual verification**

Run: `cd frontend && npm run dev`, sign in, click a plan card from the feed, click "Message"
Expected: navigates to `/chats/{threadId}` (page built in Task 12; a 404 there is expected until that task lands)

- [ ] **Step 5: Commit**

```bash
git add frontend/app/plans frontend/lib/api.ts
git commit -m "feat(frontend): add plan detail page with message action"
```

---

### Task 12: Chat UI with mutual stamp confirmation

**Files:**
- Create: `frontend/app/chats/[threadId]/page.tsx`
- Create: `frontend/components/ChatThread.tsx`
- Create: `frontend/components/StampButton.tsx`
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Consumes: `MessageT`, `StampT` (Task 9), `WS /ws/threads/{id}` (Task 8), `POST /threads/{id}/stamp` (Task 6)
- Produces: `<ChatThread threadId messages currentUserId wsToken />`; `<StampButton threadId token onConfirmed={(StampT) => void} />`

- [ ] **Step 1: Extend the API client**

```ts
// frontend/lib/api.ts (append)
import { MessageT, StampT } from "./types";

export async function fetchMessages(threadId: string, token: string): Promise<MessageT[]> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchMessages failed: ${res.status}`);
  return res.json();
}

export async function confirmStamp(threadId: string, token: string): Promise<StampT> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/stamp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`confirmStamp failed: ${res.status}`);
  return res.json();
}

export function wsUrl(threadId: string, token: string): string {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/ws/threads/${threadId}?token=${encodeURIComponent(token)}`;
}
```

- [ ] **Step 2: Build StampButton**

```tsx
// frontend/components/StampButton.tsx
"use client";
import { useState } from "react";
import { confirmStamp } from "@/lib/api";
import { StampT } from "@/lib/types";

export default function StampButton({ threadId, token, onConfirmed }: {
  threadId: string; token: string; onConfirmed: (s: StampT) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const stamp = await confirmStamp(threadId, token);
    onConfirmed(stamp);
    setPending(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="mx-auto block rounded-full border border-stamp px-4 py-1.5 font-mono text-[10px] text-stamp"
    >
      {pending ? "Confirming..." : "We met in person"}
    </button>
  );
}
```

- [ ] **Step 3: Build ChatThread**

```tsx
// frontend/components/ChatThread.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { wsUrl } from "@/lib/api";
import { MessageT, StampT } from "@/lib/types";
import StampButton from "./StampButton";

export default function ChatThread({
  threadId, initialMessages, currentUserId, token,
}: {
  threadId: string; initialMessages: MessageT[]; currentUserId: string; token: string;
}) {
  const [messages, setMessages] = useState<MessageT[]>(initialMessages);
  const [stamp, setStamp] = useState<StampT | null>(null);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(threadId, token));
    ws.onmessage = (event) => {
      const msg: MessageT = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    };
    socketRef.current = ws;
    return () => ws.close();
  }, [threadId, token]);

  function send() {
    if (!draft.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({ body: draft }));
    setDraft("");
  }

  return (
    <div className="flex h-screen flex-col bg-board">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[74%] rounded-xl px-3 py-2 text-xs ${
              m.sender_id === currentUserId ? "ml-auto bg-ink text-card" : "bg-[#EFE6CF] text-ink"
            }`}
          >
            {m.body}
          </div>
        ))}
        {stamp?.confirmed && (
          <div className="my-2 text-center">
            <span className="inline-block -rotate-3 rounded-full border border-stamp bg-stamp/10 px-3 py-1 font-mono text-[10px] text-stamp">
              ● MET IN PERSON — {new Date(stamp.confirmed_at!).toLocaleDateString()}
            </span>
          </div>
        )}
        {!stamp?.confirmed && <StampButton threadId={threadId} token={token} onConfirmed={setStamp} />}
      </div>
      <div className="flex gap-2 border-t border-rule p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1 rounded-full bg-card px-3 py-2 text-xs text-ink"
          placeholder="Message..."
        />
        <button onClick={send} className="rounded-full bg-accent px-4 py-2 font-mono text-[10px] text-card">
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build the page**

```tsx
// frontend/app/chats/[threadId]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { fetchMessages } from "@/lib/api";
import ChatThread from "@/components/ChatThread";

export default async function ChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { userId, getToken } = await auth();
  const token = (await getToken()) ?? "";
  const messages = await fetchMessages(threadId, token);

  return (
    <ChatThread threadId={threadId} initialMessages={messages} currentUserId={userId ?? ""} token={token} />
  );
}
```

- [ ] **Step 5: Manual verification**

Run: `cd frontend && npm run dev`, open the same thread in two browser windows (or one normal + one incognito, signed in as different users)
Expected: a message sent in one window appears in the other within ~1s; tapping "We met in person" in both windows shows the stamp in both

- [ ] **Step 6: Commit**

```bash
git add frontend/app/chats frontend/components/ChatThread.tsx frontend/components/StampButton.tsx frontend/lib/api.ts
git commit -m "feat(frontend): add chat UI with mutual stamp confirmation"
```

---

### Task 13: Plan composer

**Files:**
- Create: `frontend/app/post/page.tsx`
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Consumes: `PlanT` (Task 9), `POST /plans` (Task 4)
- Produces: `createPlan(input, token): Promise<PlanT>` in `lib/api.ts`; redirects to `/plans/{id}` on success

- [ ] **Step 1: Extend the API client**

```ts
// frontend/lib/api.ts (append)
export async function createPlan(
  input: { text: string; lat: number; lon: number; starts_at: string; ends_at: string },
  token: string,
): Promise<PlanT> {
  const res = await fetch(`${API_BASE}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createPlan failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Build the composer page**

```tsx
// frontend/app/post/page.tsx
"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createPlan } from "@/lib/api";

export default function PostPlanPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [hours, setHours] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = (await getToken()) ?? "";
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const now = new Date();
      const plan = await createPlan(
        {
          text,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          starts_at: now.toISOString(),
          ends_at: new Date(now.getTime() + hours * 3600000).toISOString(),
        },
        token,
      );
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post plan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card bg-card p-5">
        <h1 className="font-hand text-2xl text-ink">Pin a plan</h1>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          maxLength={500}
          placeholder="Grabbing coffee near University Ave, happy to talk shop..."
          className="mt-3 h-24 w-full rounded border border-rule bg-white p-2 text-sm text-ink"
        />
        <label className="mt-3 block font-mono text-[10px] uppercase text-ink2">
          Active for {hours} hour{hours > 1 ? "s" : ""}
        </label>
        <input
          type="range" min={1} max={8} value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="w-full"
        />
        {error && <p className="mt-2 font-mono text-[10px] text-accent">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-full bg-ink py-3 font-display font-semibold text-card"
        >
          {submitting ? "Pinning..." : "Pin it"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `cd frontend && npm run dev`, navigate to `/post`, allow location access, submit a plan
Expected: redirects to `/plans/{id}` showing the just-created plan; it also appears on the discovery feed at `/`

- [ ] **Step 4: Commit**

```bash
git add frontend/app/post frontend/lib/api.ts
git commit -m "feat(frontend): add plan composer with geolocation"
```

---

## Self-Review Notes

- **Spec coverage:** thesis/scope (header + Task list), architecture (Tasks 1, 9), data model incl. mutual-confirmation stamp rule (Tasks 2, 6), discovery flow (Task 4, 10), safety baseline (Task 7), visual design system tokens (Tasks 9–13) are all covered. In-venue matching and the AI agent are explicitly out of scope per the spec and not included here.
- **No placeholders:** every step has runnable code; the one deferred detail (browser geolocation instead of a hardcoded coordinate on the home page, Task 10 Step 10) is called out explicitly as a known follow-up, not a hidden gap.
- **Type consistency:** `PlanOut`/`ThreadOut`/`MessageOut`/`StampOut` (backend, Tasks 4–6) match `PlanT`/`ThreadT`/`MessageT`/`StampT` (frontend, Task 9) field-for-field; `contains_blocked_content` (Task 7) is the exact name used in both its test and its call site in `plans.py`; `verify_token` (Task 8) is added to `auth.py` in the same task that consumes it.
