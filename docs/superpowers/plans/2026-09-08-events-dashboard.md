# Events Table + Home Dashboard + Pre/Post-Event Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single hardcoded demo event with a real `Event` table, add a `Home` dashboard as the post-sign-in landing screen (Upcoming / Needs follow-up / Past events), and split the `/attendees` desk into pre-event (research) and post-event (memory) modes derived from the event's start time.

**Architecture:** A new `Event` model (SQLAlchemy + Alembic) replaces the opaque `Person.event_id` string with a real foreign key. Existing `Person` rows migrate via a data migration inside the same Alembic revision. `/attendees` and the new `/home` route both read from `GET /events` and `GET /people`; pre/post-event mode is computed client-side from `event.starts_at` vs `Date.now()`, never stored. A new `Person.followed_up_at` timestamp, set when Copy note/Copy DM fires, backs the "Needs follow-up" dashboard section. No new infrastructure (no scheduler, no scraper) — sync stays manual/on-demand per the spec's explicit scope cut.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (backend). Next.js 16 App Router, TypeScript, Vitest (frontend). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-07-events-dashboard-design.md` — read it alongside this plan.

## Global Constraints

- `Event` belongs to one `user_id` — this is a personal tool, events are never shared (spec: Data model)
- Pre/post-event mode is derived (`now() < starts_at` → pre), never a stored status column (spec: Data model)
- `Event.ends_at` null falls back to `starts_at` for mode purposes (spec: Error handling)
- No scheduled/background Luma scraper in this pass — "Sync now" reflects last manual refresh, does not itself scrape (spec: Thesis, explicitly out of scope)
- `talking_points` renders as an absent section (not an empty state) when null — no fake placeholder content (spec: Pre/post-event desk)
- Each Home dashboard section fetches/renders independently; one section's failure must not blank the others (spec: Error handling)

---

## Backend

### Task 1: `Event` model, schema migration, and data migration

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic/versions/f3a8b2c91d05_add_events_table.py`
- Test: `backend/tests/test_models.py`

**Interfaces:**
- Produces: `Event` model with `id: uuid.UUID`, `user_id: uuid.UUID`, `title: str`, `source_url: str | None`, `location: str | None`, `starts_at: datetime`, `ends_at: datetime | None`, `guest_count: int | None`, `synced_at: datetime | None`, `created_at: datetime` — consumed by Tasks 2, 3, 4, 6.
- Produces: `Person.event_id: uuid.UUID | None` (was `str | None`) — consumed by Tasks 2, 3, 6.

- [ ] **Step 1: Add the `Event` model**

Edit `backend/app/models.py`, insert after the `WaitlistSignup` class (before `Person`):

```python
class Event(Base):
    """One event the signed-in user is tracking — replaces the old opaque
    Person.event_id string. Personal tool: events belong to one user, never
    shared."""
    __tablename__ = "events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # Null falls back to starts_at for pre/post-event mode purposes.
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Snapshot at last sync, not a live count.
    guest_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
```

Add `Integer` to the existing `sqlalchemy` import line:

```python
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text, Float, JSON, Integer
```

Then change `Person.event_id` (currently `event_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)`) to:

```python
    event_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("events.id"), nullable=True, index=True)
```

And update the `Person` class docstring, replacing:

```
    Distinct from User: these are people the caller wants to remember and
    message, not Orbit accounts. event_id is an opaque string (no events
    table) so a Luma-style guest list can filter without a scrape.
```

with:

```
    Distinct from User: these are people the caller wants to remember and
    message, not Orbit accounts. event_id is a real FK to Event.
```

- [ ] **Step 2: Write the failing model test**

Add to `backend/tests/test_models.py` (follow the existing `test_person_...` test's structure in that file for `db_session`/`User` setup):

```python
def test_event_belongs_to_one_user_and_person_links_to_it(db_session):
    user = User(email="events-test@example.com")
    db_session.add(user)
    db_session.flush()

    event = Event(
        user_id=user.id,
        title="Blinkko Launch Party",
        starts_at=datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc),
    )
    db_session.add(event)
    db_session.flush()

    person = Person(user_id=user.id, name="Shuo Chen", event_id=event.id)
    db_session.add(person)
    db_session.commit()

    fetched = db_session.query(Person).filter(Person.id == person.id).one()
    assert fetched.event_id == event.id
    assert db_session.query(Event).filter(Event.id == event.id).one().title == "Blinkko Launch Party"
```

Add `Event` to the existing `from app.models import ...` line at the top of the file, and ensure `datetime, timezone` are imported (they already are, per the file's other tests).

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_models.py::test_event_belongs_to_one_user_and_person_links_to_it -v`
Expected: FAIL — `ImportError: cannot import name 'Event'` (model doesn't exist yet if Step 1 wasn't applied first) or a DB error if the table doesn't exist yet (migration not applied) — either failure confirms the test exercises real code, not a stub.

- [ ] **Step 4: Write the Alembic migration (schema + data backfill in one revision)**

Create `backend/alembic/versions/f3a8b2c91d05_add_events_table.py`:

```python
"""add events table, backfill from person.event_id, repoint FK

Revision ID: f3a8b2c91d05
Revises: c8f1a0d3e4b2
Create Date: 2026-09-08 00:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f3a8b2c91d05'
down_revision: Union[str, None] = 'c8f1a0d3e4b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('source_url', sa.String(500), nullable=True),
        sa.Column('location', sa.String(300), nullable=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('guest_count', sa.Integer(), nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_events_user_id', 'events', ['user_id'])

    # Add the new UUID column alongside the old string one so data can move
    # across before the string column is dropped.
    op.add_column('people', sa.Column('event_id_new', postgresql.UUID(as_uuid=True), nullable=True))

    bind = op.get_bind()
    # One Event row per distinct (user_id, event_id string) pair currently
    # in use. starts_at defaults to now() for backfilled rows with no known
    # date — the known real one (blinkko-launch-party) is corrected by a
    # one-off UPDATE right after.
    distinct_pairs = bind.execute(sa.text(
        "SELECT DISTINCT user_id, event_id FROM people WHERE event_id IS NOT NULL"
    )).fetchall()
    for user_id, old_event_id in distinct_pairs:
        new_id = uuid.uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO events (id, user_id, title, starts_at, created_at) "
                "VALUES (:id, :user_id, :title, now(), now())"
            ),
            {"id": new_id, "user_id": user_id, "title": old_event_id},
        )
        bind.execute(
            sa.text(
                "UPDATE people SET event_id_new = :new_id "
                "WHERE user_id = :user_id AND event_id = :old_event_id"
            ),
            {"new_id": new_id, "user_id": user_id, "old_event_id": old_event_id},
        )
    # Known real event: correct the title/starts_at/source_url for rows
    # that were backfilled from the "blinkko-launch-party" string.
    bind.execute(sa.text(
        "UPDATE events SET title = 'Blinkko Launch Party', "
        "starts_at = '2026-09-08 18:00:00-07', "
        "location = '221 11th St, San Francisco', "
        "source_url = 'https://luma.com/blinkko?e=evt-w6V6FgMM4f1ZBEY' "
        "WHERE title = 'blinkko-launch-party'"
    ))

    op.drop_column('people', 'event_id')
    op.alter_column('people', 'event_id_new', new_column_name='event_id')
    op.create_index('ix_people_event_id', 'people', ['event_id'])
    op.create_foreign_key('fk_people_event_id', 'people', 'events', ['event_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_people_event_id', 'people', type_='foreignkey')
    op.drop_index('ix_people_event_id', table_name='people')
    op.add_column('people', sa.Column('event_id_old', sa.String(120), nullable=True))
    bind = op.get_bind()
    bind.execute(sa.text(
        "UPDATE people SET event_id_old = events.title "
        "FROM events WHERE people.event_id = events.id"
    ))
    op.drop_column('people', 'event_id')
    op.alter_column('people', 'event_id_old', new_column_name='event_id')
    op.create_index('ix_people_event_id', 'people', ['event_id'])
    op.drop_index('ix_events_user_id', table_name='events')
    op.drop_table('events')
```

