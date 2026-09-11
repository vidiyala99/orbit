from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
import jwt
import uuid

from .db import get_db
from .models import User
from .security import decode_access_token


def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        user_id = decode_access_token(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")

    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="user not found")
    return user


def get_optional_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User | None:
    """Like get_current_user, but returns None instead of raising when no/invalid credentials are present.
    Used by endpoints that are public but personalize their response for signed-in callers."""
    if not authorization:
        return None
    try:
        return get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None


def verify_token(token: str) -> uuid.UUID:
    """Returns the user id (sub claim) or raises jwt.PyJWTError."""
    return decode_access_token(token)
