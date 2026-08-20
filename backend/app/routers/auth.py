from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User, EmailVerificationToken
from ..schemas import SignupRequest, LoginRequest, TokenOut
from ..security import hash_password, verify_password, create_access_token, generate_opaque_token
from ..email import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFICATION_TOKEN_LIFETIME = timedelta(hours=24)


@router.post("/signup", response_model=TokenOut, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).one_or_none() is not None:
        raise HTTPException(status_code=409, detail="email already registered")

    user = User(email=body.email, name=body.name, password_hash=hash_password(body.password))
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
