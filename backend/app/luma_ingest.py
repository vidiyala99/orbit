"""Turn a Luma guest list into Orbit Event + Person rows.

Field mapping is pinned against the live api.luma.com `event/get-guest-list`
shape (see luma-guest-list-via-browser memory), NOT the stale api.lu.ma
guesses in luma_client.py. Fetching the guests needs a logged-in browser
session; this module only maps and persists what that fetch returns.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from .models import Event, Person, User

# Luma serves these when a guest has uploaded no photo. They look bad on a
# card, so we drop them and let the UI render a clean initials avatar instead.
_DEFAULT_AVATAR_PREFIX = "https://cdn.lu.ma/avatars-default"


def _linkedin_url(handle: str | None) -> str | None:
    handle = (handle or "").strip()
    if not handle:
        return None
    if handle.startswith("http"):
        return handle
    # Luma stores "/in/vidiyala99" or "vidiyala99" or "in/vidiyala99".
    handle = handle.lstrip("/")
    if not handle.startswith("in/"):
        handle = f"in/{handle}"
    return f"https://www.linkedin.com/{handle}"


def _handle_url(base: str, handle: str | None) -> str | None:
    handle = (handle or "").strip().lstrip("@")
    if not handle:
        return None
    if handle.startswith("http"):
        return handle
    return f"{base}/{handle}"


def _real_avatar(url: str | None) -> str | None:
    url = (url or "").strip()
    if not url or url.startswith(_DEFAULT_AVATAR_PREFIX):
        return None
    return url


def person_fields_from_guest(entry: dict) -> dict | None:
    """Map one get-guest-list entry to Person constructor kwargs.

    Returns None for an entry with no usable name (nothing to show on a card).
    """
    user = entry.get("user") or entry
    name = (user.get("name") or " ".join(
        p for p in (user.get("first_name"), user.get("last_name")) if p
    ) or "").strip()
    if not name:
        return None
    bio = (user.get("bio_short") or "").strip() or None
    return {
        "name": name,
        # Luma guests carry no job title; the short bio is the best subtitle we
        # have until enrichment (ticket 05) fetches a real headline.
        "role": bio[:160] if bio else None,
        "avatar_url": _real_avatar(user.get("avatar_url")),
        "linkedin_url": _linkedin_url(user.get("linkedin_handle")),
        "x_url": _handle_url("https://x.com", user.get("twitter_handle")),
        # Full bio kept for the ranking step to embed; not shown raw.
        "what_talked": bio,
    }


def seed_event_guests(
    db: Session,
    user: User,
    *,
    title: str,
    guests: list[dict],
    source_url: str | None = None,
    location: str | None = None,
    starts_at: datetime,
) -> tuple[Event, list[Person]]:
    """Create (or reuse) the event and its Person rows for this user.

    Check-then-create by (user_id, title) for the event and (event_id, name)
    for people, so re-running the seed does not duplicate.
    """
    event = (
        db.query(Event)
        .filter(Event.user_id == user.id, Event.title == title)
        .one_or_none()
    )
    if event is None:
        event = Event(user_id=user.id, title=title, source_url=source_url,
                      location=location, starts_at=starts_at)
        db.add(event)
        db.flush()

    existing = {
        p.name for p in db.query(Person.name).filter(Person.event_id == event.id).all()
    }
    created: list[Person] = []
    for entry in guests:
        fields = person_fields_from_guest(entry)
        if fields is None or fields["name"] in existing:
            continue
        person = Person(user_id=user.id, event_id=event.id, **fields)
        db.add(person)
        created.append(person)
        existing.add(fields["name"])

    db.flush()  # so the count below sees the rows just added
    event.guest_count = db.query(Person).filter(Person.event_id == event.id).count()
    event.synced_at = datetime.now(starts_at.tzinfo)
    db.commit()
    return event, created
