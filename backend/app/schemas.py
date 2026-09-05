import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    email_verified_at: datetime | None
    headline: str | None
    linkedin_url: str | None
    avatar_url: str | None
    first_name: str | None
    last_name: str | None
    city: str | None
    lat: float | None
    lon: float | None
    pain_points: list[str] | None
    pain_point_other: str | None
    bio_text: str | None
    intent_tags: list[str] | None
    onboarded_at: datetime | None
    # Read off the user row but never sent to the client — only the derived
    # boolean below is. The refresh token itself is never exposed at all.
    google_calendar_connected_at: datetime | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def google_calendar_connected(self) -> bool:
        return self.google_calendar_connected_at is not None

    class Config:
        from_attributes = True

# Tap-first /post composer. Keys are fixed; the display sentence is assembled
# server-side (see app/routers/plans.py::_assemble_plan_text).
ACTIVITY_KEYS = {"coffee", "ride_share", "cowork", "meal", "event", "other"}
OPENNESS_KEYS = {"heads_down", "open_to_chat", "actively_meeting"}

class PlanCreate(BaseModel):
    activity: str
    openness: str
    detail: str | None = Field(default=None, max_length=500)
    lat: float
    lon: float
    starts_at: datetime
    ends_at: datetime

    @field_validator("activity")
    @classmethod
    def _valid_activity(cls, value: str) -> str:
        if value not in ACTIVITY_KEYS:
            raise ValueError(f"invalid activity: {value}")
        return value

    @field_validator("openness")
    @classmethod
    def _valid_openness(cls, value: str) -> str:
        if value not in OPENNESS_KEYS:
            raise ValueError(f"invalid openness: {value}")
        return value

class PlanOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    text: str
    activity: str
    openness: str
    detail: str | None
    lat: float
    lon: float
    starts_at: datetime
    ends_at: datetime

    class Config:
        from_attributes = True

class PresenceCreate(BaseModel):
    lat: float
    lon: float

class PresenceOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    lat: float
    lon: float
    started_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True

class MatchCandidateOut(BaseModel):
    user_id: uuid.UUID
    first_name: str | None
    last_name: str | None
    headline: str | None
    intent_tags: list[str] | None
    match_score: float
    why_meet: str = ""


class NearbyPersonOut(BaseModel):
    user_id: uuid.UUID
    first_name: str | None
    last_name: str | None
    status: str
    lat: float
    lon: float


class GeocodeOut(BaseModel):
    city: str
    lat: float
    lon: float


class ResearchRequest(BaseModel):
    query: str | None = None
    plan_id: uuid.UUID | None = None


class ResearchSource(BaseModel):
    title: str
    url: str = ""


class ResearchOut(BaseModel):
    answer: str
    sources: list[ResearchSource] = []
    provider: Literal["linkup", "offline"]

# Rooms: persistent spaces for a stated purpose. Like Plan's activity/openness,
# the keys are fixed and validated here rather than in the DB.
ROOM_PURPOSE_KEYS = {"cowork", "coffee_chat", "study_group", "job_hunting", "other"}
ROOM_VISIBILITY_KEYS = {"public", "private"}

class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    purpose: str
    visibility: str
    # Both or neither: a room is pinned to one venue, or it's "anywhere nearby".
    lat: float | None = None
    lon: float | None = None

    @field_validator("purpose")
    @classmethod
    def _valid_purpose(cls, value: str) -> str:
        if value not in ROOM_PURPOSE_KEYS:
            raise ValueError(f"invalid purpose: {value}")
        return value

    @field_validator("visibility")
    @classmethod
    def _valid_visibility(cls, value: str) -> str:
        if value not in ROOM_VISIBILITY_KEYS:
            raise ValueError(f"invalid visibility: {value}")
        return value

    @model_validator(mode="after")
    def _lat_lon_together(self) -> "RoomCreate":
        if (self.lat is None) != (self.lon is None):
            raise ValueError("lat and lon must both be set or both be null")
        return self

class RoomOut(BaseModel):
    id: uuid.UUID
    creator_id: uuid.UUID
    name: str
    purpose: str
    visibility: str
    lat: float | None
    lon: float | None
    created_at: datetime
    # Not on the ORM row: computed per-request by the router for the caller.
    member_count: int
    is_member: bool

class RoomMemberAdd(BaseModel):
    user_id: uuid.UUID

class TimeProposalConfirmationOut(BaseModel):
    id: uuid.UUID
    proposal_id: uuid.UUID
    room_member_id: uuid.UUID
    # Not on the row (confirmations are keyed on membership): resolved by the
    # router so the UI can show who's in without a second lookup.
    user_id: uuid.UUID
    confirmed_at: datetime

class TimeProposalCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime
    # Optional prose posted alongside the proposal card in the room thread.
    body: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _ends_after_starts(self) -> "TimeProposalCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self

