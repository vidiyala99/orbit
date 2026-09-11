"""The seeded demo account behind POST /auth/demo-login.

Check-then-create against a fixed email, so the endpoint can be hit any
number of times without duplicating a user.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .models import User

DEMO_EMAIL = "demo@orbit.app"


def get_or_create_demo_user(db: Session) -> User:
    """Returns the one demo user, creating it on first use."""
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(User.email == DEMO_EMAIL).one_or_none()
    if user is None:
        user = User(email=DEMO_EMAIL)
        db.add(user)
    user.first_name = user.first_name or "Demo"
    user.last_name = user.last_name or "Guest"
    user.headline = user.headline or "Just exploring"
    user.email_verified_at = user.email_verified_at or now
    user.onboarded_at = user.onboarded_at or now
    db.commit()
    db.refresh(user)
    return user
