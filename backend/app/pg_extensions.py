"""Optional Postgres extensions used by geo search and embeddings.

Free Render Postgres is vanilla: `CREATE EXTENSION postgis` and
`CREATE EXTENSION vector` fail. Probe, never abort the transaction, and
let callers fall back to lat/lon + skip embeddings.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy import text

from .database_url import on_render

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class PostgresCapabilities:
    postgis: bool = False
    vector: bool = False


_caps: PostgresCapabilities | None = None


def get_capabilities() -> PostgresCapabilities:
    if _caps is not None:
        return _caps
    # Until probed: local PostGIS image has both; free Render does not.
    assume = not on_render()
    return PostgresCapabilities(postgis=assume, vector=assume)


def set_capabilities(caps: PostgresCapabilities) -> None:
    global _caps
    _caps = caps


def extension_loaded(connection, name: str) -> bool:
    row = connection.execute(
        text("SELECT 1 FROM pg_extension WHERE extname = :name"),
        {"name": name},
    ).scalar()
    return bool(row)


def try_create_extension(connection, name: str) -> bool:
    if extension_loaded(connection, name):
        return True
    savepoint = f"ext_{name}"
    try:
        connection.execute(text(f"SAVEPOINT {savepoint}"))
        connection.execute(text(f"CREATE EXTENSION IF NOT EXISTS {name}"))
        connection.execute(text(f"RELEASE SAVEPOINT {savepoint}"))
        return True
    except Exception as exc:
        log.warning("Could not create extension %s: %s", name, exc)
        try:
            connection.execute(text(f"ROLLBACK TO SAVEPOINT {savepoint}"))
        except Exception:
            pass
        return False


def ensure_postgres_extensions(connection) -> PostgresCapabilities:
    caps = PostgresCapabilities(
        postgis=try_create_extension(connection, "postgis"),
        vector=try_create_extension(connection, "vector"),
    )
    set_capabilities(caps)
    log.info("Postgres extensions: postgis=%s vector=%s", caps.postgis, caps.vector)
    return caps
