from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy.exc import IntegrityError
from app.models import User, Plan

def test_create_user_and_plan(db_session):
    user = User(email="priya@example.com", name="Priya Shah")
    db_session.add(user)
    db_session.commit()

    now = datetime.now(timezone.utc)
    plan = Plan(
        user_id=user.id,
        text="Coffee near University Ave",
        lat=37.4419,
        lon=-122.1430,
        location="SRID=4326;POINT(-122.1430 37.4419)",
        starts_at=now,
        ends_at=now + timedelta(hours=2),
    )
    db_session.add(plan)
    db_session.commit()

    fetched = db_session.query(Plan).filter_by(id=plan.id).one()
    assert fetched.text == "Coffee near University Ave"
    assert fetched.user_id == user.id

def test_duplicate_email_rejected(db_session):
    db_session.add(User(email="dup@example.com", name="A"))
    db_session.commit()
    db_session.add(User(email="dup@example.com", name="B"))
    with pytest.raises(IntegrityError):
        db_session.commit()
