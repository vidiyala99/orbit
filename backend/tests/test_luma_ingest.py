"""Mapping a live Luma guest entry to a Person, pinned to the real API shape."""
from datetime import datetime, timezone

from app.luma_ingest import person_fields_from_guest, seed_event_guests
from app.models import Person, User


def _guest(**user_fields) -> dict:
    base = {"name": "Alex Chen", "first_name": "Alex", "last_name": "Chen",
            "avatar_url": "https://images.lumacdn.com/avatars/ov/abc",
            "linkedin_handle": "/in/alexchen", "twitter_handle": "alexc",
            "bio_short": "Building agent eval tooling"}
    base.update(user_fields)
    return {"api_id": "usr-1", "user": base}


def test_handles_and_photo_map_to_urls():
    f = person_fields_from_guest(_guest())
    assert f["name"] == "Alex Chen"
    assert f["linkedin_url"] == "https://www.linkedin.com/in/alexchen"
    assert f["x_url"] == "https://x.com/alexc"
    assert f["avatar_url"] == "https://images.lumacdn.com/avatars/ov/abc"
    assert f["role"] == "Building agent eval tooling"


def test_bare_linkedin_handle_gets_the_in_prefix():
    assert person_fields_from_guest(_guest(linkedin_handle="alexchen"))["linkedin_url"] == (
        "https://www.linkedin.com/in/alexchen"
    )


def test_default_luma_avatar_is_dropped_so_the_ui_shows_initials():
    f = person_fields_from_guest(_guest(avatar_url="https://cdn.lu.ma/avatars-default/avatar_3.png"))
    assert f["avatar_url"] is None


def test_missing_handles_and_bio_are_none_not_broken_urls():
    f = person_fields_from_guest(_guest(linkedin_handle=None, twitter_handle="", bio_short=None))
    assert f["linkedin_url"] is None
    assert f["x_url"] is None
    assert f["role"] is None


def test_entry_with_no_name_is_skipped():
    assert person_fields_from_guest({"user": {"name": "", "first_name": "", "last_name": ""}}) is None


def test_seed_is_idempotent_and_creates_people(db_session):
    user = User(email="seed@example.com")
    db_session.add(user)
    db_session.commit()
    guests = [_guest(name="Alex Chen"), _guest(name="Priya Raman", linkedin_handle="/in/priya")]

    event, created = seed_event_guests(
        db_session, user, title="build fridays", guests=guests,
        starts_at=datetime(2026, 9, 12, tzinfo=timezone.utc),
    )
    assert len(created) == 2
    assert event.guest_count == 2

    _, again = seed_event_guests(
        db_session, user, title="build fridays", guests=guests,
        starts_at=datetime(2026, 9, 12, tzinfo=timezone.utc),
    )
    assert again == []
    assert db_session.query(Person).filter(Person.event_id == event.id).count() == 2
