"""Seed the demo account with a real Luma event and rank it (demo slice).

Reads a saved get-guest-list JSON, seeds the event + attendees for the demo
user, sets their Focus, and ranks everyone against it through the metered
gateway. Run: python -m app.seed_demo <guests.json>
"""
import sys
from datetime import datetime, timezone

from openai import OpenAI

from .config import settings
from .db import SessionLocal
from .demo import get_or_create_demo_user
from .llm.gateway import LLMGateway
from .llm.openai_provider import OpenAIProvider
from .luma_ingest import seed_event_guests
from .matchmaking import rank_event

EVENT_TITLE = "build fridays sf x sentry"
FOCUS_ROLE = "AI engineer"
FOCUS_STRUGGLE = "looking for AI engineering roles"


def main(path: str) -> int:
    import json
    guests = json.load(open(path, encoding="utf-8"))["entries"]
    db = SessionLocal()
    try:
        user = get_or_create_demo_user(db)
        user.focus_role, user.focus_struggle = FOCUS_ROLE, FOCUS_STRUGGLE
        db.commit()

        event, created = seed_event_guests(
            db, user, title=EVENT_TITLE, guests=guests,
            source_url="https://luma.com/pqr8u92i", location="Sentry, San Francisco",
            starts_at=datetime(2026, 9, 12, 17, tzinfo=timezone.utc),
        )
        print(f"seeded {len(created)} new attendees (event total {event.guest_count})")

        gateway = LLMGateway(db, OpenAIProvider(OpenAI(api_key=settings.openai_api_key)))
        run = rank_event(db, gateway, user, event)
        meter = gateway.run_meter(run.id)
        print(f"ranked: {meter.status}, {meter.llm_calls} calls, "
              f"tokens in={meter.tokens_in} cached={meter.tokens_cached} out={meter.tokens_out}")

        from .models import Person
        top = (db.query(Person).filter(Person.event_id == event.id)
               .order_by(Person.score.desc()).limit(8).all())
        print("\nTop cards:")
        for p in top:
            print(f"  [{p.priority}] {p.name} ({p.score:.3f}) — {p.relevance or p.role or ''}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