- [ ] **Step 5: Apply the migration and run the test**

Run: `cd backend && .venv/Scripts/alembic.exe upgrade head`
Expected: migration applies with no errors.

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_models.py::test_event_belongs_to_one_user_and_person_links_to_it -v`
Expected: PASS

- [ ] **Step 6: Verify the real Blinkko data survived the migration**

Run: `cd backend && .venv/Scripts/python.exe -c "from app.db import SessionLocal; from app.models import Event, Person; db = SessionLocal(); e = db.query(Event).filter(Event.title == 'Blinkko Launch Party').one(); print(e.id, e.starts_at); print(db.query(Person).filter(Person.event_id == e.id).count())"`
Expected: prints one `Event` row and `157` (the migrated guest count from this session's earlier work).

- [ ] **Step 7: Commit**

```bash
git add backend/app/models.py backend/alembic/versions/f3a8b2c91d05_add_events_table.py backend/tests/test_models.py
git commit -m "feat: add Event table, migrate Person.event_id to a real FK"
```

---

### Task 2: `Event` schemas, `/events` endpoints, and `event_id` type updates

**Files:**
- Modify: `backend/app/schemas.py`
- Create: `backend/app/routers/events.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routers/people.py`
- Test: `backend/tests/test_events.py`
- Test: `backend/tests/test_people.py`

**Interfaces:**
- Consumes: `Event`, `Person` models from Task 1.
- Produces: `EventOut` (id, title, source_url, location, starts_at, ends_at, guest_count, synced_at, plus computed `shortlist_count: int`), `GET /events` (list, most-recent-first), `GET /events/{event_id}` (single, 404 if not owned) — consumed by Task 4 (dashboard queries) and the frontend Home task.
- Changes: `PersonCreate.event_id`, `PersonUpdate.event_id`, `PersonOut.event_id` from `str | None` to `uuid.UUID | None`. `GET /events/{event_id}/guests` path param becomes `uuid.UUID`.

- [ ] **Step 1: Add `EventOut` and switch `Person*` schemas to UUID `event_id`**

Edit `backend/app/schemas.py`. Remove `DEMO_EVENT_ID = "blinkko-launch-party"` (no longer meaningful — the real id is now a DB-generated UUID, looked up by the frontend via `GET /events`). Add, near the top after `GeocodeOut`:

```python
class EventOut(BaseModel):
    id: uuid.UUID
    title: str
    source_url: str | None
    location: str | None
    starts_at: datetime
    ends_at: datetime | None
    guest_count: int | None
    synced_at: datetime | None
    shortlist_count: int

    class Config:
        from_attributes = True
```

In `PersonCreate`, `PersonUpdate`, and `PersonOut`, change:

```python
    event_id: str | None = Field(default=None, max_length=120)
```

(appears in `PersonCreate` and `PersonUpdate`) to:

```python
    event_id: uuid.UUID | None = None
```

and in `PersonOut`, change `event_id: str | None` to `event_id: uuid.UUID | None`.

- [ ] **Step 2: Write the failing test for `GET /events`**

Create `backend/tests/test_events.py`:

```python
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.models import Event, Person


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


def test_get_single_event_requires_ownership(db_session):
    client = next(_auth_client(db_session))
    other_event = Event(
        user_id="00000000-0000-0000-0000-000000000000",
        title="Not mine",
        starts_at=datetime.now(timezone.utc),
    )
    db_session.add(other_event)
    db_session.commit()

    res = client.get(f"/events/{other_event.id}")
    assert res.status_code == 404
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_events.py -v`
Expected: FAIL — `404` for `/events` (router doesn't exist) or `ModuleNotFoundError`.

- [ ] **Step 4: Write the `events` router**

Create `backend/app/routers/events.py`:

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Event, Person, User
from ..schemas import EventOut

router = APIRouter(prefix="/events", tags=["events"])


def _shortlist_counts(db: Session, user_id: uuid.UUID) -> dict[uuid.UUID, int]:
    rows = (
        db.query(Person.event_id, func.count(Person.id))
        .filter(Person.user_id == user_id, Person.priority == "needs_you")
        .group_by(Person.event_id)
        .all()
    )
    return {event_id: count for event_id, count in rows if event_id is not None}


def _to_out(event: Event, counts: dict[uuid.UUID, int]) -> EventOut:
    return EventOut(
        id=event.id, title=event.title, source_url=event.source_url,
        location=event.location, starts_at=event.starts_at, ends_at=event.ends_at,
        guest_count=event.guest_count, synced_at=event.synced_at,
        shortlist_count=counts.get(event.id, 0),
    )


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    events = (
        db.query(Event).filter(Event.user_id == user.id).order_by(Event.starts_at.desc()).all()
    )
    counts = _shortlist_counts(db, user.id)
    return [_to_out(e, counts) for e in events]


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == user.id).one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="event not found")
    counts = _shortlist_counts(db, user.id)
    return _to_out(event, counts)
```

- [ ] **Step 5: Register the router**

Edit `backend/app/main.py`: add `events` to the existing `from .routers import me, waitlist, auth, calendar, people, sync_runs` line and add `app.include_router(events.router)` alongside the other `include_router` calls (follow the exact pattern already there for `people.router`).

- [ ] **Step 6: Update `people.py` for UUID `event_id`**

Edit `backend/app/routers/people.py`:

Change `list_people`'s query param and the `/events/{event_id}/guests` route:

```python
@router.get("/people", response_model=list[PersonOut])
def list_people(
    event_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _list_people(db, user, event_id)
```

