import uuid
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from app.security import (
    hash_password, verify_password, create_access_token, decode_access_token, generate_opaque_token,
)
from app.config import settings


def test_hash_and_verify_roundtrip():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_hash_is_not_plaintext():
    assert hash_password("secret") != "secret"


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    assert decode_access_token(token) == user_id


def test_expired_token_rejected():
    user_id = uuid.uuid4()
    expired = jwt.encode(
        {"sub": str(user_id), "iat": datetime.now(timezone.utc) - timedelta(days=8),
         "exp": datetime.now(timezone.utc) - timedelta(days=1)},
        settings.jwt_secret, algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(expired)


def test_tampered_token_rejected():
    token = create_access_token(uuid.uuid4())
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(token + "tampered")


def test_generate_opaque_token_is_unique_and_urlsafe():
    a, b = generate_opaque_token(), generate_opaque_token()
    assert a != b
    assert all(c.isalnum() or c in "-_" for c in a)
