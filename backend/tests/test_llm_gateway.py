"""The LLM gateway is Orbit's only path to a model (ADR-0003).

Seam: the gateway's public API. The provider is faked at the boundary, so
these tests pin routing, escalation, budgets, and metering, not OpenAI.
"""
from dataclasses import dataclass, field

from pydantic import BaseModel

from app.config import settings
from app.llm.gateway import Completion, Embeddings, LLMFailure, LLMGateway, Prompt, Task
from app.llm.provider import EmbeddingReply, ProviderError, StructuredReply, Usage
from app.models import User


class WhyMeet(BaseModel):
    reasons: list[str]


@dataclass
class FakeProvider:
    """Replays scripted replies in order and records what it was sent."""
    replies: list = field(default_factory=list)
    requests: list[dict] = field(default_factory=list)
    embeddings: list = field(default_factory=list)
    embed_requests: list[dict] = field(default_factory=list)

    def structured(self, *, model, instructions, input, schema, cache_key, reasoning_effort):
        self.requests.append({
            "model": model, "instructions": instructions, "input": input,
            "schema": schema, "cache_key": cache_key, "reasoning_effort": reasoning_effort,
        })
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply

    def embed(self, *, model, texts):
        self.embed_requests.append({"model": model, "texts": texts})
        return self.embeddings.pop(0)


def _user(db_session) -> User:
    user = User(email="gateway@example.com")
    db_session.add(user)
    db_session.commit()
    return user


WHY_MEET_PROMPT = Prompt(
    instructions="Say why these two should meet.",
    context=("Focus: founder, agent eval tooling", "Event: NERDCONF SF, infra crowd"),
    variable="Attendee: Alex Chen, Founder, Render",
)