```python
def _list_people(db: Session, user: User, event_id: uuid.UUID | None) -> list[Person]:
    query = db.query(Person).filter(Person.user_id == user.id)
    if event_id is not None:
        query = query.filter(Person.event_id == event_id)
    return query.order_by(Person.name.asc()).all()
```

```python
@router.get("/events/{event_id}/guests", response_model=list[PersonOut])
def list_event_guests(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Same Person shape as GET /people?event_id=, for a Luma-style guest list."""
    return _list_people(db, user, event_id)
```

- [ ] **Step 7: Run the tests**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_events.py tests/test_people.py -v`
Expected: `test_events.py` passes. `test_people.py` will now show new failures from Task 3 (fixtures still use the old string `event_id`) — confirm those specific failures are about `FIXTURE_EVENT_ID`/`DEMO_EVENT_ID`, not about `/events` routing, then continue to Task 3, which fixes them.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas.py backend/app/routers/events.py backend/app/main.py backend/app/routers/people.py backend/tests/test_events.py
git commit -m "feat: add /events endpoints, switch Person.event_id to UUID everywhere"
```

---

### Task 3: Fixture people use a real `Event` row

**Files:**
- Modify: `backend/app/people_fixtures.py`
- Test: `backend/tests/test_people.py`

**Interfaces:**
- Consumes: `Event` model (Task 1).
- Produces: `get_or_create_fixture_event(db, user) -> Event` — consumed by `seed_fixture_people`.

- [ ] **Step 1: Update the failing test to expect a real `Event`**

Edit `backend/tests/test_people.py`. Replace the import line `from app.people_fixtures import FIXTURE_EVENT_ID, FIXTURE_PEOPLE` with `from app.people_fixtures import FIXTURE_PEOPLE`, and remove `from app.schemas import DEMO_EVENT_ID` (both constants are gone).

Replace `test_people_routes_require_auth`'s events-guests assertion line:

```python
    assert client.get(f"/events/{DEMO_EVENT_ID}/guests", headers=bad).status_code == 401
```

with a UUID literal (any well-formed UUID works — the auth check runs before ownership lookup):

```python
    assert client.get("/events/00000000-0000-0000-0000-000000000000/guests", headers=bad).status_code == 401
```

In `test_demo_login_fixture_sync_lists_people_with_payloads`, replace:

```python
        assert person["event_id"] == FIXTURE_EVENT_ID
```

with:

```python
        assert person["event_id"] is not None
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_people.py -v`
Expected: FAIL — fixture people still carry the old string `event_id` (Pydantic validation error, since `PersonOut.event_id` is now `uuid.UUID | None`).

- [ ] **Step 3: Add `get_or_create_fixture_event` and use it**

Edit `backend/app/people_fixtures.py`. Replace:

```python
from .models import Person, User
from .schemas import DEMO_EVENT_ID

# Opaque event id Face can pass to GET /events/{id}/guests and GET /people?event_id=
FIXTURE_EVENT_ID = DEMO_EVENT_ID
```

with:

```python
from datetime import timedelta

from .models import Event, Person, User

FIXTURE_EVENT_TITLE = "Blinkko Launch Party"


def get_or_create_fixture_event(db: Session, user: User) -> Event:
    """Fixtures seed the same event a real Luma import would target — so the
    offline/demo path and the live path share one Event row per user."""
    existing = (
        db.query(Event)
        .filter(Event.user_id == user.id, Event.title == FIXTURE_EVENT_TITLE)
        .one_or_none()
    )
    if existing is not None:
        return existing
    event = Event(
        user_id=user.id,
        title=FIXTURE_EVENT_TITLE,
        starts_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(event)
    db.flush()
    return event
```

(`Session` is already imported in this file per the existing `from sqlalchemy.orm import Session` line.)

Then in `seed_fixture_people`, add the event lookup at the top and use it in place of `raw["event_id"]`:

```python
def seed_fixture_people(db: Session, user: User) -> list[Person]:
    """Check-then-create by (user_id, name, event_id). Repeat POSTs do not duplicate."""
    now = datetime.now(timezone.utc)
    event = get_or_create_fixture_event(db, user)
    seeded: list[Person] = []
    for raw in FIXTURE_PEOPLE:
        existing = db.query(Person).filter(
            Person.user_id == user.id,
            Person.name == raw["name"],
            Person.event_id == event.id,
        ).one_or_none()
```

And wherever the loop body later constructs a new `Person(...)` with `event_id=raw["event_id"]` (or `event_id=FIXTURE_EVENT_ID`), change it to `event_id=event.id`. `FIXTURE_PEOPLE`'s own dict entries keep an `"event_id"` key (harmless, now unused/ignored) or can be dropped — leave them as-is to minimize the diff; the loop no longer reads that key.

- [ ] **Step 4: Run the tests**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_people.py tests/test_events.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/people_fixtures.py backend/tests/test_people.py
git commit -m "fix: seed fixture people against a real Event row"
```

---

### Task 4: `Person.followed_up_at` and the cross-event follow-up rollup

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic/versions/a91c4e7f2b38_add_person_followed_up_at.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/people.py`
- Modify: `backend/app/routers/people.py`
- Test: `backend/tests/test_people.py`

**Interfaces:**
- Produces: `Person.followed_up_at: datetime | None`, `GET /people/needs-follow-up` → `list[PersonOut]` (people whose event has started, `priority` in `needs_you`/`high`, `followed_up_at` is null) — consumed by the frontend Home dashboard task.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_people.py`:

```python
def test_needs_follow_up_excludes_future_events_and_followed_up_people(db_session):
    from datetime import datetime, timedelta, timezone
    from app.models import Event

    client = _auth_client(db_session)
    user_id = client.get("/me").json()["id"]

    past = Event(user_id=user_id, title="Founders Cowork Wednesdays",
                 starts_at=datetime.now(timezone.utc) - timedelta(days=4))
    future = Event(user_id=user_id, title="Blinkko Launch Party",
                    starts_at=datetime.now(timezone.utc) + timedelta(days=1))
    db_session.add_all([past, future])
    db_session.flush()

    db_session.add(Person(user_id=user_id, name="Shuo Chen", event_id=past.id, priority="needs_you"))
    db_session.add(Person(user_id=user_id, name="Already Done", event_id=past.id,
                           priority="needs_you", followed_up_at=datetime.now(timezone.utc)))
    db_session.add(Person(user_id=user_id, name="Future Person", event_id=future.id, priority="needs_you"))
    db_session.add(Person(user_id=user_id, name="Low Priority", event_id=past.id, priority="later"))
    db_session.commit()

    res = client.get("/people/needs-follow-up")
    assert res.status_code == 200
    names = {p["name"] for p in res.json()}
    assert names == {"Shuo Chen"}
