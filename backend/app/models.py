from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text, Float, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from .db import Base

# text-embedding-3-small's output size (see app/embeddings.py).
EMBEDDING_DIM = 1536

def _uuid() -> uuid.UUID:
    return uuid.uuid4()

def _now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    headline: Mapped[str | None] = mapped_column(String(160), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(60), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(60), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    pain_points: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    pain_point_other: Mapped[str | None] = mapped_column(String(200), nullable=True)
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    google_calendar_refresh_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    google_calendar_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Luma integration — session cookies or organiser API key, both stored
    # encrypted. Never logged or returned to the client raw.
    luma_session_ciphertext: Mapped[str | None] = mapped_column(Text, nullable=True)
    luma_api_key_ciphertext: Mapped[str | None] = mapped_column(Text, nullable=True)
    luma_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Self-written, not scraped from LinkedIn (against its ToS and brittle).
    # Used for in-venue matching similarity (see bio_embedding).
    bio_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Enum-ish values validated at the Pydantic layer, not in the DB:
    #   co_founder | customers | investors | friends | other
    intent_tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    # Job-hunting target, used for job-relevance scoring against events/people.
    target_role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    target_industries: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    bio_embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
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

class WaitlistSignup(Base):
    __tablename__ = "waitlist_signups"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

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


class Person(Base):
    """A contact on the signed-in user's personal comms list.

    Distinct from User: these are people the caller wants to remember and
    message, not Orbit accounts. event_id is a real FK to Event.
    """
    __tablename__ = "people"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    x_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    where_met: Mapped[str | None] = mapped_column(String(255), nullable=True)
    what_talked: Mapped[str | None] = mapped_column(Text, nullable=True)
    # One-line why-meet, shown on a Luma-style guest row.
    relevance: Mapped[str | None] = mapped_column(String(280), nullable=True)
    # Enum-ish values validated at the Pydantic layer, not in the DB:
    #   invite_state: pending | accepted | needs_message
    invite_state: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pending_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_touch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(160), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    dm: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # JSON list of {source_id, quote} — Brain fills later; fixtures seed it.
    evidence: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Clipboard strings. May equal note/dm; Face copies these, not live sends.
    note_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    dm_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("events.id"), nullable=True, index=True)
    # Architect desk contract for Face #11. Enum-ish at the Pydantic layer:
    #   priority: needs_you | high | later
    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # True only when this contact is already a LinkedIn connection (no scrape).
    linkedin_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    # True only when there is an existing X interaction (no scrape).
    x_interacted: Mapped[bool] = mapped_column(Boolean, default=False)
    # Set when Copy note/Copy DM fires for this person, post-event. Backs
    # the cross-event "needs follow-up" dashboard rollup.
    followed_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SyncRun(Base):
    """One import or fixture load of people. No LinkedIn/X scrape jobs."""
    __tablename__ = "sync_runs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    # Enum-ish values validated at the Pydantic layer, not in the DB:
    #   source: csv | fixture
    source: Mapped[str] = mapped_column(String(20))
    #   status: ok | error
    status: Mapped[str] = mapped_column(String(20))
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