class TimeProposalOut(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    proposer_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    status: str
    confirmed_at: datetime | None
    created_at: datetime
    # Per-request facts, like RoomOut.member_count: who has confirmed so far,
    # how many members that has to reach, and whether the caller is one of them.
    confirmations: list[TimeProposalConfirmationOut]
    member_count: int
    confirmed_by_me: bool

# Room chat. `kind` discriminates plain text from rendered cards; clients may
# only post the first two — a time_proposal card is written by the server when
# the proposal itself is created, so a card can never point at nothing.
ROOM_MESSAGE_CREATE_KINDS = {"text", "plan_share"}

class RoomMessageCreate(BaseModel):
    kind: str = "text"
    body: str | None = Field(default=None, max_length=2000)
    plan_id: uuid.UUID | None = None

    @field_validator("kind")
    @classmethod
    def _valid_kind(cls, value: str) -> str:
        if value not in ROOM_MESSAGE_CREATE_KINDS:
            raise ValueError(f"invalid kind: {value}")
        return value

    @model_validator(mode="after")
    def _kind_matches_payload(self) -> "RoomMessageCreate":
        body = (self.body or "").strip()
        if self.kind == "text":
            if not body:
                raise ValueError("a text message needs a body")
            if self.plan_id is not None:
                raise ValueError("a text message cannot carry a plan_id")
        if self.kind == "plan_share" and self.plan_id is None:
            raise ValueError("a plan_share message needs a plan_id")
        self.body = body or None
        return self

class RoomMessageOut(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    sender_id: uuid.UUID
    kind: str
    body: str | None
    plan_id: uuid.UUID | None
    time_proposal_id: uuid.UUID | None
    created_at: datetime
    # The referenced entity, inlined so a card renders in one round trip.
    plan: PlanOut | None = None
    time_proposal: TimeProposalOut | None = None

class BusyBlockOut(BaseModel):
    starts_at: datetime
    ends_at: datetime

class MemberAvailabilityOut(BaseModel):
    user_id: uuid.UUID
    # False when the member never connected Google Calendar, or their grant is
    # dead — either way the day view shows them as "unknown", not "free".
    connected: bool
    busy: list[BusyBlockOut]

class RoomAvailabilityOut(BaseModel):
    members: list[MemberAvailabilityOut]

class ThreadCreate(BaseModel):
    other_user_id: uuid.UUID

class ThreadOut(BaseModel):
    id: uuid.UUID
    user_a_id: uuid.UUID
    user_b_id: uuid.UUID

    class Config:
        from_attributes = True

class StampOut(BaseModel):
    confirmed: bool
    confirmed_at: datetime | None

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

class ThreadParticipantOut(BaseModel):
    """The other side of a DM thread, as shown on an inbox row."""
    id: uuid.UUID
    first_name: str | None
    last_name: str | None
    avatar_url: str | None

    class Config:
        from_attributes = True

class ThreadSummaryOut(ThreadOut):
    created_at: datetime
    other_user: ThreadParticipantOut
    # None when the thread was started but nobody has sent anything yet.
    last_message: MessageOut | None

class ReportCreate(BaseModel):
    target_type: str = Field(pattern="^(plan|message|user|room)$")
    target_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=500)

class BlockCreate(BaseModel):
    blocked_user_id: uuid.UUID

class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=255)

PAIN_POINT_KEYS = {"cold_outreach", "dont_know_who", "no_time", "no_followthrough", "other"}
INTENT_TAG_KEYS = {"co_founder", "customers", "investors", "friends", "other"}

class OnboardingRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    city: str = Field(min_length=1, max_length=120)
    pain_points: list[str] = Field(min_length=1)
    pain_point_other: str | None = Field(default=None, max_length=200)
    bio_text: str | None = Field(default=None, max_length=2000)
    intent_tags: list[str] | None = Field(default=None)

    @field_validator("pain_points")
    @classmethod
    def _valid_pain_points(cls, value: list[str]) -> list[str]:
        invalid = set(value) - PAIN_POINT_KEYS
        if invalid:
            raise ValueError(f"invalid pain point(s): {', '.join(sorted(invalid))}")
        return value

    @field_validator("intent_tags")
    @classmethod
    def _valid_intent_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        invalid = set(value) - INTENT_TAG_KEYS
        if invalid:
            raise ValueError(f"invalid intent tag(s): {', '.join(sorted(invalid))}")
        return value

class LoginRequest(BaseModel):
    email: str
    password: str

class DemoLoginRequest(BaseModel):
    """Optional pin so a picked city moves the seeded demo world with it."""
    lat: float | None = None
    lon: float | None = None
    city: str | None = None

class TokenOut(BaseModel):
    access_token: str
    user: UserOut

class VerifyEmailRequest(BaseModel):
    token: str

class RequestPasswordResetRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=255)

class OkResponse(BaseModel):
    ok: bool = True

class GoogleExchangeRequest(BaseModel):
    code: str

class EventCandidateOut(BaseModel):
    source: Literal["calendar", "gmail"]
    title: str
    location: str | None
    starts_at: datetime | None
    ends_at: datetime | None

class CandidatesOut(BaseModel):
    connected: bool
    candidates: list[EventCandidateOut]

class WaitlistCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)

class WaitlistOut(BaseModel):
    ok: bool = True

class WaitlistCountOut(BaseModel):
    count: int
