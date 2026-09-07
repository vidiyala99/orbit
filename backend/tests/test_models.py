import pytest
from sqlalchemy.exc import IntegrityError
from app.models import User, Person, SyncRun, EMBEDDING_DIM

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

def test_user_bio_embedding_persists(db_session):
    vector = [0.1] * EMBEDDING_DIM
    user = User(
        email="embed@example.com",
        bio_text="Building healthcare AI, raising a seed round.",
        bio_embedding=vector,
    )
    db_session.add(user)
    db_session.commit()

    fetched = db_session.query(User).filter_by(id=user.id).one()
    assert list(fetched.bio_embedding) == pytest.approx(vector)

def test_user_bio_embedding_defaults_to_none(db_session):
    user = User(email="no-embed@example.com")
    db_session.add(user)
    db_session.commit()

    fetched = db_session.query(User).filter_by(id=user.id).one()
    assert fetched.bio_embedding is None

def test_user_bio_embedding_rejects_wrong_dimension(db_session):
    user = User(email="badvec@example.com", bio_embedding=[0.1, 0.2, 0.3])
    db_session.add(user)
    with pytest.raises(Exception):
        db_session.commit()

def test_person_and_sync_run_persist(db_session):
    user = User(email="comms@example.com")
    db_session.add(user)
    db_session.commit()

    person = Person(
        user_id=user.id,
        name="Alex Rivera",
        note="Long note.",
        dm="Short DM.",
        note_payload="Long note.",
        dm_payload="Short DM.",
        event_id="burning-token",
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
