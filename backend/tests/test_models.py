from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError
from app.models import User, Person, SyncRun, Event

def test_duplicate_email_rejected(db_session):
    db_session.add(User(email="dup@example.com"))
    db_session.commit()
    db_session.add(User(email="dup@example.com"))
    with pytest.raises(IntegrityError):
        db_session.commit()

def test_person_and_sync_run_persist(db_session):
    user = User(email="comms@example.com")
    db_session.add(user)
    db_session.commit()

    event = Event(
        user_id=user.id,
        title="Blinkko Launch Party",
        starts_at=datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc),
    )
    db_session.add(event)
    db_session.commit()

    person = Person(
        user_id=user.id,
        name="Alex Rivera",
        note="Long note.",
        dm="Short DM.",
        note_payload="Long note.",
        dm_payload="Short DM.",
        event_id=event.id,
        evidence=[{"source_id": "fixture:test", "quote": "hello"}],
        score=0.9,
        priority="needs_you",
        linkedin_connected=True,
        x_interacted=False,
    )
    run = SyncRun(user_id=user.id, source="fixture", status="ok")
    db_session.add_all([person, run])
    db_session.commit()

    fetched = db_session.query(Person).filter_by(id=person.id).one()
    assert fetched.name == "Alex Rivera"
    assert fetched.note_payload == "Long note."
    assert fetched.evidence[0]["source_id"] == "fixture:test"
    assert fetched.priority == "needs_you"
    assert fetched.linkedin_connected is True
    assert fetched.x_interacted is False
    assert db_session.query(SyncRun).filter_by(id=run.id).one().source == "fixture"


def test_event_belongs_to_one_user_and_person_links_to_it(db_session):
    user = User(email="events-test@example.com")
    db_session.add(user)
    db_session.flush()

    event = Event(
        user_id=user.id,
        title="Blinkko Launch Party",
        starts_at=datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc),
    )
    db_session.add(event)
    db_session.flush()

    person = Person(user_id=user.id, name="Shuo Chen", event_id=event.id)
    db_session.add(person)
    db_session.commit()

    fetched = db_session.query(Person).filter(Person.id == person.id).one()
    assert fetched.event_id == event.id
    assert db_session.query(Event).filter(Event.id == event.id).one().title == "Blinkko Launch Party"
