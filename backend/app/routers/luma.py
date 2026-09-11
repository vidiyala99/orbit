"""POST /me/luma — Connect, disconnect, and sync Luma events+guests.

Attendee product path (all in Orbit — no Luma tab):
  1. POST /me/luma/connect/start {email} → Orbit requests Luma email code
  2. POST /me/luma/connect {email, code} → session cookies stored

Sync pulls Going events from the session and imports guest lists as Person rows.
"""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..luma_client import (
    establish_session,
    establish_session_from_email_code,
    establish_session_from_magic_link,
    fetch_event_guests,
    fetch_event_guests_via_api_key,
    fetch_going_events_today,
    fetch_via_api_key,
    request_email_sign_in_code,
)
from ..luma_crypto import decrypt_secret, encrypt_secret
from ..models import Event, Person, User
from ..people import person_from_create
from ..schemas import (
    LumaConnectRequest,
    LumaConnectStartOut,
    LumaConnectStartRequest,
    LumaSyncOut,
    PersonCreate,
    UserOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/luma", tags=["luma"])


def _persist_luma_session(user: User, db: Session, cookies: list[dict]) -> UserOut:
    user.luma_session_ciphertext = encrypt_secret(json.dumps(cookies))
    user.luma_api_key_ciphertext = None
    user.luma_connected_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/connect/start", response_model=LumaConnectStartOut)
async def connect_start(
    body: LumaConnectStartRequest,
    user: User = Depends(get_current_user),
):
    """Request a Luma email code without opening a browser tab for the user."""
    void_user = user.id
    del void_user

    result = await request_email_sign_in_code(
        body.email.strip(),
        turnstile_token=body.turnstile_token,
    )
    email = body.email.strip()
    if result.get("ok") and result.get("status") == "code_sent":
        return LumaConnectStartOut(
            status="code_sent",
            email=email,
            message="Check your email for a 6-digit Luma code.",
        )
    raise HTTPException(
        status_code=400,
        detail=result.get("detail") or "Could not start Luma sign-in",
    )


@router.post("/connect", response_model=UserOut)
async def connect(
    body: LumaConnectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Establish a Luma connection. Preferred: email + 6-digit code."""

    if body.email and body.code and body.code.strip():
        cookies = await establish_session_from_email_code(
            body.email.strip(),
            body.code.strip(),
        )
        if cookies is None:
            raise HTTPException(
                status_code=400,
                detail="That code did not work. Request a fresh code and try again.",
            )
        return _persist_luma_session(user, db, cookies)

    if body.api_key:
        user.luma_api_key_ciphertext = encrypt_secret(body.api_key)
        user.luma_session_ciphertext = None
        user.luma_connected_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return UserOut.model_validate(user)

    if body.magic_link and body.magic_link.strip():
        cookies = await establish_session_from_magic_link(body.magic_link.strip())
        if cookies is None:
            raise HTTPException(
                status_code=400,
                detail="That Luma sign-in link did not create a session.",
            )
        return _persist_luma_session(user, db, cookies)

    assert body.email and body.password
    cookies = await establish_session(body.email, body.password)
    if cookies is None:
        raise HTTPException(
            status_code=400,
            detail="Luma password login is not supported. Use your Luma email + code.",
        )
    return _persist_luma_session(user, db, cookies)

@router.post("/disconnect", response_model=UserOut)
def disconnect(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.luma_session_ciphertext = None
    user.luma_api_key_ciphertext = None
    user.luma_connected_at = None
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def _event_api_id_from_url(source_url: str | None) -> str | None:
    if not source_url:
        return None
    parts = source_url.rstrip("/").split("/")
    return parts[-1] if parts else None


@router.post("/sync", response_model=LumaSyncOut)
async def sync(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pull Luma Going events and guest lists into Event + Person rows."""
    if user.luma_connected_at is None:
        raise HTTPException(status_code=400, detail="Luma not connected — call /me/luma/connect first")

    raw_events: list[dict] = []

    if user.luma_session_ciphertext:
        try:
            cookies = json.loads(decrypt_secret(user.luma_session_ciphertext))
        except Exception:
            logger.warning("luma sync: could not decrypt session — clearing", exc_info=True)
            user.luma_session_ciphertext = None
            user.luma_connected_at = None
            db.commit()
            raise HTTPException(status_code=400, detail="Luma session is invalid — please reconnect")
        raw_events = await fetch_going_events_today(cookies)

    elif user.luma_api_key_ciphertext:
        try:
            api_key = decrypt_secret(user.luma_api_key_ciphertext)
        except Exception:
            logger.warning("luma sync: could not decrypt api_key — clearing", exc_info=True)
            user.luma_api_key_ciphertext = None
            user.luma_connected_at = None
            db.commit()
            raise HTTPException(status_code=400, detail="Luma API key is invalid — please reconnect")
        raw_events = await fetch_via_api_key(api_key)

    events_created = 0
    people_created = 0

    for ev in raw_events:
        title = (ev.get("title") or "Luma Event").strip()
        source_url = ev.get("source_url")
        starts_at_raw = ev.get("starts_at")
        ends_at_raw = ev.get("ends_at")

        try:
            starts_at = datetime.fromisoformat(starts_at_raw.replace("Z", "+00:00")) if starts_at_raw else datetime.now(timezone.utc)
        except (ValueError, AttributeError):
            starts_at = datetime.now(timezone.utc)

        try:
            ends_at = datetime.fromisoformat(ends_at_raw.replace("Z", "+00:00")) if ends_at_raw else None
        except (ValueError, AttributeError):
            ends_at = None

        existing: Event | None = None
        if source_url:
            existing = db.query(Event).filter(
                Event.user_id == user.id,
                Event.source_url == source_url,
            ).one_or_none()
        if existing is None:
            existing = db.query(Event).filter(
                Event.user_id == user.id,
                Event.title == title,
                func.date(Event.starts_at) == starts_at.date(),
            ).one_or_none()

        if existing is None:
            existing = Event(
                user_id=user.id,
                title=title,
                source_url=source_url,
                location=ev.get("location"),
                starts_at=starts_at,
                ends_at=ends_at,
            )
            db.add(existing)
            db.flush()
            events_created += 1

        raw_guests: list[dict] = []

        if user.luma_session_ciphertext:
            event_ref = _event_api_id_from_url(source_url) or title
            raw_guests = await fetch_event_guests(
                json.loads(decrypt_secret(user.luma_session_ciphertext)),
                event_ref,
            )
        elif user.luma_api_key_ciphertext:
            event_api_id = ev.get("_event_api_id") or _event_api_id_from_url(source_url)
            if event_api_id:
                raw_guests = await fetch_event_guests_via_api_key(
                    decrypt_secret(user.luma_api_key_ciphertext),
                    event_api_id,
                )

        for g in raw_guests:
            name = (g.get("name") or "Unknown").strip()
            if not name:
                continue
            already = db.query(Person).filter(
                Person.user_id == user.id,
                Person.event_id == existing.id,
                Person.name == name,
            ).one_or_none()
            if already is None:
                person = person_from_create(
                    user.id,
                    PersonCreate(
                        name=name,
                        role=g.get("role"),
                        avatar_url=g.get("avatar_url"),
                        linkedin_url=g.get("linkedin_url"),
                        x_url=g.get("x_url"),
                        relevance=g.get("relevance"),
                        event_id=existing.id,
                    ),
                )
                db.add(person)
                people_created += 1

        db.flush()
        existing.guest_count = (
            db.query(func.count(Person.id))
            .filter(Person.event_id == existing.id)
            .scalar()
        )
        existing.synced_at = datetime.now(timezone.utc)

    db.commit()
    return LumaSyncOut(events=events_created, people=people_created, connected=True)
