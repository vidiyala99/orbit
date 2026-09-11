"""Orbit's only path to an LLM (ADR-0003).

Every call names a Task. The routing table maps the task to a tier and the
tier to a model, and every call is metered against an ActionRun.
"""
from __future__ import annotations

import enum
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from ..config import settings
from ..models import ActionRun, LLMCall
from .provider import LLMProvider, ProviderError, Usage

T = TypeVar("T", bound=BaseModel)

RunKind = Literal["enrichment", "focus", "matchmaking", "outreach", "smoke"]
RunMode = Literal["reasoned", "replayed"]
RunStatus = Literal["succeeded", "failed"]
CallOutcome = Literal["ok", "schema_invalid", "provider_error"]


class Tier(str, enum.Enum):
    FAST = "fast"
    SMART = "smart"
    EMBED = "embed"


class Task(str, enum.Enum):
    STRUGGLE_OPTIONS = "struggle_options"
    WHY_MEET = "why_meet"
    REPLAY_SLOT_FILL = "replay_slot_fill"
    OUTREACH_DRAFT = "outreach_draft"
    PROFILE_EMBEDDING = "profile_embedding"
    # Run by ScrapeGraphAI, which calls the provider itself (see record_external_usage).
    PROFILE_EXTRACTION = "profile_extraction"


ROUTES: dict[Task, Tier] = {
    Task.STRUGGLE_OPTIONS: Tier.FAST,
    Task.WHY_MEET: Tier.FAST,
    Task.REPLAY_SLOT_FILL: Tier.FAST,
    Task.OUTREACH_DRAFT: Tier.SMART,
    Task.PROFILE_EMBEDDING: Tier.EMBED,
    Task.PROFILE_EXTRACTION: Tier.FAST,
}


def _tier_for(task: Task) -> Tier:
    """The routed tier. LLM_ROUTES can move a task without a code change."""
    override = settings.llm_routes.get(task.value)
    return Tier(override) if override else ROUTES[task]


def _model_and_effort(tier: Tier) -> tuple[str, str | None]:
    # Read on every call, so env overrides (LLM_FAST_MODEL, ...) always apply.
    return {
        Tier.FAST: (settings.llm_fast_model, settings.llm_fast_reasoning_effort),
        Tier.SMART: (settings.llm_smart_model, settings.llm_smart_reasoning_effort),
        Tier.EMBED: (settings.llm_embed_model, None),
    }[tier]


_NO_USAGE = Usage(input_tokens=0, cached_tokens=0, output_tokens=0)


