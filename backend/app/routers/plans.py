import uuid
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from geoalchemy2.functions import ST_DWithin, ST_Distance
from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
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
    if contains_blocked_content(body.text):
        raise HTTPException(status_code=422, detail="plan text not allowed")
    lat = _snap(body.lat)
    lon = _snap(body.lon)
    plan = Plan(
        user_id=user.id,
        text=body.text,
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
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    point = WKTElement(f"POINT({lon} {lat})", srid=4326)
    query = (
        db.query(Plan)
        .filter(ST_DWithin(Plan.location, point, radius_m))
        .filter(Plan.starts_at <= at, Plan.ends_at >= at)
    )
    hidden = _blocked_user_ids(db, user.id)
    if hidden:
        query = query.filter(Plan.user_id.notin_(hidden))
    return query.order_by(ST_Distance(Plan.location, point)).all()

@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plan = db.query(Plan).filter(Plan.id == plan_id).one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    return plan
