from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import User
from ..schemas import JobTargetRequest, OnboardingRequest, UserOut

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
    user.onboarded_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    return user


@router.patch("/me/job-target", response_model=UserOut)
def update_job_target(
    body: JobTargetRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.target_role = body.target_role
    user.target_industries = body.target_industries

    db.commit()
    db.refresh(user)
    return user