def test_fast_task_goes_to_the_fast_model_static_first_and_is_metered(db_session):
    user = _user(db_session)
    provider = FakeProvider(replies=[
        StructuredReply('{"reasons": ["both ship eval tooling"]}',
                        Usage(input_tokens=1200, cached_tokens=1024, output_tokens=40)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned")

    result = gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert result == Completion(WhyMeet(reasons=["both ship eval tooling"]))
    sent = provider.requests[0]
    assert sent["model"] == "gpt-5.6-luna"
    assert sent["cache_key"] == f"{user.id}:why_meet"
    assert sent["instructions"] == "Say why these two should meet."
    # Stable context first, the per-call Attendee last, so prefix caching can hit.
    assert sent["input"] == (
        "Focus: founder, agent eval tooling\n\n"
        "Event: NERDCONF SF, infra crowd\n\n"
        "Attendee: Alex Chen, Founder, Render"
    )
    meter = gateway.run_meter(run.id)
    assert (meter.llm_calls, meter.tokens_in, meter.tokens_cached, meter.tokens_out) == (1, 1200, 1024, 40)
    assert [(c.task, c.model, c.outcome) for c in meter.calls] == [("why_meet", "gpt-5.6-luna", "ok")]


def test_schema_invalid_fast_output_retries_once_on_the_smart_model(db_session):
    user = _user(db_session)
    provider = FakeProvider(replies=[
        StructuredReply('{"reasons": "not a list"}', Usage(input_tokens=500, cached_tokens=0, output_tokens=10)),
        StructuredReply('{"reasons": ["shared eval infra"]}', Usage(input_tokens=500, cached_tokens=0, output_tokens=12)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned")

    result = gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert result == Completion(WhyMeet(reasons=["shared eval infra"]))
    assert [r["model"] for r in provider.requests] == ["gpt-5.6-luna", "gpt-5.6-terra"]
    meter = gateway.run_meter(run.id)
    assert [(c.model, c.outcome) for c in meter.calls] == [
        ("gpt-5.6-luna", "schema_invalid"), ("gpt-5.6-terra", "ok"),
    ]
    assert (meter.llm_calls, meter.tokens_out) == (2, 22)


def test_invalid_output_on_both_tiers_returns_a_typed_failure(db_session):
    user = _user(db_session)
    provider = FakeProvider(replies=[
        StructuredReply('{"reasons": 1}', Usage(input_tokens=500, cached_tokens=0, output_tokens=5)),
        StructuredReply('{"reasons": 2}', Usage(input_tokens=500, cached_tokens=0, output_tokens=5)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned")

    result = gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert result == LLMFailure(reason="schema_invalid")
    assert len(provider.requests) == 2  # one retry, never a loop


def test_a_run_at_its_call_budget_stops_calling_the_provider(db_session):
    user = _user(db_session)
    provider = FakeProvider(replies=[
        StructuredReply('{"reasons": ["a"]}', Usage(input_tokens=100, cached_tokens=0, output_tokens=5)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned", max_llm_calls=1)
    assert isinstance(gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT), Completion)

    result = gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert result == LLMFailure(reason="budget_exceeded")
    assert len(provider.requests) == 1
    assert gateway.run_meter(run.id).llm_calls == 1


def test_embeddings_go_to_the_embedding_model_and_are_metered(db_session):
    user = _user(db_session)
    provider = FakeProvider(embeddings=[
        EmbeddingReply(vectors=[[0.1, 0.2], [0.3, 0.4]],
                       usage=Usage(input_tokens=12, cached_tokens=0, output_tokens=0)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="enrichment", mode="reasoned")

    result = gateway.embed(run, Task.PROFILE_EMBEDDING, ["Alex Chen, Founder, Render", "Priya Raman, ML Engineer"])

    assert result == Embeddings(vectors=[[0.1, 0.2], [0.3, 0.4]])
    assert provider.embed_requests == [{
        "model": "text-embedding-3-small",
        "texts": ["Alex Chen, Founder, Render", "Priya Raman, ML Engineer"],
    }]
    meter = gateway.run_meter(run.id)
    assert [(c.task, c.tier, c.model) for c in meter.calls] == [
        ("profile_embedding", "embed", "text-embedding-3-small"),
    ]
    assert (meter.llm_calls, meter.tokens_in) == (1, 12)


def test_an_external_extractor_uses_the_routed_model_and_reports_into_the_meter(db_session):
    """ScrapeGraphAI calls OpenAI itself; its usage must still land in the run's meter."""
    user = _user(db_session)
    gateway = LLMGateway(db_session, FakeProvider())
    run = gateway.start_run(user_id=user.id, kind="enrichment", mode="reasoned")

    model = gateway.model_for(Task.PROFILE_EXTRACTION)
    gateway.record_external_usage(
        run, Task.PROFILE_EXTRACTION, model=model,
        usage=Usage(input_tokens=3000, cached_tokens=1024, output_tokens=300), latency_ms=2100,
    )

    assert model == "gpt-5.6-luna"
    meter = gateway.run_meter(run.id)
    assert (meter.llm_calls, meter.tokens_in, meter.tokens_cached, meter.tokens_out) == (1, 3000, 1024, 300)
    assert [(c.task, c.tier, c.model, c.latency_ms) for c in meter.calls] == [
        ("profile_extraction", "fast", "gpt-5.6-luna", 2100),
    ]


def test_a_provider_error_is_a_typed_failure_and_still_counts_as_a_call(db_session):
    user = _user(db_session)
    provider = FakeProvider(replies=[ProviderError("503 from upstream")])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned")

    result = gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert result == LLMFailure(reason="provider_error")
    assert len(provider.requests) == 1  # no escalation: a stronger model won't fix an outage
    meter = gateway.run_meter(run.id)
    assert [(c.model, c.outcome) for c in meter.calls] == [("gpt-5.6-luna", "provider_error")]
    assert meter.llm_calls == 1


def test_finishing_a_run_records_its_status_and_duration(db_session):
    user = _user(db_session)
    gateway = LLMGateway(db_session, FakeProvider())
    run = gateway.start_run(user_id=user.id, kind="enrichment", mode="reasoned")

    gateway.finish_run(run, status="succeeded")

    meter = gateway.run_meter(run.id)
    assert meter.status == "succeeded"
    assert meter.duration_ms is not None and meter.duration_ms >= 0


def test_model_ids_are_defaults_that_config_can_override(db_session, monkeypatch):
    """Model ids come from settings (env LLM_FAST_MODEL etc.), read on every call."""
    monkeypatch.setattr(settings, "llm_fast_model", "gpt-5.6-luna-2026-09-01")
    user = _user(db_session)
    provider = FakeProvider(replies=[
        StructuredReply('{"reasons": ["a"]}', Usage(input_tokens=10, cached_tokens=0, output_tokens=2)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned")

    gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert provider.requests[0]["model"] == "gpt-5.6-luna-2026-09-01"


def test_a_task_can_be_rerouted_to_another_tier_by_config(db_session, monkeypatch):
    """LLM_ROUTES='{"why_meet": "smart"}' moves a task without a code change."""
    monkeypatch.setattr(settings, "llm_routes", {"why_meet": "smart"}, raising=False)
    user = _user(db_session)
    provider = FakeProvider(replies=[
        StructuredReply('{"reasons": ["a"]}', Usage(input_tokens=10, cached_tokens=0, output_tokens=2)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned")

    gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert provider.requests[0]["model"] == "gpt-5.6-terra"
    assert gateway.run_meter(run.id).calls[0].tier == "smart"


def test_a_run_at_its_token_budget_stops_calling_the_provider(db_session):
    user = _user(db_session)
    provider = FakeProvider(replies=[
        StructuredReply('{"reasons": ["a"]}', Usage(input_tokens=900, cached_tokens=0, output_tokens=100)),
    ])
    gateway = LLMGateway(db_session, provider)
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned", max_tokens=1000)
    gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    result = gateway.complete(run, Task.WHY_MEET, WhyMeet, WHY_MEET_PROMPT)

    assert result == LLMFailure(reason="budget_exceeded")
    assert len(provider.requests) == 1
