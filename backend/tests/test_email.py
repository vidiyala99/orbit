from unittest.mock import patch, MagicMock
from app.email import send_verification_email, send_password_reset_email


@patch("app.email.httpx.post")
def test_send_verification_email_calls_resend(mock_post):
    mock_post.return_value = MagicMock(status_code=200)

    send_verification_email("user@example.com", "abc123")

    assert mock_post.called
    args, kwargs = mock_post.call_args
    assert args[0] == "https://api.resend.com/emails"
    assert kwargs["json"]["to"] == ["user@example.com"]
    assert "abc123" in kwargs["json"]["html"]
    assert "verify-email" in kwargs["json"]["html"]


@patch("app.email.httpx.post")
def test_send_password_reset_email_calls_resend(mock_post):
    mock_post.return_value = MagicMock(status_code=200)

    send_password_reset_email("user@example.com", "xyz789")

    assert mock_post.called
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["to"] == ["user@example.com"]
    assert "xyz789" in kwargs["json"]["html"]
    assert "reset-password" in kwargs["json"]["html"]
