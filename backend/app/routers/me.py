from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..geocoding import geocode_city
from ..models import User
from ..schemas import OnboardingRequest, UserOut

router = APIRouter(tags=["me"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me/onboarding", response_model=UserOut)
def onboard_me(
    body: OnboardingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.first_name = body.first_name
    user.last_name = body.last_name
    user.city = body.city
    user.pain_points = body.pain_points
    user.pain_point_other = body.pain_point_other if "other" in body.pain_points else None

    geocoded = geocode_city(body.city)
    if geocoded is not None:
        user.lat, user.lon = geocoded
    else:
        user.lat, user.lon = None, None

    user.onboarded_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    return user
