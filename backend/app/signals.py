"""Situational match tags shown on Focus cards.

Enrichment (ticket 05) will ground these in LinkedIn/X activity. Until then
ranking + heuristics over role / bio / why-meet text fill the chips so the
Focus card is never a blank decoration surface.
"""
from __future__ import annotations

import re

from .models import Person

# Fixed vocabulary — UI + LLM must stay inside this list.
SIGNAL_VOCAB: tuple[str, ...] = (
    "Potentially hiring",
    "Posted about hiring",
    "Just got funded",
    "Starting new startup",
    "Looking for beta testers",
    "Potential customer",
    "Warm intro",
    "Investor",
    "Design partner",
)

_VOCAB_SET = {s.casefold(): s for s in SIGNAL_VOCAB}

_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Posted about hiring", re.compile(r"posted.{0,40}(hir|open role|we.?re hiring)", re.I)),
    (
        "Potentially hiring",
        re.compile(
            r"\b(hiring|recruit(er|ing)?|talent|open role|"
            r"looking for (an? )?(engineer|pm|designer|founding)|"
            r"co-?founders?|founders?|\bceo\b|\bcto\b|\bcoo\b)\b",
            re.I,
        ),
    ),
    (
        "Just got funded",
        re.compile(r"\b(funded|raised|series [a-c]\b|seed round|closed fund|writing .+ checks)\b", re.I),
    ),
    (
        "Starting new startup",
        re.compile(
            r"\b(founder|co-?founder|starting|founding|new startup|just launched|"
            r"product builder|indie hacker|building)\b",
            re.I,
        ),
    ),
    (
        "Looking for beta testers",
        re.compile(
            r"\b(beta|testers|early users|mvp|prototype)\b",
            re.I,
        ),
    ),
    (
        "Design partner",
        re.compile(
            r"\b(design[- ]partners?|looking for (a )?design partner|want(s|ed)? (a )?design partner)\b",
            re.I,
        ),
    ),
    (
        "Potential customer",
        re.compile(
            r"\b(customer|buyer|evaluating|looking for (a )?tool|head of|vp |director|operator)\b",
            re.I,
        ),
    ),
    ("Warm intro", re.compile(r"\b(warm intro|introduce|intro to)\b", re.I)),
    (
        "Investor",
        re.compile(
            r"\b(investor|partner,.+ventures|venture|angel|writing checks|seed check|gp\b)\b",
            re.I,
        ),
    ),
)

_INTENT_MAP: dict[str, str] = {
    "hiring": "Potentially hiring",
    "investor intro": "Investor",
    "investor": "Investor",
    "collab": "Design partner",
    "customer": "Potential customer",
    "beta": "Looking for beta testers",
}


def normalize_signals(raw: list[str] | None, *, limit: int = 3) -> list[str]:
    """Keep only known labels, preserve order, drop dupes."""
    if not raw:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, str):
            continue
        key = item.strip().casefold()
        label = _VOCAB_SET.get(key)
        if not label or label in seen:
            continue
        out.append(label)
        seen.add(label)
        if len(out) >= limit:
            break
    return out


def infer_signals(
    *,
    role: str | None = None,
    what_talked: str | None = None,
    relevance: str | None = None,
    intent: str | None = None,
    note: str | None = None,
    priority: str | None = None,
    limit: int = 3,
) -> list[str]:
    """Heuristic tags from text we already store (Luma bio + why-meet)."""
    blob = " ".join(x for x in (role, what_talked, relevance, note) if x)
    found: list[str] = []
    seen: set[str] = set()

    if intent:
        mapped = _INTENT_MAP.get(intent.strip().casefold())
        if mapped and mapped not in seen:
            found.append(mapped)
            seen.add(mapped)

    for label, pattern in _RULES:
        if label in seen:
            continue
        if blob and pattern.search(blob):
            found.append(label)
            seen.add(label)
        if len(found) >= limit:
            break

    # Shortlist people should never render with zero situational chips.
    if not found:
        if priority in ("needs_you", "high") or role:
            found.append("Warm intro")

    return found[:limit]


def merge_signals(*groups: list[str] | None, limit: int = 3) -> list[str]:
    merged: list[str] = []
    for group in groups:
        for label in normalize_signals(group, limit=limit):
            if label not in merged:
                merged.append(label)
            if len(merged) >= limit:
                return merged
    return merged


def ensure_person_signals(person: Person, *, persist: bool = True) -> list[str]:
    """Fill empty `signals` from heuristics so Focus cards show chips immediately."""
    existing = normalize_signals(person.signals if isinstance(person.signals, list) else None)
    if existing:
        return existing
    inferred = infer_signals(
        role=person.role,
        what_talked=person.what_talked,
        relevance=person.relevance,
        intent=person.intent,
        note=person.note,
        priority=person.priority,
    )
    if persist and inferred:
        person.signals = inferred
    return inferred
