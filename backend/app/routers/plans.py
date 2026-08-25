import uuid
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from geoalchemy2.functions import ST_DWithin, ST_Distance
from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user, get_optional_user
from ..models import Block, Plan, User
from ..schemas import PlanCreate, PlanOut
from ..filters import contains_blocked_content

router = APIRouter(prefix="/plans", tags=["plans"])


def _snap(coord: float, precision: int = 3) -> float:
    """Reduce coordinate precision to neighborhood/venue level (~100m).

    Exact GPS coordinates are never stored (Global Constraint: location precision
    is fixed to neighborhood/venue-level for every plan).
    """
    return round(coord, precision)


ACTIVITY_FRAGMENTS = {
    "coffee": "Grabbing coffee",
    "ride_share": "Heading out, ride share",
    "cowork": "Working from a spot nearby",
    "meal": "Grabbing food",
    "event": "Heading to an event",
    "other": "Making plans",
}

OPENNESS_FRAGMENTS = {
    "heads_down": "heads down, but say hi",
    "open_to_chat": "open to chat",
    "actively_meeting": "actively looking to meet people",
}


def _duration_label(starts_at: datetime, ends_at: datetime) -> str:
    """Human duration: whole minutes under an hour, else hours to the nearest half."""
    minutes = max(1, round((ends_at - starts_at).total_seconds() / 60))
    if minutes < 60:
        return f"{minutes} minute" if minutes == 1 else f"{minutes} minutes"
    hours = round(minutes / 30) / 2
    return f"{hours:g} hour" if hours == 1 else f"{hours:g} hours"


def _assemble_plan_text(
    activity: str, openness: str, starts_at: datetime, ends_at: datetime,
    detail: str | None,
) -> str:
    """Build the display sentence for a plan from the composer's structured choices."""
    sentence = (
        f"{ACTIVITY_FRAGMENTS[activity]}, {OPENNESS_FRAGMENTS[openness]}"
        f" — around for the next {_duration_label(starts_at, ends_at)}."
    )
    if detail and detail.strip():
        sentence = f"{sentence} {detail.strip()}"
    return sentence


def _blocked_user_ids(db: Session, user_id) -> list:
    """Ids of users in a block relationship with user_id, in either direction."""
    rows = (
        db.query(Block)
        .filter((Block.blocker_id == user_id) | (Block.blocked_id == user_id))
        .all()
    )
    return [b.blocked_id if b.blocker_id == user_id else b.blocker_id for b in rows]

@router.post("", response_model=PlanOut, status_code=201)
def create_plan(body: PlanCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Only `detail` is free-form user input; the rest of the sentence is
    # server-assembled from a fixed set of fragments.
    if body.detail and contains_blocked_content(body.detail):
        raise HTTPException(status_code=422, detail="plan text not allowed")
    lat = _snap(body.lat)
    lon = _snap(body.lon)
    plan = Plan(
        user_id=user.id,
        activity=body.activity,
        openness=body.openness,
        detail=body.detail,
        text=_assemble_plan_text(
            body.activity, body.openness, body.starts_at, body.ends_at, body.detail,
        ),
        lat=lat,
        lon=lon,
        location=f"SRID=4326;POINT({lon} {lat})",
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.get("", response_model=list[PlanOut])
def discover_plans(
    lat: float, lon: float, radius_m: int, at: datetime,
    db: Session = Depends(get_db), user: User | None = Depends(get_optional_user),
):
    point = WKTElement(f"POINT({lon} {lat})", srid=4326)
    query = (
        db.query(Plan)
        .filter(ST_DWithin(Plan.location, point, radius_m))
        .filter(Plan.starts_at <= at, Plan.ends_at >= at)
    )
    if user is not None:
        hidden = _blocked_user_ids(db, user.id)
        if hidden:
            query = query.filter(Plan.user_id.notin_(hidden))
    return query.order_by(ST_Distance(Plan.location, point)).all()

@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: uuid.UUID, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    plan = db.query(Plan).filter(Plan.id == plan_id).one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    return plan
