"""The seeded demo account behind POST /auth/demo-login.

Check-then-create against a fixed email, so the endpoint can be hit any
number of times without duplicating a user.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .models import User

DEMO_EMAIL = "demo@stayconnected.app"
DEMO_CITY = "Mountain View, CA"
# Same fallback location the frontend uses when geolocation is unavailable.
DEMO_LAT = 37.3861
DEMO_LON = -122.0839


def get_or_create_demo_user(
    db: Session,
    lat: float | None = None,
    lon: float | None = None,
    city: str | None = None,
) -> User:
    """Returns the one demo user, creating it on first use."""
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(User.email == DEMO_EMAIL).one_or_none()
    if user is None:
        user = User(email=DEMO_EMAIL)
        db.add(user)
    user.first_name = user.first_name or "Demo"
    user.last_name = user.last_name or "Guest"
    user.headline = user.headline or "Just exploring"
    user.city = city or user.city or DEMO_CITY
    user.lat = DEMO_LAT if lat is None else lat
    user.lon = DEMO_LON if lon is None else lon
    user.email_verified_at = user.email_verified_at or now
    user.onboarded_at = user.onboarded_at or now
    db.commit()
    db.refresh(user)
    return user
