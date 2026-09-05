"""Resolve the Postgres URL from the process environment only.

A leftover backend/.env (or alembic.ini placeholder) must never win on Render.
Render injects DATABASE_URL; we normalize postgres:// → postgresql+psycopg://
and refuse localhost when RENDER is set.
"""

from __future__ import annotations

import os

LOCAL_DEFAULT = "postgresql+psycopg://stayconnected:localdev@localhost:5434/stayconnected"


def on_render() -> bool:
    return bool(os.environ.get("RENDER") or os.environ.get("RENDER_SERVICE_ID"))


def is_localhost_url(url: str) -> bool:
    lowered = url.lower()
    return "127.0.0.1" in lowered or "localhost" in lowered or "@::1" in lowered


def normalize_database_url(raw: str) -> str:
    url = raw.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql+psycopg2://"):
        url = "postgresql+psycopg://" + url[len("postgresql+psycopg2://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def resolve_database_url(fallback: str | None = None) -> str:
    raw = (os.environ.get("DATABASE_URL") or fallback or "").strip()
    if on_render():
        if not raw:
            raise RuntimeError(
                "DATABASE_URL must be set on Render. Link a PostGIS Postgres "
                "instance and set DATABASE_URL on orbit-api."
            )
        url = normalize_database_url(raw)
        if is_localhost_url(url):
            raise RuntimeError(
                "DATABASE_URL points at localhost; orbit-api must use the "
                "Render Postgres URL, not 127.0.0.1:5434."
            )
        return url
    if raw:
        return normalize_database_url(raw)
    return LOCAL_DEFAULT
