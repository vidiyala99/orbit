import logging
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user, verify_token
from ..config import settings
from ..db import get_db
from ..models import User
from ..schemas import CandidatesOut, EventCandidateOut, OkResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/calendar", tags=["calendar"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
GMAIL_MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
# One consent grant covers both reads; the stored refresh token is shared.
GOOGLE_SCOPES = " ".join([
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
])

GOOGLE_TIMEOUT = 10.0
# A small sender-domain allow-list — registration mail from these platforms is
# a decent proxy for "something you signed up for". Extend as needed.
GMAIL_QUERY = (
    "(from:lu.ma OR from:luma.com OR from:meetup.com OR from:eventbrite.com) newer_than:45d"
)
GMAIL_MAX_MESSAGES = 5
MAX_CANDIDATES = 4

# Google allow-lists redirect URIs one by one in the Cloud Console, so every
# Google flow shares settings.google_redirect_uri and identifies itself via
# `state`. Calendar consent states look like "calendar:<jwt>".
CALENDAR_STATE_PREFIX = "calendar:"


@router.get("/connect")
def connect(token: str):
    """Browser navigation target — carries the JWT as a query param because the
    Authorization header isn't available on a top-level navigation."""
    try:
        verify_token(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": f"{CALENDAR_STATE_PREFIX}{token}",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


def complete_connect(
    code: str | None, state_token: str, db: Session, error: str | None = None,
) -> RedirectResponse:
    """Calendar half of the shared /auth/google/callback handler. Every failure
    path lands the user back on /today rather than showing them an API error
    page. `state_token` is the caller's JWT, with the flow prefix stripped."""
    error_redirect = RedirectResponse(f"{settings.frontend_origin}/today?calendar=error")
    if error is not None or code is None:
        return error_redirect

    try:
        user_id = verify_token(state_token)
    except jwt.PyJWTError:
        return error_redirect

    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        return error_redirect

    try:
        res = httpx.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        }, timeout=GOOGLE_TIMEOUT)
        if res.status_code != 200:
            raise RuntimeError(f"token exchange returned {res.status_code}")
        refresh_token = res.json()["refresh_token"]
    except Exception:
        logger.warning("calendar token exchange failed", exc_info=True)
        return error_redirect

    user.google_calendar_refresh_token = refresh_token
    user.google_calendar_connected_at = datetime.now(timezone.utc)
    db.commit()
    return RedirectResponse(f"{settings.frontend_origin}/today?calendar=connected")


@router.post("/disconnect", response_model=OkResponse)
def disconnect(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.google_calendar_refresh_token = None
    user.google_calendar_connected_at = None
    db.commit()
    return OkResponse()


def _fresh_access_token(refresh_token: str) -> str | None:
    """None means the refresh token no longer works (revoked/expired) or Google
    is unreachable — either way the caller falls back to 'not connected'."""
    try:
        res = httpx.post(GOOGLE_TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
        }, timeout=GOOGLE_TIMEOUT)
        if res.status_code != 200:
            raise RuntimeError(f"refresh returned {res.status_code}")
        return res.json()["access_token"]
    except Exception:
        logger.warning("calendar access-token refresh failed", exc_info=True)
        return None


def _calendar_candidates(access_token: str, day_start: str, day_end: str) -> list[dict]:
    """Any non-all-day event with a location is a candidate. We deliberately do
    not try to identify the platform behind an event — keyword-matching lu.ma /
    meetup.com / etc. missed real events and was endless whack-a-mole."""
    res = httpx.get(
        GOOGLE_EVENTS_URL,
        params={"timeMin": day_start, "timeMax": day_end, "singleEvents": "true"},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=GOOGLE_TIMEOUT,
    )
    if res.status_code != 200:
        raise RuntimeError(f"events.list returned {res.status_code}")

    out = []
    for item in res.json().get("items", []):
        location = (item.get("location") or "").strip()
        # All-day events carry a bare `date` instead of `dateTime`.
        starts_at = (item.get("start") or {}).get("dateTime")
        ends_at = (item.get("end") or {}).get("dateTime")
        if not location or not starts_at or not ends_at:
            continue
        out.append({
            "source": "calendar",
            "title": item.get("summary") or "Event",
            "location": location,
            "starts_at": starts_at,
            "ends_at": ends_at,
        })
    out.sort(key=lambda c: datetime.fromisoformat(c["starts_at"]))
    return out


def _gmail_candidates(access_token: str) -> list[dict]:
    """Registration mail from known event platforms. Subject line only — see the
    spec's non-goals: bodies aren't parsed, so there's no time or location."""
    headers = {"Authorization": f"Bearer {access_token}"}
    res = httpx.get(
        GMAIL_MESSAGES_URL,
        params={"q": GMAIL_QUERY, "maxResults": GMAIL_MAX_MESSAGES},
        headers=headers,
        timeout=GOOGLE_TIMEOUT,
    )
    if res.status_code != 200:
        raise RuntimeError(f"messages.list returned {res.status_code}")

    out = []
    for message in (res.json().get("messages") or [])[:GMAIL_MAX_MESSAGES]:
        detail = httpx.get(
            f"{GMAIL_MESSAGES_URL}/{message['id']}",
            params={"format": "metadata", "metadataHeaders": "Subject"},
            headers=headers,
            timeout=GOOGLE_TIMEOUT,
        )
        if detail.status_code != 200:
            raise RuntimeError(f"messages.get returned {detail.status_code}")
        subject = next(
            (h.get("value") for h in detail.json().get("payload", {}).get("headers", [])
             if h.get("name", "").lower() == "subject"),
            None,
        )
        if not subject:
            continue
        out.append({
            "source": "gmail", "title": subject,
            "location": None, "starts_at": None, "ends_at": None,
        })
    return out


@router.get("/candidates", response_model=CandidatesOut)
def candidates(
    day_start: str,
    day_end: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.google_calendar_refresh_token is None:
        return CandidatesOut(connected=False, candidates=[])

    access_token = _fresh_access_token(user.google_calendar_refresh_token)
    if access_token is None:
        # Self-heal: drop the dead grant so the UI falls back to the connect ribbon.
        user.google_calendar_refresh_token = None
        user.google_calendar_connected_at = None
        db.commit()
        return CandidatesOut(connected=False, candidates=[])

    # Each source fails independently — a Gmail outage must not hide calendar
    # candidates, and neither may ever block /today.
    found: list[dict] = []
    try:
        found += _calendar_candidates(access_token, day_start, day_end)
    except Exception:
        logger.warning("calendar events lookup failed", exc_info=True)
    try:
        found += _gmail_candidates(access_token)
    except Exception:
        logger.warning("gmail message lookup failed", exc_info=True)

    return CandidatesOut(
        connected=True,
        candidates=[EventCandidateOut(**c) for c in found[:MAX_CANDIDATES]],
    )
