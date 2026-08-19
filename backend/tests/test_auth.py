from unittest.mock import patch, MagicMock
from fastapi import HTTPException
import pytest
from app.auth import get_current_user

def test_missing_bearer_prefix_raises_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="not-a-bearer-token", db=db_session)
    assert exc.value.status_code == 401

@patch("app.auth._jwk_client")
@patch("app.auth.jwt.decode")
def test_valid_token_creates_user_on_first_sight(mock_decode, mock_jwk_client, db_session):
    mock_jwk_client.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")
    mock_decode.return_value = {"sub": "user_new_123", "name": "Dev Kulkarni"}

    user = get_current_user(authorization="Bearer faketoken", db=db_session)

    assert user.clerk_id == "user_new_123"
    assert user.name == "Dev Kulkarni"

    # second call with the same clerk_id must return the same row, not create another
    user_again = get_current_user(authorization="Bearer faketoken", db=db_session)
    assert user_again.id == user.id
