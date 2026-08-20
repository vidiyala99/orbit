import uuid
from datetime import datetime
from pydantic import BaseModel, Field

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
    name: str = Field(min_length=1, max_length=120)

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    user: UserOut

class WaitlistCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)

class WaitlistOut(BaseModel):
    ok: bool = True

class WaitlistCountOut(BaseModel):
    count: int
