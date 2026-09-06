"""Nebius Token Factory — one-line 'why meet' copy for in-venue matches.

OpenAI-compatible chat at https://api.tokenfactory.nebius.com/v1
model google/gemma-3-27b-it. Missing key or a failed call falls back to a
tag/headline heuristic so EventRoom never blocks on the LLM.
"""

from __future__ import annotations

import json
import logging
import re
import uuid

import httpx

from .config import settings
from .models import User

logger = logging.getLogger(__name__)

DEFAULT_BASE = "https://api.tokenfactory.nebius.com/v1"
DEFAULT_MODEL = "google/gemma-3-27b-it"


def why_meet_lines(viewer: User, others: list[User]) -> dict[uuid.UUID, str]:
    fallback = {other.id: _heuristic(viewer, other) for other in others}
    if not others or not settings.nebius_api_key:
        return fallback

    numbered = []
    for i, other in enumerate(others, start=1):
        numbered.append(
            f"{i}. {other.first_name or 'Someone'} | "
            f"headline={other.headline or '—'} | "
            f"tags={', '.join(other.intent_tags or []) or '—'} | "
            f"bio={(other.bio_text or '—')[:240]}"
        )
    viewer_blob = (
        f"{viewer.first_name or 'You'} | headline={viewer.headline or '—'} | "
        f"tags={', '.join(viewer.intent_tags or []) or '—'} | "
        f"bio={(viewer.bio_text or '—')[:240]}"
    )
    try:
        response = httpx.post(
            f"{settings.nebius_base_url.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.nebius_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.nebius_model,
                "temperature": 0.4,
                "max_tokens": 220,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You write one short sentence (max 22 words) explaining "
                            "why two people should meet in person. Reply with a JSON "
                            "array of strings only, one sentence per listed person, "
                            "same order. No markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Viewer: {viewer_blob}\nPeople:\n" + "\n".join(numbered),
                    },
                ],
            },
            timeout=8.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        lines = _parse_lines(content, expected=len(others))
        if lines:
            return {other.id: lines[i] for i, other in enumerate(others)}
    except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as exc:
        logger.warning("nebius why-meet failed, using heuristic: %s", exc)
    return fallback


def _heuristic(viewer: User, other: User) -> str:
    shared = sorted(set(viewer.intent_tags or []) & set(other.intent_tags or []))
    name = other.first_name or "They"
    if shared:
        label = shared[0].replace("_", " ")
        return f"{name} overlaps with you on {label} — worth a 30-second hello."
    if other.headline:
        return f"{name} is here as {other.headline}. Ask what they're working on."
    return f"{name} is nearby and open to meeting. Lead with why you're here."


def _parse_lines(content: str, expected: int) -> list[str] | None:
    text = (content or "").strip()
    match = re.search(r"\[.*\]", text, flags=re.S)
    blob = match.group(0) if match else text
    try:
        parsed = json.loads(blob)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, list) or len(parsed) < expected:
        return None
    lines = [str(item).strip() for item in parsed[:expected]]
    return lines if all(lines) else None
