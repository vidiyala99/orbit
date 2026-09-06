"""Shared helpers for Person create / patch / import. No scrape jobs."""
from __future__ import annotations

from datetime import datetime, timezone

from .models import Person
from .schemas import EvidenceItem, PersonCreate, PersonUpdate


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _evidence_dump(items: list[EvidenceItem] | None) -> list[dict] | None:
    if items is None:
        return None
    return [item.model_dump() for item in items]


def apply_invite_timestamps(person: Person, invite_state: str | None) -> None:
    if invite_state == "pending" and person.pending_since is None:
        person.pending_since = _now()
    if invite_state == "accepted" and person.accepted_at is None:
        person.accepted_at = _now()


def apply_clipboard_payloads(
    person: Person,
    *,
    note_set: bool,
    dm_set: bool,
    note_payload_set: bool,
    dm_payload_set: bool,
) -> None:
    """If Face sends note/dm without a payload, the clipboard string follows."""
    if note_set and not note_payload_set:
        person.note_payload = person.note
    if dm_set and not dm_payload_set:
        person.dm_payload = person.dm


def person_from_create(user_id, body: PersonCreate) -> Person:
    fields_set = body.model_fields_set
    person = Person(
        user_id=user_id,
        name=body.name,
        role=body.role,
        avatar_url=body.avatar_url,
        linkedin_url=body.linkedin_url,
        x_url=body.x_url,
        email=body.email,
        where_met=body.where_met,
        what_talked=body.what_talked,
        relevance=body.relevance,
        invite_state=body.invite_state,
        pending_since=body.pending_since,
        accepted_at=body.accepted_at,
        last_touch_at=body.last_touch_at,
        intent=body.intent,
        note=body.note,
        dm=body.dm,
        email_draft=body.email_draft,
        score=body.score,
        evidence=_evidence_dump(body.evidence),
        note_payload=body.note_payload,
        dm_payload=body.dm_payload,
        event_id=body.event_id,
    )
    apply_invite_timestamps(person, body.invite_state)
    apply_clipboard_payloads(
        person,
        note_set="note" in fields_set,
        dm_set="dm" in fields_set,
        note_payload_set="note_payload" in fields_set,
        dm_payload_set="dm_payload" in fields_set,
    )
    return person


def apply_person_update(person: Person, body: PersonUpdate) -> None:
    fields_set = body.model_fields_set
    assignable = (
        "name", "role", "avatar_url", "linkedin_url", "x_url", "email",
        "where_met", "what_talked", "relevance", "invite_state",
        "pending_since", "accepted_at", "last_touch_at", "intent",
        "note", "dm", "email_draft", "score", "note_payload", "dm_payload",
        "event_id",
    )
    for field in assignable:
        if field in fields_set:
            setattr(person, field, getattr(body, field))
    if "evidence" in fields_set:
        person.evidence = _evidence_dump(body.evidence)
    if "invite_state" in fields_set:
        apply_invite_timestamps(person, body.invite_state)
    apply_clipboard_payloads(
        person,
        note_set="note" in fields_set,
        dm_set="dm" in fields_set,
        note_payload_set="note_payload" in fields_set,
        dm_payload_set="dm_payload" in fields_set,
    )
