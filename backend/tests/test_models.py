from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy.exc import IntegrityError
from app.models import User, Plan, Presence, Thread, Stamp, FollowUp

def test_create_user_and_plan(db_session):
    user = User(email="priya@example.com")
    db_session.add(user)
    db_session.commit()

    now = datetime.now(timezone.utc)
    plan = Plan(
        user_id=user.id,
        activity="coffee",
        openness="open_to_chat",
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
    db_session.add(User(email="dup@example.com"))
    db_session.commit()
    db_session.add(User(email="dup@example.com"))
    with pytest.raises(IntegrityError):
        db_session.commit()

def test_user_bio_and_intent_tags_default_to_none(db_session):
    user = User(email="blank@example.com")
    db_session.add(user)
    db_session.commit()

    fetched = db_session.query(User).filter_by(id=user.id).one()
    assert fetched.bio_text is None
    assert fetched.intent_tags is None

def test_user_bio_and_intent_tags_persist(db_session):
    user = User(
        email="priya-bio@example.com",
        bio_text="Building healthcare AI, raising a seed round.",
        intent_tags=["co_founder", "customers"],
    )
    db_session.add(user)
    db_session.commit()

    fetched = db_session.query(User).filter_by(id=user.id).one()
    assert fetched.bio_text == "Building healthcare AI, raising a seed round."
    assert fetched.intent_tags == ["co_founder", "customers"]

def test_presence_persists_with_expiry(db_session):
    user = User(email="presence@example.com")
    db_session.add(user)
    db_session.commit()

    now = datetime.now(timezone.utc)
    presence = Presence(
        user_id=user.id,
        lat=37.4419,
        lon=-122.1430,
        location="SRID=4326;POINT(-122.1430 37.4419)",
        started_at=now,
        expires_at=now + timedelta(hours=2),
    )
    db_session.add(presence)
    db_session.commit()

    fetched = db_session.query(Presence).filter_by(id=presence.id).one()
    assert fetched.user_id == user.id
    assert fetched.expires_at > fetched.started_at

def test_followup_defaults_to_pending(db_session):
    user_a = User(email="fu-a@example.com")
    user_b = User(email="fu-b@example.com")
    db_session.add_all([user_a, user_b])
    db_session.commit()

    thread = Thread(user_a_id=user_a.id, user_b_id=user_b.id)
    db_session.add(thread)
    db_session.commit()

    stamp = Stamp(thread_id=thread.id, user_a_confirmed=True, user_b_confirmed=True)
    db_session.add(stamp)
    db_session.commit()

    now = datetime.now(timezone.utc)
    followup = FollowUp(
        stamp_id=stamp.id,
        note="Wants intro to a hospital system contact",
        remind_at=now + timedelta(days=3),
    )
    db_session.add(followup)
    db_session.commit()

    fetched = db_session.query(FollowUp).filter_by(id=followup.id).one()
    assert fetched.stamp_id == stamp.id
    assert fetched.note == "Wants intro to a hospital system contact"
    assert fetched.status == "pending"
