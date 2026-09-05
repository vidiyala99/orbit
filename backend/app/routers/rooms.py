import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Room, RoomMember, User
from ..categories import apply_category_filter
from ..schemas import RoomCreate, RoomMemberAdd, RoomOut
from .plans import _snap

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _member_counts(db: Session, room_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not room_ids:
        return {}
    rows = db.execute(
        select(RoomMember.room_id, func.count())
        .where(RoomMember.room_id.in_(room_ids))
        .group_by(RoomMember.room_id)
    ).all()
    return {room_id: count for room_id, count in rows}


def _my_room_ids(db: Session, user_id: uuid.UUID) -> set[uuid.UUID]:
    return set(
        db.scalars(select(RoomMember.room_id).where(RoomMember.user_id == user_id)).all()
    )


def _room_out(room: Room, member_count: int, is_member: bool) -> RoomOut:
    """member_count/is_member aren't on the row — they're per-request facts."""
    return RoomOut(
        id=room.id,
        creator_id=room.creator_id,
        name=room.name,
        purpose=room.purpose,
        visibility=room.visibility,
        lat=room.lat,
        lon=room.lon,
        created_at=room.created_at,
        member_count=member_count,
        is_member=is_member,
    )


def _room_out_for(db: Session, room: Room, user: User) -> RoomOut:
    count = _member_counts(db, [room.id]).get(room.id, 0)
    is_member = db.query(RoomMember).filter(
        RoomMember.room_id == room.id, RoomMember.user_id == user.id
    ).count() > 0
    return _room_out(room, count, is_member)


def _get_room(db: Session, room_id: uuid.UUID) -> Room:
    room = db.query(Room).filter(Room.id == room_id).one_or_none()
    if room is None:
        raise HTTPException(status_code=404, detail="room not found")
    return room


def _require_member(db: Session, room_id: uuid.UUID, user: User) -> RoomMember:
    """404 if the room is gone, 403 if the caller isn't in it. Returns the
    membership row, because room-scoped writes (confirmations) key off it."""
    _get_room(db, room_id)
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id, RoomMember.user_id == user.id
    ).one_or_none()
    if member is None:
        raise HTTPException(status_code=403, detail="not a member of this room")
    return member


def _add_member(db: Session, room_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Insert a membership unless it already exists (join/add are idempotent)."""
    existing = db.query(RoomMember).filter(
        RoomMember.room_id == room_id, RoomMember.user_id == user_id
    ).one_or_none()
    if existing is None:
        db.add(RoomMember(room_id=room_id, user_id=user_id))


@router.post("", response_model=RoomOut, status_code=201)
def create_room(
    body: RoomCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lat = _snap(body.lat) if body.lat is not None else None
    lon = _snap(body.lon) if body.lon is not None else None
    room = Room(
        creator_id=user.id,
        name=body.name,
        purpose=body.purpose,
        visibility=body.visibility,
        lat=lat,
        lon=lon,
        # NULL location means "anywhere nearby" — the room isn't tied to a venue.
        location=None if lat is None else f"SRID=4326;POINT({lon} {lat})",
    )
    db.add(room)
    db.flush()
    # The creator is the room's first member, in the same transaction as the room.
    db.add(RoomMember(room_id=room.id, user_id=user.id))
    db.commit()
    db.refresh(room)
    return _room_out(room, member_count=1, is_member=True)


@router.get("", response_model=list[RoomOut])
def list_rooms(
    lat: float,
    lon: float,
    radius_m: int,
    category: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    my_room_ids = _my_room_ids(db, user.id)
    point = WKTElement(f"POINT({lon} {lat})", srid=4326)
    query = db.query(Room).filter(
        # Located rooms are filtered by radius; unlocated ones aren't tied to a
        # place, so no radius can exclude them.
        Room.location.is_(None) | ST_DWithin(Room.location, point, radius_m)
    )
    query = apply_category_filter(
        query, category=category, text_columns=[Room.name],
        kind_column=Room.purpose, kind_key="purpose",
    )
    visible = Room.visibility == "public"
    if my_room_ids:
        visible = visible | Room.id.in_(my_room_ids)
    rooms = query.filter(visible).all()

    counts = _member_counts(db, [r.id for r in rooms])
    out = [_room_out(r, counts.get(r.id, 0), r.id in my_room_ids) for r in rooms]
    # Busiest first, newest as the tie-break.
    out.sort(key=lambda r: r.created_at, reverse=True)
    out.sort(key=lambda r: r.member_count, reverse=True)
    return out


@router.get("/{room_id}", response_model=RoomOut)
def get_room(
    room_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    room = _get_room(db, room_id)
    out = _room_out_for(db, room, user)
    if room.visibility == "private" and not out.is_member:
        # Deliberately says nothing about the room itself.
        raise HTTPException(status_code=403, detail="not a member of this room")
    return out


@router.post("/{room_id}/join", response_model=RoomOut)
def join_room(
    room_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    room = _get_room(db, room_id)
    if room.visibility == "private":
        already_member = db.query(RoomMember).filter(
            RoomMember.room_id == room.id, RoomMember.user_id == user.id
        ).count() > 0
        if not already_member:
            # v1 has no invite links: an existing member must add you instead.
            raise HTTPException(status_code=403, detail="not a member of this room")
    _add_member(db, room.id, user.id)
    db.commit()
    return _room_out_for(db, room, user)


@router.post("/{room_id}/members", response_model=RoomOut)
def add_room_member(
    room_id: uuid.UUID,
    body: RoomMemberAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """How private rooms grow in v1: an existing member adds someone directly."""
    room = _get_room(db, room_id)
    is_member = db.query(RoomMember).filter(
        RoomMember.room_id == room.id, RoomMember.user_id == user.id
    ).count() > 0
    if not is_member:
        raise HTTPException(status_code=403, detail="not a member of this room")
    invitee = db.query(User).filter(User.id == body.user_id).one_or_none()
    if invitee is None:
        raise HTTPException(status_code=404, detail="user not found")
    _add_member(db, room.id, invitee.id)
    db.commit()
    return _room_out_for(db, room, user)


@router.post("/{room_id}/leave", status_code=204)
def leave_room(
    room_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 204 with no body: leaving tells the caller nothing about the room, so this
    # can't leak a private room's details to someone who was never in it.
    _get_room(db, room_id)
    db.query(RoomMember).filter(
        RoomMember.room_id == room_id, RoomMember.user_id == user.id
    ).delete()
    db.commit()
    return Response(status_code=204)