```

Add the `Person` import already present at the top of the file (it is — `from app.models import SyncRun, User`; add `Person` to it).

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_people.py::test_needs_follow_up_excludes_future_events_and_followed_up_people -v`
Expected: FAIL — `404 Not Found` (route doesn't exist).

- [ ] **Step 3: Add the column and migration**

Edit `backend/app/models.py`, add to `Person` (after `x_interacted`):

```python
    # Set when Copy note/Copy DM fires for this person, post-event. Backs
    # the cross-event "needs follow-up" dashboard rollup.
    followed_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

Create `backend/alembic/versions/a91c4e7f2b38_add_person_followed_up_at.py`:

```python
"""add person.followed_up_at

Revision ID: a91c4e7f2b38
Revises: f3a8b2c91d05
Create Date: 2026-09-08 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a91c4e7f2b38'
down_revision: Union[str, None] = 'f3a8b2c91d05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('people', sa.Column('followed_up_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('people', 'followed_up_at')
```

- [ ] **Step 4: Add `followed_up_at` to schemas and the update-assignable list**

In `backend/app/schemas.py`, add `followed_up_at: datetime | None = None` to `PersonUpdate` and `followed_up_at: datetime | None` to `PersonOut`.

In `backend/app/people.py`, add `"followed_up_at"` to the `assignable` tuple in `apply_person_update`.

- [ ] **Step 5: Add the `needs-follow-up` route**

Edit `backend/app/routers/people.py`, add above `list_event_guests`:

```python
@router.get("/people/needs-follow-up", response_model=list[PersonOut])
def needs_follow_up(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Cross-event rollup: needs_you/high people from events that have
    started, not yet marked followed up."""
    from datetime import datetime, timezone
    from ..models import Event

    return (
        db.query(Person)
        .join(Event, Person.event_id == Event.id)
        .filter(
            Person.user_id == user.id,
            Person.priority.in_(["needs_you", "high"]),
            Person.followed_up_at.is_(None),
            Event.starts_at <= datetime.now(timezone.utc),
        )
        .order_by(Event.starts_at.desc(), Person.name.asc())
        .all()
    )
```

(Route order matters in FastAPI — this static path must be registered before `/people/{person_id}` to avoid `"needs-follow-up"` being parsed as a UUID path param. Place this function's `@router.get` call before `get_person`'s in the file, or note that FastAPI matches routes in declaration order — move `needs_follow_up` up so it's declared right after `create_person` and before `get_person`.)

- [ ] **Step 6: Apply migration and run the tests**

Run: `cd backend && .venv/Scripts/alembic.exe upgrade head`
Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_people.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/models.py backend/alembic/versions/a91c4e7f2b38_add_person_followed_up_at.py backend/app/schemas.py backend/app/people.py backend/app/routers/people.py backend/tests/test_people.py
git commit -m "feat: add Person.followed_up_at and GET /people/needs-follow-up"
```

---

### Task 5: Fix the dead `/today` redirect

**Files:**
- Modify: `backend/app/routers/calendar.py`
- Modify: `backend/tests/test_calendar.py`

**Interfaces:** None (no cross-task interface — self-contained fix).

- [ ] **Step 1: Update the failing test**

In `backend/tests/test_calendar.py`, find the assertions checking the redirect `Location` header for `/today` (e.g. `assert "/today?calendar=connected" in response.headers["location"]` or similar — grep the file for `/today` to find every occurrence) and change each `/today` to `/home`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_calendar.py -v`
Expected: FAIL — redirects still point at `/today`.

- [ ] **Step 3: Fix the redirects**

In `backend/app/routers/calendar.py`, change both occurrences of `/today` (in `complete_connect`'s `error_redirect` and its success `RedirectResponse`) to `/home`:

```python
    error_redirect = RedirectResponse(f"{settings.frontend_origin}/home?calendar=error")
```

```python
    return RedirectResponse(f"{settings.frontend_origin}/home?calendar=connected")
```

- [ ] **Step 4: Run the tests**

Run: `cd backend && .venv/Scripts/python.exe -m pytest tests/test_calendar.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/calendar.py backend/tests/test_calendar.py
git commit -m "fix: point calendar-connect redirects at /home, not the deleted /today page"
```

---

## Frontend

### Task 6: `APP_HOME` becomes `/home`

**Files:**
- Modify: `frontend/lib/routes.ts`
- Modify: `frontend/app/sign-in/__tests__/page.test.tsx`
- Modify: `frontend/app/sign-up/__tests__/page.test.tsx`
- Modify: `frontend/app/onboarding/__tests__/page.test.tsx`
- Modify: `frontend/app/try/__tests__/page.test.tsx`
- Modify: `frontend/app/__tests__/page.test.tsx`

**Interfaces:**
- Changes: `APP_HOME` from `"/attendees"` to `"/home"` — every consumer already imports the constant (Task 2 groundwork confirmed this: sign-in, sign-up, onboarding, try, and the landing page all import `APP_HOME`, none hardcode the string), so this is the single edit point.

- [ ] **Step 1: Update the test literals first (red)**

In each of the five test files listed above, replace every literal `"/attendees"` string (in `toHaveBeenCalledWith`, `toHaveAttribute`, and `redirect`/`push`/`replace` assertions) with `"/home"`. These are simple string replacements — grep each file for `/attendees` to find every occurrence (the earlier repo-wide search found the exact line numbers).

- [ ] **Step 2: Run the frontend tests to verify they fail**

Run: `cd frontend && rtk vitest run`
Expected: FAIL in the five modified test files — `APP_HOME` still resolves to `/attendees`.

- [ ] **Step 3: Change the constant**

Edit `frontend/lib/routes.ts`:

```typescript
/** After sign-in: the Home dashboard (Upcoming / Needs follow-up / Past events). */
export const APP_HOME = "/home";

export function afterAuthPath(user: { onboarded_at?: string | null }): string {
  return user.onboarded_at ? APP_HOME : "/onboarding";
}

/** On unless explicitly set to "false". */
export function isDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== "false";
}
```

(Also drops the stale "Hackathon default" comment while this line is touched.)

- [ ] **Step 4: Run the tests**

Run: `cd frontend && rtk vitest run`
Expected: the five previously-failing files pass. `/attendees`-specific tests (`AttendeesPage`) still reference `/attendees` directly as a route, which is correct — that page still exists, just isn't the landing target.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/routes.ts frontend/app/sign-in/__tests__/page.test.tsx frontend/app/sign-up/__tests__/page.test.tsx frontend/app/onboarding/__tests__/page.test.tsx frontend/app/try/__tests__/page.test.tsx frontend/app/__tests__/page.test.tsx
git commit -m "feat: land signed-in users on /home instead of /attendees"
```

---

### Task 7: `lib/events.ts` and the Home dashboard page

