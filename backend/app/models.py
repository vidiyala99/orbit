from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text, Float, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .db import Base

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
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Luma integration — session cookies or organiser API key, both stored
    # encrypted. Never logged or returned to the client raw.
    luma_session_ciphertext: Mapped[str | None] = mapped_column(Text, nullable=True)
    luma_api_key_ciphertext: Mapped[str | None] = mapped_column(Text, nullable=True)
    luma_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Job-hunting target, used for job-relevance scoring against events/people.
    target_role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    target_industries: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    # Focus (CONTEXT.md): what the user does (Role) and what they're trying to
    # solve at events (Struggle). Attendees are ranked against this.
    focus_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    focus_struggle: Mapped[str | None] = mapped_column(String(400), nullable=True)
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
    # JSON list of situational match tags, e.g. "Potentially hiring".
    signals: Mapped[list | None] = mapped_column(JSON, nullable=True)
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
    # Keep/skip on the Focus card. Enum-ish at the Pydantic layer:
    #   triage_state: kept | skipped | null (undecided)
    triage_state: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    triaged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


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


class ActionRun(Base):
    """One agent run (enrichment, outreach, ...) and its metered LLM usage.

    The run #1 vs #N compounding panel reads these totals.
    """
    __tablename__ = "action_runs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    # Enum-ish values validated at the gateway layer, not in the DB:
    #   kind: enrichment | focus | matchmaking | outreach | smoke
    kind: Mapped[str] = mapped_column(String(20))
    #   mode: reasoned | replayed
    mode: Mapped[str] = mapped_column(String(20))
    #   status: running | succeeded | failed
    status: Mapped[str] = mapped_column(String(20))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    llm_calls: Mapped[int] = mapped_column(Integer, default=0)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    # The part of tokens_in served from the provider's prompt cache.
    tokens_cached: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    # Budget caps; the gateway refuses calls once either is reached.
    max_llm_calls: Mapped[int] = mapped_column(Integer)
    max_tokens: Mapped[int] = mapped_column(Integer)


class LLMCall(Base):
    """One metered model call (or externally reported usage) within a run."""
    __tablename__ = "llm_calls"
    # Integer key: calls are an append-only log read back in insert order.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("action_runs.id"), index=True)
    # Enum-ish values validated at the gateway layer (app/llm/gateway.py), not in the DB:
    #   task: a Task value, e.g. why_meet | outreach_draft | profile_extraction
    task: Mapped[str] = mapped_column(String(40))
    #   tier: fast | smart | embed
    tier: Mapped[str] = mapped_column(String(20))
    model: Mapped[str] = mapped_column(String(80))
    #   outcome: ok | schema_invalid | provider_error
    outcome: Mapped[str] = mapped_column(String(20))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cached_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
