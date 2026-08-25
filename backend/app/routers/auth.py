import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import User, EmailVerificationToken, PasswordResetToken
from ..schemas import (
    SignupRequest, LoginRequest, TokenOut,
    VerifyEmailRequest, RequestPasswordResetRequest, ResetPasswordRequest, OkResponse,
    GoogleExchangeRequest,
)
from ..security import hash_password, verify_password, create_access_token, generate_opaque_token
from ..email import send_verification_email, send_password_reset_email
from .calendar import CALENDAR_STATE_PREFIX, complete_connect as complete_calendar_connect

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFICATION_TOKEN_LIFETIME = timedelta(hours=24)
PASSWORD_RESET_TOKEN_LIFETIME = timedelta(hours=1)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# In-process one-time-code -> user_id store. Same single-instance tradeoff
# already accepted for chat_ws.py's connection registry; fine for v1.
_pending_exchanges: dict[str, uuid.UUID] = {}


@router.post("/signup", response_model=TokenOut, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).one_or_none() is not None:
        raise HTTPException(status_code=409, detail="email already registered")

    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    verification_token = generate_opaque_token()
    db.add(EmailVerificationToken(
        user_id=user.id, token=verification_token,
        expires_at=datetime.now(timezone.utc) + VERIFICATION_TOKEN_LIFETIME,
    ))
    db.commit()
    send_verification_email(user.email, verification_token)

    return TokenOut(access_token=create_access_token(user.id), user=user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).one_or_none()
    if user is None or user.password_hash is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid email or password")

    return TokenOut(access_token=create_access_token(user.id), user=user)


@router.post("/verify-email", response_model=OkResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    record = db.query(EmailVerificationToken).filter(EmailVerificationToken.token == body.token).one_or_none()
    now = datetime.now(timezone.utc)
    if record is None or record.used_at is not None or record.expires_at < now:
        raise HTTPException(status_code=400, detail="invalid or expired token")

    record.used_at = now
    user = db.query(User).filter(User.id == record.user_id).one()
    user.email_verified_at = now
    db.commit()
    return OkResponse()


@router.post("/request-password-reset", response_model=OkResponse)
def request_password_reset(body: RequestPasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).one_or_none()
    if user is not None:
        token = generate_opaque_token()
        db.add(PasswordResetToken(
            user_id=user.id, token=token, expires_at=datetime.now(timezone.utc) + PASSWORD_RESET_TOKEN_LIFETIME,
        ))
        db.commit()
        send_password_reset_email(user.email, token)
    # Always 200, whether or not the email exists — avoids account enumeration.
    return OkResponse()


@router.post("/reset-password", response_model=OkResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token == body.token).one_or_none()
    now = datetime.now(timezone.utc)
    if record is None or record.used_at is not None or record.expires_at < now:
        raise HTTPException(status_code=400, detail="invalid or expired token")

    record.used_at = now
    user = db.query(User).filter(User.id == record.user_id).one()
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return OkResponse()


@router.get("/google")
def google_authorize():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "state": "login",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
def google_callback(
    code: str | None = None,
    state: str | None = None,
    db: Session = Depends(get_db),
    error: str | None = None,
):
    """The single redirect URI registered with Google, shared by every Google
    flow — `state` says which one this is."""
    if state is not None and state.startswith(CALENDAR_STATE_PREFIX):
        return complete_calendar_connect(
            code, state.removeprefix(CALENDAR_STATE_PREFIX), db, error=error,
        )

    if code is None:
        raise HTTPException(status_code=400, detail="missing code")

    token_res = httpx.post(GOOGLE_TOKEN_URL, data={
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    })
    google_access_token = token_res.json()["access_token"]

    userinfo_res = httpx.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {google_access_token}"})
    info = userinfo_res.json()
    google_id, email = info["sub"], info["email"]

    user = db.query(User).filter(User.google_id == google_id).one_or_none()
    if user is None:
        user = db.query(User).filter(User.email == email).one_or_none()
        if user is None:
            user = User(email=email, google_id=google_id)
            db.add(user)
        else:
            user.google_id = google_id
        db.commit()
        db.refresh(user)

    one_time_code = generate_opaque_token()
    _pending_exchanges[one_time_code] = user.id
    return RedirectResponse(f"{settings.frontend_origin}/auth/google/callback?code={one_time_code}")


@router.post("/google/exchange", response_model=TokenOut)
def google_exchange(body: GoogleExchangeRequest, db: Session = Depends(get_db)):
    user_id = _pending_exchanges.pop(body.code, None)
    if user_id is None:
        raise HTTPException(status_code=400, detail="invalid or already-used code")

    user = db.query(User).filter(User.id == user_id).one()
    return TokenOut(access_token=create_access_token(user.id), user=user)