**Files:**
- Create: `frontend/lib/events.ts`
- Create: `frontend/app/home/page.tsx`
- Create: `frontend/components/Home.tsx`
- Test: `frontend/app/home/__tests__/page.test.tsx`
- Test: `frontend/components/__tests__/Home.test.tsx`

**Interfaces:**
- Consumes: `resolveApiBase`, `demoLogin`, `ApiRequestError` from `frontend/lib/api.ts` (existing); `getClientToken`/`setClientToken` from `frontend/lib/auth.ts` (existing) — same token-resolution pattern as `frontend/lib/guests.ts`'s `loadDeskGuests`.
- Produces: `EventT` type (`{ id, title, source_url, location, starts_at, ends_at, guest_count, synced_at, shortlist_count }`), `HomeDataT` (`{ upcoming: EventT[], past: EventT[], needsFollowUp: PersonSummaryT[], lastSyncedAt: string | null }`), `loadHomeData(): Promise<HomeDataT>` — consumed by `frontend/app/home/page.tsx`. `PersonSummaryT` (`{ id, first_name, last_name, role, priority, event_title }`) — a trimmed view for follow-up rows, not the full `AttendeeT`.
- Produces: `<Home data={HomeDataT} />` component and `<SyncButton lastSyncedAt={string | null} />` client subcomponent — consumed by `frontend/app/home/page.tsx`.

- [ ] **Step 1: Write `lib/events.ts`**

Create `frontend/lib/events.ts`:

```typescript
import { ApiRequestError, demoLogin, resolveApiBase } from "./api";
import { getClientToken, setClientToken } from "./auth";
import { DEMO_OFFLINE_TOKEN } from "./demoFixtures";

export type EventT = {
  id: string;
  title: string;
  source_url: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  guest_count: number | null;
  synced_at: string | null;
  shortlist_count: number;
};

export type PersonSummaryT = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  priority: "needs_you" | "high" | "later";
  event_title: string;
  event_ended_days_ago: number;
};

export type HomeDataT = {
  upcoming: EventT[];
  past: EventT[];
  needsFollowUp: PersonSummaryT[];
  lastSyncedAt: string | null;
};

const EMPTY_HOME: HomeDataT = { upcoming: [], past: [], needsFollowUp: [], lastSyncedAt: null };

async function existingSessionToken(): Promise<string | null> {
  if (typeof document !== "undefined") return getClientToken();
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get("sc_token")?.value ?? null;
  } catch {
    return null;
  }
}

async function resolveToken(existing: string | null): Promise<string | null> {
  if (existing && existing !== DEMO_OFFLINE_TOKEN) return existing;
  try {
    const { access_token } = await demoLogin();
    if (typeof document !== "undefined") setClientToken(access_token);
    return access_token;
  } catch {
    return null;
  }
}

async function fetchJson(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new ApiRequestError(res.status, await res.text());
  return res.json();
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/);
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

async function fetchHomeData(token: string): Promise<HomeDataT> {
  const [events, followUps] = await Promise.all([
    fetchJson("/events", token) as Promise<EventT[]>,
    fetchJson("/people/needs-follow-up", token) as Promise<
      { id: string; name: string; role: string | null; priority: string; event_id: string }[]
    >,
  ]);
  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = events
    .filter((e) => new Date(e.starts_at).getTime() <= now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  const eventById = new Map(events.map((e) => [e.id, e]));

  const needsFollowUp: PersonSummaryT[] = followUps.map((p) => {
    const event = eventById.get(p.event_id);
    const split = splitName(p.name);
    return {
      id: p.id,
      first_name: split.first_name,
      last_name: split.last_name,
      role: p.role ?? "",
      priority: (p.priority as PersonSummaryT["priority"]) ?? "later",
      event_title: event?.title ?? "",
      event_ended_days_ago: event ? daysAgo(event.starts_at) : 0,
    };
  });

  const lastSyncedAt = events
    .map((e) => e.synced_at)
    .filter((s): s is string => !!s)
    .sort()
    .at(-1) ?? null;

  return { upcoming, past, needsFollowUp, lastSyncedAt };
}

export async function loadHomeData(): Promise<HomeDataT> {
  let token = await resolveToken(await existingSessionToken());
  if (!token) return EMPTY_HOME;
  try {
    return await fetchHomeData(token);
  } catch (err) {
    const unauthorized = err instanceof ApiRequestError && err.status === 401;
    if (!unauthorized) return EMPTY_HOME;
    try {
      token = await resolveToken(null);
      if (!token) return EMPTY_HOME;
      return await fetchHomeData(token);
    } catch {
      return EMPTY_HOME;
    }
  }
}
```

