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
    target_role: str | None
    target_industries: list[str] | None
    onboarded_at: datetime | None
    # Read off the user row but never sent to the client — only the derived
    # boolean below is.
    luma_connected_at: datetime | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def luma_connected(self) -> bool:
        return self.luma_connected_at is not None

    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    source_url: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=300)
    starts_at: datetime
    ends_at: datetime | None = None


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

class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=255)

class OnboardingRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)

class JobTargetRequest(BaseModel):
    target_role: str | None = Field(default=None, max_length=160)
    target_industries: list[str] | None = Field(default=None)

class LoginRequest(BaseModel):
    email: str
    password: str

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


class LumaConnectStartRequest(BaseModel):
    """Attendee step 1: Luma email. Optional Turnstile token if the client solved it."""
    email: str = Field(min_length=3, max_length=255)
    turnstile_token: str | None = Field(default=None, max_length=2048)


class LumaConnectStartOut(BaseModel):
    """Orbit-only start: Luma emailed a 6-digit code."""
    status: Literal["code_sent"]
    email: str
    message: str


class LumaConnectRequest(BaseModel):
    """Attendee connect: email + 6-digit code (entered in Orbit).

    Legacy api_key / magic_link / email+password remain for older clients/tests.
    """
    email: str | None = Field(default=None, max_length=255)
    code: str | None = Field(default=None, max_length=12)
    password: str | None = Field(default=None, max_length=255)
    api_key: str | None = Field(default=None, max_length=255)
    magic_link: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _at_least_one_mode(self) -> "LumaConnectRequest":
        has_code = bool(self.email and self.code and self.code.strip())
        has_session = bool(self.email and self.password)
        has_api_key = bool(self.api_key)
        has_magic = bool(self.magic_link and self.magic_link.strip())
        if not has_code and not has_session and not has_api_key and not has_magic:
            raise ValueError("provide email+code, api_key, magic_link, OR email+password")
        return self


class LumaSyncOut(BaseModel):
    events: int
    people: int
    connected: bool


# Personal comms manager (Slice A). Enum-ish keys stay at this layer,
# not DB CHECK constraints.
INVITE_STATE_KEYS = {"pending", "accepted", "needs_message"}
PRIORITY_KEYS = {"needs_you", "high", "later"}
TRIAGE_KEYS = {"kept", "skipped"}
SYNC_SOURCE_KEYS = {"csv", "fixture"}


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
    signals: list[str] | None = None
    note_payload: str | None = None
    dm_payload: str | None = None
    event_id: uuid.UUID | None = None
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
    signals: list[str] | None = None
    note_payload: str | None = None
    dm_payload: str | None = None
    event_id: uuid.UUID | None = None
    priority: str | None = None
    linkedin_connected: bool | None = None
    x_interacted: bool | None = None
    followed_up_at: datetime | None = None

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
    signals: list[str] | None = None
    note_payload: str | None
    dm_payload: str | None
    event_id: uuid.UUID | None
    priority: str | None
    linkedin_connected: bool
    x_interacted: bool
    followed_up_at: datetime | None
    triage_state: str | None = None
    triaged_at: datetime | None = None

    class Config:
        from_attributes = True


class PersonTriageUpdate(BaseModel):
    """Keep / skip / undo on the Focus card."""
    state: str | None = None

    @field_validator("state")
    @classmethod
    def _valid_state(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in TRIAGE_KEYS:
            raise ValueError(f"invalid triage state: {value}")
        return value


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