def _elapsed_ms(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


def _over_budget(run: ActionRun) -> bool:
    return run.llm_calls >= run.max_llm_calls or run.tokens_in + run.tokens_out >= run.max_tokens


@dataclass(frozen=True)
class Prompt:
    """Laid out static-first so the provider's prefix cache can hit."""
    # Identical for every call of the task.
    instructions: str
    # Stable for a user or event: their Focus, the event summary.
    context: tuple[str, ...] = ()
    # Changes per call (the Attendee batch). Always last.
    variable: str = ""

    def input(self) -> str:
        return "\n\n".join(part for part in (*self.context, self.variable) if part)


@dataclass(frozen=True)
class Completion(Generic[T]):
    value: T


@dataclass(frozen=True)
class Embeddings:
    vectors: list[list[float]]


@dataclass(frozen=True)
class LLMFailure:
    """A call that produced no usable value. Callers fall back (e.g. a template)."""
    reason: Literal["schema_invalid", "budget_exceeded", "provider_error"]


@dataclass(frozen=True)
class CallRecord:
    task: str
    tier: str
    model: str
    outcome: str
    input_tokens: int
    cached_tokens: int
    output_tokens: int
    latency_ms: int


@dataclass(frozen=True)
class RunMeter:
    run_id: uuid.UUID
    status: str
    llm_calls: int
    tokens_in: int
    tokens_cached: int
    tokens_out: int
    duration_ms: int | None
    calls: tuple[CallRecord, ...]


class LLMGateway:
    def __init__(self, db: Session, provider: LLMProvider):
        self._db = db
        self._provider = provider

    def start_run(
        self, *, user_id: uuid.UUID, kind: RunKind, mode: RunMode,
        max_llm_calls: int | None = None, max_tokens: int | None = None,
    ) -> ActionRun:
        run = ActionRun(
            user_id=user_id, kind=kind, mode=mode, status="running",
            max_llm_calls=max_llm_calls if max_llm_calls is not None else settings.llm_run_max_calls,
            max_tokens=max_tokens if max_tokens is not None else settings.llm_run_max_tokens,
        )
        self._db.add(run)
        self._db.commit()
        return run

    def finish_run(self, run: ActionRun, *, status: RunStatus) -> None:
        finished_at = datetime.now(timezone.utc)
        run.status = status
        run.finished_at = finished_at
        run.duration_ms = round((finished_at - run.started_at).total_seconds() * 1000)
        self._db.commit()

    def complete(
        self, run: ActionRun, task: Task, schema: type[T], prompt: Prompt,
    ) -> Completion[T] | LLMFailure:
        tier = _tier_for(task)
        if _over_budget(run):
            return LLMFailure(reason="budget_exceeded")
        result = self._attempt(run, task, tier, schema, prompt)
        if result == LLMFailure(reason="schema_invalid") and tier is Tier.FAST:
            # The budget is the hard stop, so it wins over reporting the bad output.
            if _over_budget(run):
                return LLMFailure(reason="budget_exceeded")
            # Structured outputs make this rare: one retry on the stronger model.
            # A provider error isn't retried here: a stronger model won't fix an outage.
            result = self._attempt(run, task, Tier.SMART, schema, prompt)
        return result if isinstance(result, LLMFailure) else Completion(result)

    def _attempt(
        self, run: ActionRun, task: Task, tier: Tier, schema: type[T], prompt: Prompt,
    ) -> T | LLMFailure:
        model, effort = _model_and_effort(tier)
        started = time.perf_counter()
        try:
            reply = self._provider.structured(
                model=model,
                instructions=prompt.instructions,
                input=prompt.input(),
                schema=schema,
                # Per user and task, as OpenAI recommends for cache accounting.
                cache_key=f"{run.user_id}:{task.value}",
                reasoning_effort=effort,
            )
        except ProviderError:
            self._record(run, task.value, tier.value, model, "provider_error", _NO_USAGE, _elapsed_ms(started))
            return LLMFailure(reason="provider_error")
        try:
            value = schema.model_validate_json(reply.text)
        except ValidationError:
            self._record(run, task.value, tier.value, model, "schema_invalid", reply.usage, _elapsed_ms(started))
            return LLMFailure(reason="schema_invalid")
        self._record(run, task.value, tier.value, model, "ok", reply.usage, _elapsed_ms(started))
        return value

    def embed(self, run: ActionRun, task: Task, texts: list[str]) -> Embeddings | LLMFailure:
        if _over_budget(run):
            return LLMFailure(reason="budget_exceeded")
        tier = _tier_for(task)
        model, _ = _model_and_effort(tier)
        started = time.perf_counter()
        try:
            reply = self._provider.embed(model=model, texts=texts)
        except ProviderError:
            self._record(run, task.value, tier.value, model, "provider_error", _NO_USAGE, _elapsed_ms(started))
            return LLMFailure(reason="provider_error")
        self._record(run, task.value, tier.value, model, "ok", reply.usage, _elapsed_ms(started))
        return Embeddings(vectors=reply.vectors)

    def model_for(self, task: Task) -> str:
        """The routed model, for tools that call the provider themselves."""
        return _model_and_effort(_tier_for(task))[0]

    def record_external_usage(
        self, run: ActionRun, task: Task, *, model: str, usage: Usage, latency_ms: int,
    ) -> None:
        """Meter a call another tool made (e.g. ScrapeGraphAI) against this run."""
        self._record(run, task.value, _tier_for(task).value, model, "ok", usage, latency_ms)

    def run_meter(self, run_id: uuid.UUID) -> RunMeter:
        run = self._db.get(ActionRun, run_id)
        if run is None:
            raise LookupError(f"no action run {run_id}")
        calls = self._db.query(LLMCall).filter(LLMCall.run_id == run_id).order_by(LLMCall.id).all()
        return RunMeter(
            run_id=run.id,
            status=run.status,
            llm_calls=run.llm_calls,
            tokens_in=run.tokens_in,
            tokens_cached=run.tokens_cached,
            tokens_out=run.tokens_out,
            duration_ms=run.duration_ms,
            calls=tuple(
                CallRecord(
                    task=c.task, tier=c.tier, model=c.model, outcome=c.outcome,
                    input_tokens=c.input_tokens, cached_tokens=c.cached_tokens,
                    output_tokens=c.output_tokens, latency_ms=c.latency_ms,
                )
                for c in calls
            ),
        )

    def _record(
        self, run: ActionRun, task: str, tier: str, model: str, outcome: CallOutcome,
        usage: Usage, latency_ms: int,
    ) -> None:
        self._db.add(LLMCall(
            run_id=run.id, task=task, tier=tier, model=model, outcome=outcome,
            input_tokens=usage.input_tokens, cached_tokens=usage.cached_tokens,
            output_tokens=usage.output_tokens,
            latency_ms=latency_ms,
        ))
        run.llm_calls += 1
        run.tokens_in += usage.input_tokens
        run.tokens_cached += usage.cached_tokens
        run.tokens_out += usage.output_tokens
        self._db.commit()
