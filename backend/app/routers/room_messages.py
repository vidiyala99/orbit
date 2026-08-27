import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Plan, RoomMember, RoomMessage, TimeProposal, User
from ..schemas import PlanOut, RoomMessageCreate, RoomMessageOut
from .rooms import _require_member
from .scheduling import proposals_out

router = APIRouter(prefix="/rooms/{room_id}/messages", tags=["room_messages"])


def _messages_out(
    db: Session, messages: list[RoomMessage], room_id: uuid.UUID, me: RoomMember,
) -> list[RoomMessageOut]:
    """Inlines each card's referenced entity so the thread renders in one round
    trip — a plan_share needs the plan's text, a proposal card its times."""
    plan_ids = {m.plan_id for m in messages if m.plan_id is not None}
    plans = {
        p.id: PlanOut.model_validate(p)
        for p in db.query(Plan).filter(Plan.id.in_(plan_ids)).all()
    } if plan_ids else {}

    proposal_ids = {m.time_proposal_id for m in messages if m.time_proposal_id is not None}
    proposals = {
        p.id: p
        for p in proposals_out(
            db,
            db.query(TimeProposal).filter(TimeProposal.id.in_(proposal_ids)).all(),
            room_id,
            me,
        )
    } if proposal_ids else {}

    return [
        RoomMessageOut(
            id=m.id,
            room_id=m.room_id,
            sender_id=m.sender_id,
            kind=m.kind,
            body=m.body,
            plan_id=m.plan_id,
            time_proposal_id=m.time_proposal_id,
            created_at=m.created_at,
            plan=plans.get(m.plan_id),
            time_proposal=proposals.get(m.time_proposal_id),
        )
        for m in messages
    ]


@router.get("", response_model=list[RoomMessageOut])
def list_room_messages(
    room_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    me = _require_member(db, room_id, user)
    messages = (
        db.query(RoomMessage)
        .filter(RoomMessage.room_id == room_id)
        .order_by(RoomMessage.created_at.asc())
        .all()
    )
    return _messages_out(db, messages, room_id, me)


@router.post("", response_model=RoomMessageOut, status_code=201)
def post_room_message(
    room_id: uuid.UUID,
    body: RoomMessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    me = _require_member(db, room_id, user)
    if body.plan_id is not None:
        plan = db.query(Plan).filter(Plan.id == body.plan_id).one_or_none()
        if plan is None:
            raise HTTPException(status_code=404, detail="plan not found")

    message = RoomMessage(
        room_id=room_id,
        sender_id=user.id,
        kind=body.kind,
        body=body.body,
        plan_id=body.plan_id,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _messages_out(db, [message], room_id, me)[0]
