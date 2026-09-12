"""Ranking attendees against the Focus, with the LLM provider faked."""
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.llm.gateway import LLMGateway
from app.llm.provider import EmbeddingReply, StructuredReply, Usage
from app.matchmaking import rank_event
from app.models import Event, Person, User


@dataclass
class ScriptedProvider:
    """Embeds by a fixed keyword score so ranking is deterministic in tests."""
    replies: list = field(default_factory=list)

    def structured(self, **kw):
        return self.replies.pop(0)

    def embed(self, *, model, texts):
        # 2-D vectors: axis 0 = "eval" affinity, axis 1 = filler. The Focus and
        # the eval person point the same way, so cosine ranks them together.
        vecs = []
        for t in texts:
            vecs.append([1.0, 0.1] if "eval" in t.lower() else [0.1, 1.0])
        return EmbeddingReply(vectors=vecs, usage=Usage(input_tokens=len(texts), cached_tokens=0, output_tokens=0))


def _seed(db):
    user = User(email="rank@example.com", focus_role="Founder, agent eval tooling",
                focus_struggle="finding design partners who run evals in production")
    db.add(user)
    db.commit()
    event = Event(user_id=user.id, title="build fridays", starts_at=datetime(2026, 9, 12, tzinfo=timezone.utc))
    db.add(event)
    db.flush()
    match = Person(user_id=user.id, event_id=event.id, name="Eval Person", role="building eval infra")
    other = Person(user_id=user.id, event_id=event.id, name="Other Person", role="marketing lead")
    db.add_all([match, other])
    db.commit()
    return user, event, match, other


def test_ranking_scores_the_focus_match_higher_and_writes_why_meet(db_session):
    user, event, match, other = _seed(db_session)
    provider = ScriptedProvider(replies=[
    StructuredReply(
        '{"items": [{"name": "Eval Person", "why": "Runs evals in prod.", "signals": ["Looking for beta testers", "Design partner"]}]}',
        Usage(input_tokens=50, cached_tokens=0, output_tokens=10),
    ),
    ])
    gateway = LLMGateway(db_session, provider)

    run = rank_event(db_session, gateway, user, event)

    db_session.refresh(match)
    db_session.refresh(other)
    assert match.score > other.score
    assert match.priority == "needs_you"
    assert match.relevance == "Runs evals in prod."
    assert match.signals == ["Looking for beta testers", "Design partner", "Starting new startup"]
    # The run is metered: one embed + one why-meet completion.
    meter = gateway.run_meter(run.id)
    assert meter.status == "succeeded"
    assert [c.task for c in meter.calls] == ["profile_embedding", "why_meet"]


def test_ranking_a_focusless_user_is_refused(db_session):
    user = User(email="nofocus@example.com")
    db_session.add(user)
    db_session.commit()
    event = Event(user_id=user.id, title="x", starts_at=datetime(2026, 9, 12, tzinfo=timezone.utc))
    db_session.add(event)
    db_session.commit()
    gateway = LLMGateway(db_session, ScriptedProvider())

    import pytest
    with pytest.raises(ValueError):
        rank_event(db_session, gateway, user, event)
