from fastapi import APIRouter, Depends
from datetime import datetime
from geoalchemy2.functions import ST_DWithin, ST_Distance
from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Plan, User
from ..schemas import PlanCreate, PlanOut

router = APIRouter(prefix="/plans", tags=["plans"])

@router.post("", response_model=PlanOut, status_code=201)
def create_plan(body: PlanCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plan = Plan(
        user_id=user.id,
        text=body.text,
        lat=body.lat,
        lon=body.lon,
        location=f"SRID=4326;POINT({body.lon} {body.lat})",
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
    plans = (
        db.query(Plan)
        .filter(ST_DWithin(Plan.location, point, radius_m))
        .filter(Plan.starts_at <= at, Plan.ends_at >= at)
        .order_by(ST_Distance(Plan.location, point))
        .all()
    )
    return plans
