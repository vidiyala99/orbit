from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Presence, User
from ..schemas import MatchCandidateOut, PresenceCreate, PresenceOut
from .plans import _snap

router = APIRouter(prefix="/presence", tags=["presence"])

DEFAULT_TTL = timedelta(hours=2)
NEARBY_RADIUS_M = 150
# Weight given to shared intent_tags on top of (or instead of) bio similarity —
# see spec's "compute a match score: cosine similarity ... plus a boost when
# intent_tags overlap".
TAG_OVERLAP_WEIGHT = 0.15


def _tag_overlap_score(a: list[str] | None, b: list[str] | None) -> float:
    a_set, b_set = set(a or []), set(b or [])
    union = a_set | b_set
    if not union:
        return 0.0
    return len(a_set & b_set) / len(union)


@router.post("", response_model=PresenceOut, status_code=201)
def toggle_on(body: PresenceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Presence).filter(Presence.user_id == user.id).delete()
    lat, lon = _snap(body.lat), _snap(body.lon)
    now = datetime.now(timezone.utc)
    presence = Presence(
        user_id=user.id,
        lat=lat,
        lon=lon,
        location=f"SRID=4326;POINT({lon} {lat})",
        started_at=now,
        expires_at=now + DEFAULT_TTL,
    )
    db.add(presence)
    db.commit()
    db.refresh(presence)
    return presence


@router.delete("", status_code=204)
def toggle_off(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Presence).filter(Presence.user_id == user.id).delete()
    db.commit()
    return Response(status_code=204)


@router.get("/nearby", response_model=list[MatchCandidateOut])
def nearby_candidates(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    my_presence = (
        db.query(Presence)
        .filter(Presence.user_id == user.id, Presence.expires_at > now)
        .one_or_none()
    )
    if my_presence is None:
        raise HTTPException(status_code=404, detail="you must be present to see nearby candidates")

    point = WKTElement(f"POINT({my_presence.lon} {my_presence.lat})", srid=4326)
    rows = (
        db.query(Presence, User)
        .join(User, User.id == Presence.user_id)
        .filter(Presence.user_id != user.id)
        .filter(Presence.expires_at > now)
        .filter(ST_DWithin(Presence.location, point, NEARBY_RADIUS_M))
        .all()
    )

    candidates = [(other, _tag_overlap_score(user.intent_tags, other.intent_tags)) for _, other in rows]

    # Score in one query for the embedding case (pgvector's cosine_distance runs
    # in Postgres), falling back to tag-overlap-only when either side lacks an
    # embedding — per the spec's error-handling for a failed/missing embedding.
    scored: list[MatchCandidateOut] = []
    if user.bio_embedding is not None:
        embedded_ids = [o.id for o, _ in candidates if o.bio_embedding is not None]
        distances: dict = {}
        if embedded_ids:
            distance_rows = (
                db.query(User.id, User.bio_embedding.cosine_distance(user.bio_embedding))
                .filter(User.id.in_(embedded_ids))
                .all()
            )
            distances = {uid: dist for uid, dist in distance_rows}
        for other, tag_score in candidates:
            if other.id in distances:
                similarity = 1 - distances[other.id]
                score = similarity + TAG_OVERLAP_WEIGHT * tag_score
            else:
                score = tag_score
            scored.append(_to_candidate(other, score))
    else:
        for other, tag_score in candidates:
            scored.append(_to_candidate(other, tag_score))

    scored.sort(key=lambda c: c.match_score, reverse=True)
    return scored


def _to_candidate(user: User, score: float) -> MatchCandidateOut:
    return MatchCandidateOut(
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        headline=user.headline,
        intent_tags=user.intent_tags,
        match_score=round(score, 4),
    )
