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
