import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import (
    RoomMember,
    RoomMessage,
    TimeProposal,
    TimeProposalConfirmation,
    User,
)
from ..schemas import (
    BusyBlockOut,
    MemberAvailabilityOut,
    RoomAvailabilityOut,
    TimeProposalConfirmationOut,
    TimeProposalCreate,
    TimeProposalOut,
)
from . import calendar as calendar_api
from .rooms import _require_member

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rooms/{room_id}", tags=["scheduling"])


def proposals_out(
    db: Session, proposals: list[TimeProposal], room_id: uuid.UUID, me: RoomMember,
) -> list[TimeProposalOut]:
    """Serializes with the per-request facts the day view needs: who's confirmed,
    how many members that has to reach, and whether the caller is one of them."""
    if not proposals:
        return []
    members = db.query(RoomMember).filter(RoomMember.room_id == room_id).all()
    user_by_member = {m.id: m.user_id for m in members}

    by_proposal: dict[uuid.UUID, list[TimeProposalConfirmationOut]] = {
        p.id: [] for p in proposals
    }
    rows = db.query(TimeProposalConfirmation).filter(
        TimeProposalConfirmation.proposal_id.in_(list(by_proposal))
    ).order_by(TimeProposalConfirmation.confirmed_at.asc()).all()
    for row in rows:
        # A member who left leaves their confirmation row behind; it no longer
        # counts, so the remaining members can still reach unanimity.
        if row.room_member_id not in user_by_member:
            continue
        by_proposal[row.proposal_id].append(
            TimeProposalConfirmationOut(
                id=row.id,
                proposal_id=row.proposal_id,
                room_member_id=row.room_member_id,
                user_id=user_by_member[row.room_member_id],
                confirmed_at=row.confirmed_at,
            )
        )

    return [
        TimeProposalOut(
            id=p.id,
            room_id=p.room_id,
            proposer_id=p.proposer_id,
            starts_at=p.starts_at,
            ends_at=p.ends_at,
            status=p.status,
            confirmed_at=p.confirmed_at,
            created_at=p.created_at,
            confirmations=by_proposal[p.id],
            member_count=len(members),
            confirmed_by_me=any(
                c.room_member_id == me.id for c in by_proposal[p.id]
            ),
        )
        for p in proposals
    ]


@router.get("/proposals", response_model=list[TimeProposalOut])
def list_proposals(
    room_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    me = _require_member(db, room_id, user)
    proposals = (
        db.query(TimeProposal)
        .filter(TimeProposal.room_id == room_id)
        .order_by(TimeProposal.starts_at.asc())
        .all()
    )
    return proposals_out(db, proposals, room_id, me)


@router.post("/proposals", response_model=TimeProposalOut, status_code=201)
def create_proposal(
    room_id: uuid.UUID,
    body: TimeProposalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    me = _require_member(db, room_id, user)
    proposal = TimeProposal(
        room_id=room_id,
        proposer_id=user.id,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        status="proposed",
    )
    db.add(proposal)
    db.flush()
    # The card is written here rather than by the client, so a time_proposal
    # message can never point at a proposal that doesn't exist.
    db.add(RoomMessage(
        room_id=room_id,
        sender_id=user.id,
        kind="time_proposal",
        body=body.body,
        time_proposal_id=proposal.id,
    ))
    db.commit()
    db.refresh(proposal)
    return proposals_out(db, [proposal], room_id, me)[0]


@router.post("/proposals/{proposal_id}/confirm", response_model=TimeProposalOut)
def confirm_proposal(
    room_id: uuid.UUID,
    proposal_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    me = _require_member(db, room_id, user)
    proposal = db.query(TimeProposal).filter(
        TimeProposal.id == proposal_id, TimeProposal.room_id == room_id
    ).one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="proposal not found")

    existing = db.query(TimeProposalConfirmation).filter(
        TimeProposalConfirmation.proposal_id == proposal.id,
        TimeProposalConfirmation.room_member_id == me.id,
    ).one_or_none()
    if existing is None:
        db.add(TimeProposalConfirmation(
            proposal_id=proposal.id, room_member_id=me.id,
        ))
        db.flush()

    out = proposals_out(db, [proposal], room_id, me)[0]
    # Unanimity flips the proposal, the same way both halves of a Stamp do.
    if len(out.confirmations) >= out.member_count and proposal.confirmed_at is None:
        proposal.status = "confirmed"
        proposal.confirmed_at = datetime.now(timezone.utc)
        out.status = proposal.status
        out.confirmed_at = proposal.confirmed_at
    db.commit()
    return out


@router.get("/availability", response_model=RoomAvailabilityOut)
def room_availability(
    room_id: uuid.UUID,
    day_start: str,
    day_end: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Each member's busy blocks for the day, read live from their connected
    Google Calendar. A member whose calendar is missing or unreachable comes
    back connected=false with no blocks — never an error for the whole room."""
    _require_member(db, room_id, user)
    member_ids = [
        m.user_id for m in db.query(RoomMember).filter(RoomMember.room_id == room_id).all()
    ]
    users = db.query(User).filter(User.id.in_(member_ids)).all()

    out = []
    for member in users:
        busy: list[dict] = []
        connected = False
        if member.google_calendar_refresh_token is not None:
            access_token = calendar_api._fresh_access_token(
                member.google_calendar_refresh_token
            )
            if access_token is not None:
                connected = True
                try:
                    busy = calendar_api.busy_blocks(access_token, day_start, day_end)
                except Exception:
                    logger.warning("room availability lookup failed", exc_info=True)
        out.append(MemberAvailabilityOut(
            user_id=member.id,
            connected=connected,
            busy=[BusyBlockOut(**b) for b in busy],
        ))
    return RoomAvailabilityOut(members=out)
