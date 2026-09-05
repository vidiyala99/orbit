"""Linkup deep search for event research.

Uses POST https://api.linkup.so/v1/search with depth=deep. When LINKUP_API_KEY
is missing or the call fails, returns an offline brief so the UI still works
for a one-tap demo.
"""

from __future__ import annotations

import logging

import httpx

from .config import settings

logger = logging.getLogger(__name__)

LINKUP_SEARCH_URL = "https://api.linkup.so/v1/search"


def research_event(query: str) -> dict:
    """Return {answer, sources, provider} for an event / who's-relevant brief."""
    query = (query or "").strip()
    if not query:
        query = "in-person networking events and who typically attends"

    if settings.linkup_api_key:
        try:
            response = httpx.post(
                LINKUP_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {settings.linkup_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "q": (
                        "Deep research for an in-person meetup. "
                        "Summarize what this event/scene is, who typically attends, "
                        "and 2–3 conversation openers. Query: "
                        f"{query}"
                    ),
                    "depth": "deep",
                    "outputType": "sourcedAnswer",
                },
                timeout=25.0,
            )
            response.raise_for_status()
            payload = response.json()
            answer = (
                payload.get("answer")
                or payload.get("content")
                or payload.get("output")
                or ""
            )
            if isinstance(answer, dict):
                answer = answer.get("text") or answer.get("answer") or str(answer)
            sources = _normalize_sources(payload.get("sources") or payload.get("results") or [])
            if str(answer).strip():
                return {"answer": str(answer).strip(), "sources": sources, "provider": "linkup"}
        except (httpx.HTTPError, KeyError, ValueError, TypeError) as exc:
            logger.warning("linkup research failed, using offline brief: %s", exc)

    return {
        "answer": (
            f"Orbit research (offline): {query}\n\n"
            "This looks like a time-boxed in-person plan. Approach people who "
            "overlap on intent (founders, hiring, customers) and open with why "
            "you're here, not a LinkedIn pitch. Set LINKUP_API_KEY on orbit-api "
            "to replace this brief with live Linkup deep research."
        ),
        "sources": [],
        "provider": "offline",
    }


def _normalize_sources(raw: list) -> list[dict]:
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        url = item.get("url") or item.get("link") or ""
        title = item.get("name") or item.get("title") or item.get("domain") or url
        if url or title:
            out.append({"title": str(title), "url": str(url)})
        if len(out) >= 5:
            break
    return out
