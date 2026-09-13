"""Rank an event's attendees against the user's Focus (ticket 09, demo slice).

ADR-0003 keeps ranking deterministic and uses the LLM only to write text a
human reads. Here: embeddings score every attendee against the Focus (one
metered embed call), then one fast-tier call writes "why meet" for just the
top cards. Full graph/hotdata boosts (tickets 07/09) layer on later.
"""
from __future__ import annotations

import math

from pydantic import BaseModel
from sqlalchemy.orm import Session

from .hiring_titles import hiring_title_boost
from .llm.gateway import Completion, Embeddings, LLMGateway, Prompt, Task
from .models import ActionRun, Event, Person, User
from .signals import SIGNAL_VOCAB, infer_signals, merge_signals, normalize_signals

# How many top-ranked attendees get a written "why meet" and land in the
# high-priority buckets. The rest are ranked but not LLM-annotated (ADR: don't
# spend calls on people the user isn't about to see).
_WHY_MEET_TOP_N = 12
_NEEDS_YOU = 5


class _WhyMeetItem(BaseModel):
    name: str
    why: str
    signals: list[str] = []


class _WhyMeetBatch(BaseModel):
    items: list[_WhyMeetItem]


def _focus_text(user: User) -> str:
    parts = [user.focus_role or "", user.focus_struggle or ""]
    return ". ".join(p.strip() for p in parts if p and p.strip())


def _person_text(p: Person) -> str:
    return ", ".join(x for x in (p.name, p.role, p.what_talked) if x)


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def rank_event(db: Session, gateway: LLMGateway, user: User, event: Event) -> ActionRun:
    """Score every attendee, set priority buckets, and write why-meet for the
    top cards. Returns the metered run.
    """
    focus = _focus_text(user)
    if not focus:
        raise ValueError("user has no Focus set; cannot rank")

    people = (
        db.query(Person)
        .filter(Person.event_id == event.id, Person.user_id == user.id)
        .all()
    )
    run = gateway.start_run(user_id=user.id, kind="matchmaking", mode="reasoned")
    if not people:
        gateway.finish_run(run, status="succeeded")
        return run

    # One embed call for the Focus plus every attendee, so scoring is a single
    # metered request.
    embedded = gateway.embed(run, Task.PROFILE_EMBEDDING, [focus, *[_person_text(p) for p in people]])
    if not isinstance(embedded, Embeddings):
        gateway.finish_run(run, status="failed")
        return run
    focus_vec, person_vecs = embedded.vectors[0], embedded.vectors[1:]

    scored = sorted(
        (
            (person, _cosine(focus_vec, vec) + hiring_title_boost(person.role, person.what_talked))
            for person, vec in zip(people, person_vecs)
        ),
        key=lambda pair: pair[1],
        reverse=True,
    )
    for rank, (person, score) in enumerate(scored):
        person.score = score
        person.priority = "needs_you" if rank < _NEEDS_YOU else ("high" if rank < _WHY_MEET_TOP_N else "later")

    _write_why_meet(gateway, run, focus, [p for p, _ in scored[:_WHY_MEET_TOP_N]])
    db.commit()
    gateway.finish_run(run, status="succeeded")
    return run


def _write_why_meet(gateway: LLMGateway, run: ActionRun, focus: str, top: list[Person]) -> None:
    if not top:
        return
    roster = "\n".join(f"- {p.name}: {p.role or p.what_talked or '(no bio)'}" for p in top)
    vocab = "; ".join(SIGNAL_VOCAB)
    prompt = Prompt(
        instructions=(
            "For each attendee: (1) write one specific sentence (max 20 words) on why this "
            "person is worth meeting given the user's Focus; (2) attach 1–2 signals from this "
            f"exact vocabulary only: {vocab}. Prefer hiring / funding / startup / beta / "
            "customer / intro / investor labels when the bio supports them. "
            "Return every attendee by exact name."
        ),
        context=(f"User's Focus: {focus}",),
        variable=f"Attendees:\n{roster}",
    )
    result = gateway.complete(run, Task.WHY_MEET, _WhyMeetBatch, prompt)
    by_name: dict[str, _WhyMeetItem] = {}
    if isinstance(result, Completion):
        by_name = {item.name: item for item in result.value.items}

    for person in top:
        item = by_name.get(person.name)
        if item and item.why:
            person.relevance = item.why[:280]
        llm_tags = normalize_signals(item.signals if item else None)
        heuristic = infer_signals(
            role=person.role,
            what_talked=person.what_talked,
            relevance=person.relevance,
            intent=person.intent,
            note=person.note,
            priority=person.priority,
        )
        person.signals = merge_signals(llm_tags, heuristic) or None
