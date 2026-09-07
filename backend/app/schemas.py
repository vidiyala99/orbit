import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, computed_field, field_validator

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

class GeocodeOut(BaseModel):
    city: str
    lat: float
    lon: float

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
    """Optional pin so a picked city moves the seeded demo user with it."""
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


# Personal comms manager (Slice A). Enum-ish keys stay at this layer,
# not DB CHECK constraints.
INVITE_STATE_KEYS = {"pending", "accepted", "needs_message"}
PRIORITY_KEYS = {"needs_you", "high", "later"}
SYNC_SOURCE_KEYS = {"csv", "fixture"}
# Stable opaque event id for the fixture guest list. Not an events table.
DEMO_EVENT_ID = "burning-token"


class EvidenceItem(BaseModel):
    source_id: str
    quote: str


class PersonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    role: str | None = Field(default=None, max_length=160)
    avatar_url: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=255)
    x_url: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    where_met: str | None = Field(default=None, max_length=255)
    what_talked: str | None = None
    relevance: str | None = Field(default=None, max_length=280)
    invite_state: str | None = None
    pending_since: datetime | None = None
    accepted_at: datetime | None = None
    last_touch_at: datetime | None = None
    intent: str | None = Field(default=None, max_length=160)
    note: str | None = None
    dm: str | None = None
    email_draft: str | None = None
    score: float | None = None
    evidence: list[EvidenceItem] | None = None
    note_payload: str | None = None
    dm_payload: str | None = None
    event_id: str | None = Field(default=None, max_length=120)
    priority: str | None = None
    linkedin_connected: bool = False
    x_interacted: bool = False

    @field_validator("invite_state")
    @classmethod
    def _valid_invite_state(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in INVITE_STATE_KEYS:
            raise ValueError(f"invalid invite_state: {value}")
        return value

    @field_validator("priority")
    @classmethod
    def _valid_priority(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in PRIORITY_KEYS:
            raise ValueError(f"invalid priority: {value}")
        return value

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("name is required")
        return name


class PersonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    role: str | None = Field(default=None, max_length=160)
    avatar_url: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=255)
    x_url: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    where_met: str | None = Field(default=None, max_length=255)
    what_talked: str | None = None
    relevance: str | None = Field(default=None, max_length=280)
    invite_state: str | None = None
    pending_since: datetime | None = None
    accepted_at: datetime | None = None
    last_touch_at: datetime | None = None
    intent: str | None = Field(default=None, max_length=160)
    note: str | None = None
    dm: str | None = None
    email_draft: str | None = None
    score: float | None = None
    evidence: list[EvidenceItem] | None = None
    note_payload: str | None = None
    dm_payload: str | None = None
    event_id: str | None = Field(default=None, max_length=120)
    priority: str | None = None
    linkedin_connected: bool | None = None
    x_interacted: bool | None = None

    @field_validator("invite_state")
    @classmethod
    def _valid_invite_state(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in INVITE_STATE_KEYS:
            raise ValueError(f"invalid invite_state: {value}")
        return value

    @field_validator("priority")
    @classmethod
    def _valid_priority(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in PRIORITY_KEYS:
            raise ValueError(f"invalid priority: {value}")
        return value

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        name = value.strip()
        if not name:
            raise ValueError("name is required")
        return name


class PersonOut(BaseModel):
    id: uuid.UUID
    name: str
    role: str | None
    avatar_url: str | None
    linkedin_url: str | None
    x_url: str | None
    email: str | None
    where_met: str | None
    what_talked: str | None
    relevance: str | None
    invite_state: str | None
    pending_since: datetime | None
    accepted_at: datetime | None
    last_touch_at: datetime | None
    intent: str | None
    note: str | None
    dm: str | None
    email_draft: str | None
    score: float | None
    evidence: list[EvidenceItem] | None
    note_payload: str | None
    dm_payload: str | None
    event_id: str | None
    priority: str | None
    linkedin_connected: bool
    x_interacted: bool

    class Config:
        from_attributes = True


class PeopleImportOut(BaseModel):
    created: int
    people: list[PersonOut]


class SyncRunCreate(BaseModel):
    source: str

    @field_validator("source")
    @classmethod
    def _valid_source(cls, value: str) -> str:
        if value not in SYNC_SOURCE_KEYS:
            raise ValueError(f"invalid source: {value}")
        return value


class SyncRunOut(BaseModel):
    id: uuid.UUID
    source: str
    status: str
    created_at: datetime
    error: str | None

    class Config:
        from_attributes = True