(This mirrors `frontend/lib/guests.ts`'s token-resolution/retry-on-401 shape exactly, so both files stay consistent. `resolveApiBase` and `ApiRequestError` are already exported from `frontend/lib/api.ts` — confirm the exact export names by reading that file if they differ from this signature; adjust the import accordingly.)

- [ ] **Step 2: Write the failing component test**

Create `frontend/components/__tests__/Home.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "../Home";
import type { HomeDataT } from "@/lib/events";

const DATA: HomeDataT = {
  upcoming: [{
    id: "evt-1", title: "Blinkko Launch Party", source_url: null,
    location: "221 11th St, San Francisco", starts_at: "2099-01-01T18:00:00Z",
    ends_at: null, guest_count: 157, synced_at: "2026-09-08T00:00:00Z", shortlist_count: 6,
  }],
  past: [],
  needsFollowUp: [],
  lastSyncedAt: "2026-09-08T00:00:00Z",
};

describe("Home", () => {
  it("renders the Upcoming section with an event card", () => {
    render(<Home data={DATA} />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Blinkko Launch Party")).toBeInTheDocument();
    expect(screen.getByText(/6 shortlisted/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when a section has nothing", () => {
    render(<Home data={{ upcoming: [], past: [], needsFollowUp: [], lastSyncedAt: null }} />);
    expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing needs follow-up/i)).toBeInTheDocument();
    expect(screen.getByText(/no past events yet/i)).toBeInTheDocument();
  });

  it("renders a Sync now button with a last-synced timestamp", () => {
    render(<Home data={DATA} />);
    expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && rtk vitest run Home.test.tsx`
Expected: FAIL — `Cannot find module '../Home'`.

- [ ] **Step 4: Write the `SyncButton` client component**

Create `frontend/components/SyncButton.tsx`. It re-fetches the current sync timestamp (via a full page refresh — `router.refresh()` re-runs the Server Component fetch in `HomePage`) and gives press/loading feedback; it does not itself trigger a scrape, per the spec's explicit MVP scope cut.

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function SyncButton({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justClicked, setJustClicked] = useState(false);

  function onClick() {
    setJustClicked(true);
    startTransition(() => {
      router.refresh();
    });
    window.setTimeout(() => setJustClicked(false), 1400);
  }

  const syncing = isPending || justClicked;

  return (
    <div className="flex items-center gap-3">
      <p className="text-fl-sm text-ink3">
        Last synced <strong className="text-ink2">{timeAgo(lastSyncedAt)}</strong>
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={syncing}
        className="lift btn-press rounded-full bg-accent px-4 py-2 text-fl-sm font-bold text-white disabled:opacity-70"
      >
        {syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Write the `Home` component**

Create `frontend/components/Home.tsx`:

```typescript
import Link from "next/link";
import type { EventT, HomeDataT, PersonSummaryT } from "@/lib/events";
import SyncButton from "./SyncButton";

function formatDay(iso: string): { num: string; mon: string } {
  const d = new Date(iso);
  return {
    num: String(d.getDate()).padStart(2, "0"),
    mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

function EventCard({ event }: { event: EventT }) {
  const { num, mon } = formatDay(event.starts_at);
  return (
    <Link
      href={`/attendees?event=${event.id}`}
      className="lift flex items-center gap-3.5 rounded-card bg-surface p-4 shadow-card"
    >
      <div className="flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-soft text-accent">
        <span className="text-fl-lg font-extrabold leading-none">{num}</span>
        <span className="text-fl-xs font-bold leading-none">{mon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-fl-base font-bold text-ink">{event.title}</p>
        <p className="truncate text-fl-sm text-ink3">
          {event.location ?? "Location TBD"} · {event.guest_count ?? 0} guests
        </p>
        {event.shortlist_count > 0 ? (
          <span className="mt-1.5 inline-block rounded-md bg-accent-soft px-2 py-0.5 text-fl-xs font-bold text-accent">
            {event.shortlist_count} shortlisted
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function FollowUpRow({ person }: { person: PersonSummaryT }) {
  return (
    <Link
      href={`/attendees/${person.id}`}
      className="lift flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-card"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-fl-base font-bold text-ink">
          {person.first_name} {person.last_name}{" "}
          <span className="font-medium text-ink3">{person.role}</span>
        </p>
        <p className="truncate text-fl-sm text-ink3">
          {person.event_title} · ended {person.event_ended_days_ago} days ago
        </p>
      </div>
      <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-fl-xs font-bold uppercase text-accent">
        {person.priority === "needs_you" ? "Needs you" : "High"}
      </span>
    </Link>
  );
}

export default function Home({ data }: { data: HomeDataT }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[900px] bg-ground px-4 pb-16 pt-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-fl-xl font-extrabold text-ink">Good to see you.</h1>
        <SyncButton lastSyncedAt={data.lastSyncedAt} />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-fl-sm font-extrabold uppercase tracking-[0.02em] text-ink3">
          Upcoming
        </h2>
        {data.upcoming.length === 0 ? (
          <p className="rounded-card bg-surface px-4 py-4 text-fl-sm text-ink3 shadow-card">
            No upcoming events — import a guest list to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.upcoming.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-fl-sm font-extrabold uppercase tracking-[0.02em] text-ink3">
          Needs follow-up
        </h2>
        {data.needsFollowUp.length === 0 ? (
          <p className="rounded-card bg-surface px-4 py-4 text-fl-sm text-ink3 shadow-card">
            Nothing needs follow-up right now.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.needsFollowUp.map((p) => <FollowUpRow key={p.id} person={p} />)}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-fl-sm font-extrabold uppercase tracking-[0.02em] text-ink3">
          Past events
        </h2>
        {data.past.length === 0 ? (
          <p className="rounded-card bg-surface px-4 py-4 text-fl-sm text-ink3 shadow-card">
            No past events yet — they'll show up here once one ends.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.past.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run the component test**

Run: `cd frontend && rtk vitest run Home.test.tsx`
Expected: PASS

- [ ] **Step 7: Write the page and its test**

Create `frontend/app/home/page.tsx`:

```typescript
import Home from "@/components/Home";
import { loadHomeData } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadHomeData();
  return <Home data={data} />;
}
```

Create `frontend/app/home/__tests__/page.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "../page";

vi.mock("@/lib/events", () => ({
  loadHomeData: vi.fn().mockResolvedValue({ upcoming: [], past: [], needsFollowUp: [], lastSyncedAt: null }),
}));

describe("HomePage", () => {
  it("renders without a signed-in session", async () => {
    render(await HomePage());
    expect(screen.getByText(/good to see you/i)).toBeInTheDocument();
    expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run the tests**

Run: `cd frontend && rtk vitest run`
Expected: PASS (full suite)

- [ ] **Step 9: Commit**

```bash
git add frontend/lib/events.ts frontend/components/Home.tsx frontend/components/SyncButton.tsx frontend/app/home/page.tsx frontend/app/home/__tests__/page.test.tsx frontend/components/__tests__/Home.test.tsx
git commit -m "feat: add Home dashboard (Upcoming/Needs follow-up/Past events)"
```

---

### Task 8: Pre/post-event mode on `/attendees`

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/guests.ts`
- Modify: `frontend/components/AttendeeBrief.tsx`
- Modify: `frontend/components/ContactNote.tsx`
- Test: `frontend/app/attendees/__tests__/page.test.tsx`
- Test: `frontend/components/__tests__/ContactNote.test.tsx`

**Interfaces:**
- Consumes: `EventT` from Task 7's `lib/events.ts` is NOT used here — `/attendees` keeps its own `EventBriefT`, extended in place, to avoid coupling the desk to the dashboard's event-list shape.
- Produces: `EventBriefT.starts_at: string | null` (new field), `AttendeeT.talking_points: string[] | null` (new field), `isPreEvent(event: EventBriefT): boolean` in `lib/guests.ts` — consumed by `AttendeeBrief` and `ContactNote`.

- [ ] **Step 1: Update the failing tests first**

In `frontend/app/attendees/__tests__/page.test.tsx`, the `liveDesk.event` object (built from the real `LIVE_EVENT` import) needs `starts_at` — since `LIVE_EVENT` no longer exists as a frontend constant after this task (mode now comes from the fetched `Event.starts_at`), update the test's local `liveDesk` fixture directly instead of importing `LIVE_EVENT`. Replace:

```typescript
import { LIVE_EVENT, type DeskGuests } from "@/lib/guests";
```

with:

```typescript
import type { DeskGuests } from "@/lib/guests";
```

and replace the `event: LIVE_EVENT` line in `liveDesk` with an inline object carrying a past `starts_at` (post-event mode, matching the existing "Where you met" assertions later in the same test):

```typescript
const liveDesk: DeskGuests = {
  event: { id: "blinkko-launch-party", title: "Blinkko Launch Party", datetime: "Tue, Sep 8", starts_at: "2020-01-01T00:00:00Z" },
```

In `frontend/components/__tests__/ContactNote.test.tsx`, the existing test uses `fixtureAttendee("marcus-ellis")` with post-event-shaped fixture data (`where_met`/`what_talked` already populated) — no change needed there; add one new test:

```typescript
it("renders pre-event fields when the event hasn't started yet", () => {
  const preEventAttendee = {
    ...marcus,
    talking_points: ["Ask about their Series A timeline."],
  };
  render(<ContactNote attendee={preEventAttendee} preEvent />);
  expect(screen.getByRole("heading", { name: /what they build/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /talk to them about/i })).toBeInTheDocument();
  expect(screen.getByText(/ask about their series a timeline/i)).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /where you met/i })).not.toBeInTheDocument();
});

it("hides the talking-points section when there are none", () => {
  render(<ContactNote attendee={{ ...marcus, talking_points: null }} preEvent />);
  expect(screen.queryByRole("heading", { name: /talk to them about/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && rtk vitest run`
Expected: FAIL — `ContactNote` doesn't accept a `preEvent` prop yet, `AttendeeT` has no `talking_points`.

- [ ] **Step 3: Extend the types**

In `frontend/lib/types.ts`, add to `EventBriefT`:

```typescript
export type EventBriefT = {
  id: string;
  title: string;
  datetime: string;
  /** ISO string. Null for the offline fixture event, which has no real date. */
  starts_at: string | null;
};
```

Add to `AttendeeT`:

```typescript
  /** Role-aware pre-event prep questions. Null until researched — render
   *  the section as absent, not an empty state. */
  talking_points: string[] | null;
```

- [ ] **Step 4: Add `isPreEvent` and thread `starts_at`/`talking_points` through `guests.ts`**

In `frontend/lib/guests.ts`, add near the top (after the `PRIORITIES` const):

```typescript
export function isPreEvent(event: EventBriefT): boolean {
  if (!event.starts_at) return false;
  return new Date(event.starts_at).getTime() > Date.now();
}
```

In `mapGuestToAttendee`'s returned object, add:

```typescript
    talking_points: Array.isArray(pick(rec, "talking_points"))
      ? (pick(rec, "talking_points") as unknown[]).filter((s): s is string => typeof s === "string")
      : null,
```

In `fallbackDesk`/`FIXTURE_EVENT` handling and `LIVE_EVENT`: remove the `LIVE_EVENT` export entirely (mode now comes from the fetched event's real `starts_at`, not a hardcoded constant) and change `loadDeskGuests` to build the event brief from the fetched `/events/{id}` response instead. Since `fetchEventGuests` today only returns the guest array (not the event), add one more fetch: change `fetchMappedGuests` to also call `fetchJson('/events/' + DEMO_EVENT_ID, token)` — but note `DEMO_EVENT_ID` no longer exists as a fixed string (Task 2 removed it): resolve the target event id by calling `GET /events`, taking the most-recently-started one, matching "the one event this personal tool currently tracks" until the dashboard's per-event links (`/attendees?event=<id>`) are wired as the real navigation path. Read the `event` search param when present:

```typescript
export async function loadDeskGuests(eventIdParam?: string): Promise<DeskGuests> {
  let token = await resolveGuestsToken(await existingSessionToken());
  if (!token) return fallbackDesk();

  try {
    const events = await fetchJson("/events", token) as unknown[];
    const eventRows = events.map((e) => asRecord(e)).filter((e): e is Record<string, unknown> => e !== null);
    const target = eventIdParam
      ? eventRows.find((e) => e.id === eventIdParam)
      : eventRows[0];
    if (!target) return fallbackDesk();

    const eventId = asString(pick(target, "id"));
    if (!eventId) return fallbackDesk();

    const attendees = await fetchMappedGuests(token, eventId);
    if (attendees.length === 0) return fallbackDesk();

    const event: EventBriefT = {
      id: eventId,
      title: asString(pick(target, "title")) ?? "Event",
      datetime: asString(pick(target, "starts_at")) ?? "",
      starts_at: asString(pick(target, "starts_at")),
    };
    return { event, attendees, source: "live" };
  } catch (err) {
    const unauthorized = err instanceof ApiRequestError && err.status === 401;
    if (unauthorized) {
      try {
        token = await resolveGuestsToken(null);
        if (!token) return fallbackDesk();
        return loadDeskGuests(eventIdParam);
      } catch {
        return fallbackDesk();
      }
    }
    return fallbackDesk();
  }
}
```

Update `fetchMappedGuests` to take the resolved `eventId` instead of the removed `DEMO_EVENT_ID` constant:

```typescript
async function fetchMappedGuests(token: string, eventId: string): Promise<AttendeeT[]> {
  const payload = await fetchEventGuests(eventId, token);
  let attendees = guestsFromResponse(payload);
  if (attendees.length > 0) return attendees;

  await syncFixturePeople(token);
  attendees = guestsFromResponse(await fetchEventGuests(eventId, token));
  return attendees;
}
```

Add a small `fetchJson` helper at the top of `guests.ts` (or import one if already present via `lib/api.ts` — check first; if `lib/api.ts` already exports something equivalent, reuse it instead of duplicating):

```typescript
import { resolveApiBase } from "./api";

async function fetchJson(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new ApiRequestError(res.status, await res.text());
  return res.json();
}
```

And update `FIXTURE_EVENT` in `demoFixtures.ts` to add `starts_at: null` (the offline fixture has no real date, per the type change).

- [ ] **Step 5: Update `AttendeeBrief` for tier-label swap**

In `frontend/components/AttendeeBrief.tsx`, replace the fixed `SEGMENTS` constant with a function of mode:

```typescript
import { isPreEvent } from "@/lib/guests";

const SEGMENTS_POST: { id: AttendeePriorityT; label: string }[] = [
  { id: "needs_you", label: "Needs you" },
  { id: "high", label: "High" },
  { id: "later", label: "Later" },
];

const SEGMENTS_PRE: { id: AttendeePriorityT; label: string }[] = [
  { id: "needs_you", label: "Shortlist" },
  { id: "high", label: "Worth meeting" },
  { id: "later", label: "Full list" },
];
```

In the `AttendeeBrief` component body, compute `const preEvent = isPreEvent(event);` and `const SEGMENTS = preEvent ? SEGMENTS_PRE : SEGMENTS_POST;`, then pass `preEvent` down: `<ContactNoteCard attendee={selected} preEvent={preEvent} />` (desktop split view) — `DeskRow`'s own why-meet line stays as-is (it already reads `row.why_meet`, which is field-agnostic).

- [ ] **Step 6: Update `ContactNote` for field-swap**

In `frontend/components/ContactNote.tsx`, change `ContactNoteCard`'s signature to accept `preEvent?: boolean` and branch the fields list:

```typescript
const FIELDS_POST: { key: keyof AttendeeT["note"]; label: string; icon: ReactNode }[] = [
  { key: "where_met", label: "Where you met", icon: <PinIcon /> },
  { key: "what_talked", label: "What you talked about", icon: <ChatIcon /> },
  { key: "why", label: "Why it matters", icon: <SparkIcon /> },
];
```

Add a `BuildIcon` (reuse `PinIcon`'s svg wrapper pattern) and render pre-event fields directly rather than through the `note`-keyed loop (they don't come from `attendee.note`):

```typescript
export function ContactNoteCard({ attendee, preEvent = false }: { attendee: AttendeeT; preEvent?: boolean }) {
  const name = attendeeName(attendee);
  const fields = preEvent ? [] : FIELDS_POST;

  return (
    <article style={{ animation: "paneIn 220ms ease-out both" }} className="overflow-hidden rounded-card bg-surface shadow-card">
      {/* ...header unchanged... */}
      <div className="flex flex-col gap-5 border-t border-rule px-6 py-6">
        {preEvent ? (
          <>
            <section className="flex gap-3">
              <FieldIcon><PinIcon /></FieldIcon>
              <div className="min-w-0 flex-1">
                <h2 className="text-fl-sm font-bold uppercase tracking-[0.02em] text-ink3">What they build</h2>
                <p className="mt-1 text-fl-md font-medium leading-relaxed text-ink2">{attendee.role}</p>
              </div>
            </section>
            <section className="flex gap-3">
              <FieldIcon><SparkIcon /></FieldIcon>
              <div className="min-w-0 flex-1 rounded-card bg-accent-soft px-4 py-3">
                <h2 className="text-fl-sm font-bold uppercase tracking-[0.02em] text-accent">Why it matters</h2>
                <p className="mt-1 font-mono text-fl-base italic leading-relaxed text-ink">{attendee.why_meet}</p>
              </div>
            </section>
            {attendee.talking_points && attendee.talking_points.length > 0 ? (
              <section className="flex gap-3">
                <FieldIcon><ChatIcon /></FieldIcon>
                <div className="min-w-0 flex-1">
                  <h2 className="text-fl-sm font-bold uppercase tracking-[0.02em] text-ink3">Talk to them about</h2>
                  <ul className="mt-1 flex flex-col gap-2">
                    {attendee.talking_points.map((point, i) => (
                      <li key={i} className="text-fl-md font-medium leading-relaxed text-ink2">{point}</li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </>
        ) : (
          fields.map((field) => /* existing map body, unchanged */ null)
        )}
      </div>
      {/* ...footer unchanged... */}
    </article>
  );
}
```

(Keep the existing `fields.map(...)` body exactly as it is today for the `else` branch — only the branching wrapper and the `preEvent` block are new.)

Update the default-exported `ContactNote` (the standalone mobile page wrapper) to accept and forward `preEvent` too, and update `frontend/app/attendees/[id]/page.tsx` to compute `isPreEvent(desk.event)` and pass it through.

- [ ] **Step 7: Run the tests**

Run: `cd frontend && rtk vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/guests.ts frontend/lib/demoFixtures.ts frontend/components/AttendeeBrief.tsx frontend/components/ContactNote.tsx frontend/app/attendees/[id]/page.tsx frontend/app/attendees/__tests__/page.test.tsx frontend/components/__tests__/ContactNote.test.tsx
git commit -m "feat: derive pre/post-event mode from Event.starts_at on /attendees"
```

---

### Task 9: Pre-event search and role filter

**Files:**
- Modify: `frontend/components/AttendeeBrief.tsx`
- Test: `frontend/app/attendees/__tests__/page.test.tsx` (or a new focused test file if `AttendeeBrief` doesn't already have one — check first)

**Interfaces:**
- Consumes: `preEvent`, `attendees` already in scope in `AttendeeBrief`.
- Produces: no new exports — internal UI state only.

- [ ] **Step 1: Write the failing test**

Add to the live-desk `describe` block in `frontend/app/attendees/__tests__/page.test.tsx` (reuses the existing `liveDesk` fixture from Task 8's edit, extended with a second attendee if only one exists — add one):

```typescript
it("filters the full list by search text pre-event", async () => {
  loadDeskGuests.mockResolvedValue({
    ...liveDesk,
    event: { ...liveDesk.event, starts_at: "2099-01-01T00:00:00Z" },
  });
  render(await AttendeesPage());
  const fullListTab = screen.getByRole("tab", { name: /full list/i });
  fireEvent.click(fullListTab);
  const search = screen.getByPlaceholderText(/search/i);
  fireEvent.change(search, { target: { value: "nonexistent-name-xyz" } });
  expect(screen.getByText(/no one in this list/i)).toBeInTheDocument();
});
```

Add `fireEvent` to the existing `import { render, screen } from "@testing-library/react"` line (`import { render, screen, fireEvent } from "@testing-library/react"`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && rtk vitest run page.test.tsx`
Expected: FAIL — no search input exists yet.

- [ ] **Step 3: Add the search box**

In `frontend/components/AttendeeBrief.tsx`, add state and a filter, rendered only when `preEvent`:

```typescript
const [search, setSearch] = useState("");
```

Change the `rows` computation to also filter by search text when `preEvent`:

```typescript
const bySegment = attendees.filter((row) => row.priority === segment);
const rows = preEvent && search.trim()
  ? bySegment.filter((row) => {
      const q = search.trim().toLowerCase();
      return (
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    })
  : bySegment;
```

Add the input above the segment tabs, only pre-event:

```typescript
{preEvent ? (
  <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder={`Search ${count} guests — name, company, role…`}
    aria-label="Search guests"
    className="field mb-3 w-full rounded-full border border-rule bg-surface px-4 py-2.5 text-fl-sm text-ink placeholder:text-ink3"
  />
) : null}
```

- [ ] **Step 4: Run the tests**

Run: `cd frontend && rtk vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/components/AttendeeBrief.tsx frontend/app/attendees/__tests__/page.test.tsx
git commit -m "feat: add search over the full guest list in pre-event mode"
```

---

## Final verification

- [ ] **Backend full suite:** `cd backend && .venv/Scripts/python.exe -m pytest --ignore=tests/test_pg_extensions.py -v` — expect the same pass count as before this plan, plus the new tests, minus zero regressions (the pre-existing `test_calendar.py`/numpy-import environment failures noted during brainstorming are unrelated to this plan and may still appear).
- [ ] **Frontend full suite:** `cd frontend && rtk vitest run` — expect all green.
- [ ] **Manual smoke check:** `scripts/dev.sh`, sign in via demo login, confirm `/home` shows the real Blinkko event under Upcoming with `6 shortlisted`, click into it, confirm the pre-event fields (What they build / Why it matters / Talk to them about-or-absent) render instead of Where you met / What you talked about.
