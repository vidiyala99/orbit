import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .db import get_db
from .models import User
from .config import settings

_jwk_client = PyJWKClient(settings.clerk_jwks_url)

def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        signing_key = _jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")

    clerk_id = payload["sub"]
    user = db.query(User).filter(User.clerk_id == clerk_id).one_or_none()
    if user is None:
        user = User(clerk_id=clerk_id, name=payload.get("name") or "New user")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def verify_token(token: str) -> str:
    """Returns the Clerk user id (sub claim) or raises jwt.PyJWTError."""
    signing_key = _jwk_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
    return payload["sub"]
