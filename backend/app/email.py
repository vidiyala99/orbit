import logging

import httpx

from .config import settings

RESEND_URL = "https://api.resend.com/emails"

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html: str) -> None:
    # A failed or unconfigured email send (e.g. no RESEND_API_KEY in local
    # dev) must never take down the request that triggered it — signup,
    # login, and password-reset all keep working either way.
    try:
        httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.resend_from_email, "to": [to_email], "subject": subject, "html": html},
            timeout=10.0,
        )
    except httpx.HTTPError as e:
        logger.warning("failed to send email to %s: %s", to_email, e)


def send_verification_email(to_email: str, token: str) -> None:
    link = f"{settings.frontend_origin}/verify-email?token={token}"
    _send(
        to_email,
        "Verify your StayConnected email",
        f'<p>Confirm your email to finish setting up your account.</p>'
        f'<p><a href="{link}">Verify email</a></p>',
    )


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f"{settings.frontend_origin}/reset-password?token={token}"
    _send(
        to_email,
        "Reset your StayConnected password",
        f'<p>Someone requested a password reset for this account. If that was you:</p>'
        f'<p><a href="{link}">Reset password</a></p>'
        f'<p>If you didn\'t request this, you can ignore this email.</p>',
    )
