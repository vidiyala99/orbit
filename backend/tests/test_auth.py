import uuid
from fastapi import HTTPException
import pytest
from app.auth import get_current_user, get_optional_user
from app.security import create_access_token
from app.models import User


def test_missing_bearer_prefix_raises_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="not-a-bearer-token", db=db_session)
    assert exc.value.status_code == 401


def test_valid_token_resolves_existing_user(db_session):
    user = User(email="a@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user.id)
    resolved = get_current_user(authorization=f"Bearer {token}", db=db_session)

    assert resolved.id == user.id


def test_unknown_user_id_raises_401(db_session):
    token = create_access_token(uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization=f"Bearer {token}", db=db_session)
    assert exc.value.status_code == 401


def test_invalid_token_raises_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="Bearer not-a-real-jwt", db=db_session)
    assert exc.value.status_code == 401


def test_get_optional_user_returns_none_when_missing(db_session):
    assert get_optional_user(authorization=None, db=db_session) is None


def test_get_optional_user_returns_user_when_valid(db_session):
    user = User(email="b@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    token = create_access_token(user.id)

    resolved = get_optional_user(authorization=f"Bearer {token}", db=db_session)
    assert resolved is not None
    assert resolved.id == user.id
