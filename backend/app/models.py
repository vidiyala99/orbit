from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text, UniqueConstraint, Float, JSON
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
    # Self-written, not scraped from LinkedIn (against its ToS and brittle).
    # Used for in-venue matching similarity (see bio_embedding).
    bio_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Enum-ish values validated at the Pydantic layer, not in the DB
    # (same convention as Plan.activity / Room.purpose):
    #   co_founder | customers | investors | friends | other
    intent_tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    bio_embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
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

class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    # Structured composer selections (tap-first /post UI).
    # Enum-ish values validated at the Pydantic layer, not in the DB:
    #   activity: coffee | ride_share | cowork | meal | other
    #   openness: heads_down | open_to_chat | actively_meeting
    activity: Mapped[str] = mapped_column(String(20))
    openness: Mapped[str] = mapped_column(String(20))
    detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Server-assembled from activity + openness + duration + detail.
    text: Mapped[str] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    location: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class Presence(Base):
    """Ambient "open to meeting" signal for in-venue matching.

    Distinct from Plan: no text describing an activity, just "I'm here and
    open right now." Short-lived (expires_at is a few hours out, not days),
    created when a user toggles on and effectively deleted by expiry rather
    than by an explicit toggle-off row mutation.
    """
    __tablename__ = "presence"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    location: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Room(Base):
    """A persistent (not time-boxed, unlike Plan) space for a stated purpose."""
    __tablename__ = "rooms"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    # Enum-ish values validated at the Pydantic layer, not in the DB
    # (same convention as Plan.activity / Plan.openness):
    #   purpose: cowork | coffee_chat | study_group | job_hunting | other
    #   visibility: public | private
    purpose: Mapped[str] = mapped_column(String(20))
    visibility: Mapped[str] = mapped_column(String(10))
    # Nullable: a room can be "anywhere nearby" rather than pinned to a venue.
    # location is populated only when lat/lon are set.
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    location: Mapped[str | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class RoomMember(Base):
    __tablename__ = "room_members"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rooms.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_member"),)

class TimeProposal(Base):
    """A proposed meeting time on a Room, awaiting per-member confirmation.

    Generalizes the two-party Stamp pattern (user_a_confirmed/user_b_confirmed
    booleans on a 1:1 Thread) to N room members, so confirmations live in their
    own row-per-member table rather than as fixed columns here.

    Note: this models the *proposal*, not availability. There is deliberately no
    "user busy time" table — per-user busy/free is read live from the existing
    Google Calendar connection (User.google_calendar_refresh_token, see
    routers/calendar.py), so the day-view's busy blocks are an API-composition
    concern rather than stored state.
    """
    __tablename__ = "time_proposals"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rooms.id"))
    proposer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # Enum-ish value validated at the Pydantic layer, not in the DB
    # (same convention as Plan.activity / Room.purpose):
    #   status: proposed | confirmed | cancelled
    status: Mapped[str] = mapped_column(String(20), default="proposed")
    # Set when the proposal flips to `confirmed` (mirrors Stamp.confirmed_at).
    # Nullable: a freshly proposed block has nobody confirmed yet.
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class TimeProposalConfirmation(Base):
    """One room member's "I'm in" on a TimeProposal.

    The row's existence *is* the confirmation, so confirmed_at is NOT NULL — it's
    always supplied at insert time. Un-confirming is a delete, not a null-out.
    Keyed on room_members.id (not users.id) so a confirmation is inherently
    scoped to that member's membership in that room.
    """
    __tablename__ = "time_proposal_confirmations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    proposal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("time_proposals.id"))
    room_member_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room_members.id"))
    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    __table_args__ = (
        UniqueConstraint("proposal_id", "room_member_id", name="uq_proposal_confirmation"),
    )


class RoomMessage(Base):
    """Room-level chat. Kept as its own table rather than nullable-ing
    Message.thread_id, so the 1:1 Thread invariant (and every existing query
    against it) stays untouched.

    A message is either plain text or a rendered card. Rather than a polymorphic
    blob, `kind` discriminates and a nullable typed FK carries the referenced
    entity — exactly one of which is populated for a card kind.
    """
    __tablename__ = "room_messages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rooms.id"))
    # users.id, not room_members.id, matching Message.sender_id — a member who
    # leaves the room must not orphan or erase their past messages.
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    # Enum-ish value validated at the Pydantic layer, not in the DB
    # (same convention as Plan.activity / Room.purpose):
    #   kind: text | plan_share | time_proposal
    kind: Mapped[str] = mapped_column(String(20), default="text")
    # Nullable: card messages (plan_share / time_proposal) may carry no prose.
    # Required-ness for kind="text" is enforced at the Pydantic layer.
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Set only for kind="plan_share".
    plan_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    # Set only for kind="time_proposal".
    time_proposal_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("time_proposals.id"), nullable=True
    )
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

class FollowUp(Base):
    """A reminder to follow up after a Stamp, so a real meeting doesn't
    quietly go cold. One FollowUp per Stamp (the note/reminder for that
    specific meeting), created when the note is saved post-stamp.
    """
    __tablename__ = "follow_ups"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    stamp_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stamps.id"))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # Enum-ish value validated at the Pydantic layer, not in the DB
    # (same convention as Plan.activity / Room.purpose):
    #   status: pending | done | snoozed
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class Report(Base):
    __tablename__ = "reports"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    reporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    target_type: Mapped[str] = mapped_column(String(20))
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class WaitlistSignup(Base):
    __tablename__ = "waitlist_signups"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

class Block(Base):
    __tablename__ = "blocks"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    blocker_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    blocked_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id", name="uq_block_pair"),)
