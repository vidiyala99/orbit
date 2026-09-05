import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..linkup import research_event
from ..models import Plan, User
from ..schemas import ResearchOut, ResearchRequest

router = APIRouter(tags=["research"])


def _query_for(body: ResearchRequest, db: Session) -> str:
    parts: list[str] = []
    if body.plan_id is not None:
        plan = db.query(Plan).filter(Plan.id == body.plan_id).one_or_none()
        if plan is None:
            raise HTTPException(status_code=404, detail="plan not found")
        parts.append(plan.text)
        if plan.detail:
            parts.append(plan.detail)
        parts.append(f"activity={plan.activity}")
    if body.query and body.query.strip():
        parts.append(body.query.strip())
    return " — ".join(parts)


@router.post("/research", response_model=ResearchOut)
@router.post("/plans/{plan_id}/research", response_model=ResearchOut)
def run_research(
    body: ResearchRequest | None = None,
    plan_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    del user  # auth gate only
    payload = body or ResearchRequest()
    if plan_id is not None:
        payload = ResearchRequest(query=payload.query, plan_id=plan_id)
    query = _query_for(payload, db)
    result = research_event(query)
    return ResearchOut(**result)
