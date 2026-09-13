"""Heuristic title boosts layered on Focus embedding scores.

Founders / C-suite are hiring-power proxies for matchmaking even when their
Luma bio doesn't cosine-match the user's Struggle text.
"""
from __future__ import annotations

import re

# Added to cosine similarity (typically ~0.2–0.7) so titles jump buckets.
HIRING_TITLE_BOOST = 0.18

_HIRING_TITLE = re.compile(
    r"\b("
    r"co-?founders?|founders?|"
    r"ceo|cto|coo|cfo|cpo|"
    r"chief\s+\w+|"
    r"vice[\s-]?president|\bvps?\b|"
    r"head\s+of\s+\w+|"
    r"managing\s+director|\bmds?\b"
    r")\b",
    re.I,
)


def hiring_title_boost(role: str | None, what_talked: str | None = None) -> float:
    blob = f"{role or ''} {what_talked or ''}"
    if not blob.strip():
        return 0.0
    return HIRING_TITLE_BOOST if _HIRING_TITLE.search(blob) else 0.0


def has_hiring_title(role: str | None, what_talked: str | None = None) -> bool:
    return hiring_title_boost(role, what_talked) > 0
