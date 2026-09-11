import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Event, Person, User
from ..schemas import EventCreate, EventOut

router = APIRouter(prefix="/events", tags=["events"])


def _shortlist_counts(db: Session, user_id: uuid.UUID) -> dict[uuid.UUID, int]:
    rows = (
        db.query(Person.event_id, func.count(Person.id))
        .filter(Person.user_id == user_id, Person.priority == "needs_you")
        .group_by(Person.event_id)
        .all()
    )
    return {event_id: count for event_id, count in rows if event_id is not None}


def _to_out(event: Event, counts: dict[uuid.UUID, int]) -> EventOut:
    return EventOut(
        id=event.id, title=event.title, source_url=event.source_url,
        location=event.location, starts_at=event.starts_at, ends_at=event.ends_at,
        guest_count=event.guest_count, synced_at=event.synced_at,
        shortlist_count=counts.get(event.id, 0),
    )


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    events = (
        db.query(Event).filter(Event.user_id == user.id).order_by(Event.starts_at.desc()).all()
    )
    counts = _shortlist_counts(db, user.id)
    return [_to_out(e, counts) for e in events]


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = Event(
        user_id=user.id,
        title=body.title.strip(),
        source_url=body.source_url,
        location=body.location,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    counts = _shortlist_counts(db, user.id)
    return _to_out(event, counts)


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == user.id).one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="event not found")
    counts = _shortlist_counts(db, user.id)
    return _to_out(event, counts)


@router.post("/{event_id}/sync", response_model=EventOut)
def sync_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == user.id).one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="event not found")

    event.guest_count = db.query(func.count(Person.id)).filter(Person.event_id == event.id).scalar()
    event.synced_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(event)

    counts = _shortlist_counts(db, user.id)
    return _to_out(event, counts)
