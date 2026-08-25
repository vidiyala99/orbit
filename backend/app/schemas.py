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

class ReportCreate(BaseModel):
    target_type: str = Field(pattern="^(plan|message|user)$")
    target_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=500)

class BlockCreate(BaseModel):
    blocked_user_id: uuid.UUID

class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=255)

PAIN_POINT_KEYS = {"cold_outreach", "dont_know_who", "no_time", "no_followthrough", "other"}

class OnboardingRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    city: str = Field(min_length=1, max_length=120)
    pain_points: list[str] = Field(min_length=1)
    pain_point_other: str | None = Field(default=None, max_length=200)

    @field_validator("pain_points")
    @classmethod
    def _valid_pain_points(cls, value: list[str]) -> list[str]:
        invalid = set(value) - PAIN_POINT_KEYS
        if invalid:
            raise ValueError(f"invalid pain point(s): {', '.join(sorted(invalid))}")
        return value

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
