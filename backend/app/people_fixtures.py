"""Fixture people for POST /sync-runs {source: fixture}.

Fixtures-first: no LinkedIn/X scrape. note and dm carry the same facts at
different lengths so Face can treat note_payload / dm_payload as interchangeable
clipboard strings. Email is optional and only filled when we have one.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .models import Person, User
from .schemas import DEMO_EVENT_ID

# Opaque event id Face can pass to GET /events/{id}/guests and GET /people?event_id=
FIXTURE_EVENT_ID = DEMO_EVENT_ID

FIXTURE_PEOPLE: list[dict] = [
    {
        "name": "Alex Rivera",
        "role": "Partner, Westbound Ventures",
        "avatar_url": None,
        "linkedin_url": "https://www.linkedin.com/in/alex-rivera-westbound",
        "x_url": "https://x.com/alexrivera",
        "email": "alex@westbound.example",
        "where_met": "Burning Token Friday mixer, coat-check line",
        "what_talked": "Fund III seed checks for personal CRM / comms tools; clipboard drafts vs auto-DM",
        "relevance": "Writing seed checks for clipboard-first personal CRM — wants warm intros in the room",
        "invite_state": "pending",
        "pending_since_hours": 18,
        "accepted_at": None,
        "last_touch_at_hours": 18,
        "intent": "investor intro",
        "note": (
            "Met Alex Rivera (Partner, Westbound) in the coat-check line at the "
            "Burning Token Friday mixer. They just closed Fund III and are writing "
            "$250–500k seed checks for personal CRM / comms tools. Asked how we "
            "keep drafts on the clipboard instead of auto-DMing. Wants a warm intro "
            "to any founder in the room actually shipping that. Follow up Monday "
            "with a 4-line recap and the guest-list screenshot."
        ),
        "dm": (
            "Alex — great running into you at the Burning Token mixer. You mentioned "
            "Fund III seed checks for personal CRM tools and wanted founders who keep "
            "drafts on the clipboard (no auto-DM). Happy to intro you to two people "
            "here this week."
        ),
        "email_draft": None,
        "score": 0.92,
        "evidence": [
            {
                "source_id": "fixture:mixer-notes",
                "quote": "Fund III, $250–500k seed, personal CRM / comms tools",
            },
            {
                "source_id": "fixture:clipboard-ask",
                "quote": "How do you keep drafts on the clipboard instead of auto-DMing?",
            },
        ],
        "event_id": FIXTURE_EVENT_ID,
        # Needs you: both clipboard payloads + realistic LI+X flags (URLs only when true).
        "priority": "needs_you",
        "linkedin_connected": True,
        "x_interacted": True,
    },
    {
        "name": "Sam Okonkwo",
        "role": "Founder, Guestline",
        "avatar_url": None,
        "linkedin_url": None,
        "x_url": "https://x.com/samokonkwo",
        "email": None,
        "where_met": "Saturday workshop, table 4",
        "what_talked": "Luma-style guest lists that stay fixtures-first — no LinkedIn scrape",
        "relevance": "Shipping the same guest-list + clipboard-draft surface; swap CSV formats",
        "invite_state": "needs_message",
        "pending_since_hours": None,
        "accepted_at": None,
        "last_touch_at_hours": 8,
        "intent": "collab",
        "note": (
            "Sat next to Sam Okonkwo (Founder, Guestline) at Saturday workshop table 4. "
            "They're shipping a Luma-style guest list that is fixtures-first — no "
            "LinkedIn scrape. Same problem we have: people + relevance + clipboard "
            "drafts. They offered to swap CSV import formats. Send the three-column "
            "sample (name, relevance, dm) after the demo."
        ),
        "dm": (
            "Sam — still thinking about your fixtures-first guest list (no LI scrape). "
            "We have the same people + relevance + clipboard-draft shape. I'll send "
            "the three-column CSV sample after our demo."
        ),
        "email_draft": None,
        "score": 0.84,
        "evidence": [
            {
                "source_id": "fixture:workshop-table-4",
                "quote": "Fixtures-first guest list, no LinkedIn scrape",
            },
        ],
        "event_id": FIXTURE_EVENT_ID,
        "priority": "high",
        "linkedin_connected": False,
        "x_interacted": True,
    },
    {
        "name": "Riley Park",
        "role": "Recruiter, token-factory infra",
        "avatar_url": None,
        "linkedin_url": "https://www.linkedin.com/in/riley-park",
        "x_url": None,
        "email": "riley.park@example.com",
        "where_met": "Sunday coffee line",
        "what_talked": "Hiring a PM who has run event guest lists; Token Factory credits for the demo",
        "relevance": "Hiring a guest-list PM and can spare Token Factory credits",
        "invite_state": "accepted",
        "pending_since_hours": 30,
        "accepted_at_hours": 4,
        "last_touch_at_hours": 4,
        "intent": "hiring",
        "note": (
            "Riley Park (recruiter, token-factory infra) in the Sunday coffee line. "
            "Their team is hiring a PM who has actually run event guest lists, and "
            "they can spare Token Factory credits for the hackathon demo. They "
            "already accepted a follow-up. Send the one-pager and ask who on their "
            "side owns credits."
        ),
        "dm": (
            "Riley — thanks for accepting the follow-up. You mentioned a PM seat for "
            "someone who's run event guest lists, and Token Factory credits for the "
            "demo. I'll send the one-pager and ask who owns credits on your side."
        ),
        "email_draft": (
            "Hi Riley — following up from the Sunday coffee line at Burning Token. "
            "Here's the one-pager on the guest-list + clipboard-draft flow. Who on "
            "your side owns Token Factory credits?"
        ),
        "score": 0.71,
        "evidence": [
            {
                "source_id": "fixture:coffee-line",
                "quote": "PM who has run event guest lists; Token Factory credits for the demo",
            },
        ],
        "event_id": FIXTURE_EVENT_ID,
        "priority": "later",
        "linkedin_connected": True,
        "x_interacted": False,
    },
]


def _hours_ago(now: datetime, hours: int | None) -> datetime | None:
    if hours is None:
        return None
    return now - timedelta(hours=hours)


def seed_fixture_people(db: Session, user: User) -> list[Person]:
    """Check-then-create by (user_id, name, event_id). Repeat POSTs do not duplicate."""
    now = datetime.now(timezone.utc)
    seeded: list[Person] = []
    for raw in FIXTURE_PEOPLE:
        existing = db.query(Person).filter(
            Person.user_id == user.id,
            Person.name == raw["name"],
            Person.event_id == raw["event_id"],
        ).one_or_none()
        linkedin_url = raw["linkedin_url"] if raw["linkedin_connected"] else None
        x_url = raw["x_url"] if raw["x_interacted"] else None
        if existing is not None:
            existing.priority = raw["priority"]
            existing.linkedin_connected = raw["linkedin_connected"]
            existing.x_interacted = raw["x_interacted"]
            existing.linkedin_url = linkedin_url
            existing.x_url = x_url
            if not existing.note_payload:
                existing.note_payload = existing.note or raw["note"]
            if not existing.dm_payload:
                existing.dm_payload = existing.dm or raw["dm"]
            seeded.append(existing)
            continue

        note = raw["note"]
        dm = raw["dm"]
        person = Person(
            user_id=user.id,
            name=raw["name"],
            role=raw["role"],
            avatar_url=raw["avatar_url"],
            linkedin_url=linkedin_url,
            x_url=x_url,
            email=raw["email"],
            where_met=raw["where_met"],
            what_talked=raw["what_talked"],
            relevance=raw["relevance"],
            invite_state=raw["invite_state"],
            pending_since=_hours_ago(now, raw.get("pending_since_hours")),
            accepted_at=_hours_ago(now, raw.get("accepted_at_hours")),
            last_touch_at=_hours_ago(now, raw.get("last_touch_at_hours")),
            intent=raw["intent"],
            note=note,
            dm=dm,
            email_draft=raw["email_draft"],
            score=raw["score"],
            evidence=raw["evidence"],
            # Same facts as note/dm, stored as clipboard strings Face copies.
            note_payload=note,
            dm_payload=dm,
            event_id=raw["event_id"],
            priority=raw["priority"],
            linkedin_connected=raw["linkedin_connected"],
            x_interacted=raw["x_interacted"],
        )
        db.add(person)
        seeded.append(person)
    db.flush()
    return seeded
