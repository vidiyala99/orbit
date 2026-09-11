"""Alembic history must build the schema the models describe.

Drives Alembic against orbit_test directly, so it owns that database's
schema for its duration and leaves it blank afterwards (the `db_session`
fixture manages schema via `Base.metadata.create_all/drop_all` instead).
"""
import os
from contextlib import contextmanager

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.config import settings
from app.db import Base

TEST_DATABASE_URL = settings.database_url.rsplit("/", 1)[0] + "/orbit_test"

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ALEMBIC_INI = os.path.join(_BACKEND_DIR, "alembic.ini")

# The last revision before the stale pre-Orbit product was pruned: the shape
# the current dev database is in.
PRE_PRUNE_REVISION = "c9e1f2a3b4d5"

DEAD_USER_COLUMNS = {
    "city", "lat", "lon", "pain_points", "pain_point_other",
    "google_calendar_refresh_token", "google_calendar_connected_at",
    "bio_text", "intent_tags", "bio_embedding",
}


@contextmanager
def _alembic_targeting_test_db():
    """alembic/env.py reads process DATABASE_URL only."""
    original = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    try:
        yield
    finally:
        if original is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = original


def _upgrade(revision: str) -> None:
    with _alembic_targeting_test_db():
        command.upgrade(Config(_ALEMBIC_INI), revision)


def _reset_to_blank_schema(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))


def _app_tables(engine) -> set[str]:
    return set(inspect(engine).get_table_names()) - {"alembic_version"}


@pytest.fixture()
def engine():
    engine = create_engine(TEST_DATABASE_URL)
    _reset_to_blank_schema(engine)
    yield engine
    _reset_to_blank_schema(engine)
    engine.dispose()


def test_fresh_database_upgrades_to_exactly_the_model_tables(engine):
    _upgrade("head")

    assert _app_tables(engine) == set(Base.metadata.tables)


def test_fresh_database_has_no_dead_user_columns(engine):
    _upgrade("head")

    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    assert columns == set(Base.metadata.tables["users"].columns.keys())
    assert not columns & DEAD_USER_COLUMNS


def test_pre_prune_database_keeps_its_users_through_the_prune(engine):
    """The current dev database sits at PRE_PRUNE_REVISION with real rows."""
    _upgrade(PRE_PRUNE_REVISION)
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO users (id, email, first_name, city, lat, lon, pain_points, created_at) "
            "VALUES (gen_random_uuid(), 'kept@example.com', 'Kept', 'Austin, TX', 30.2, -97.7, "
            "'[\"no_time\"]', now())"
        ))
        conn.execute(text(
            "INSERT INTO waitlist_signups (id, email, created_at) "
            "VALUES (gen_random_uuid(), 'wl@example.com', now())"
        ))

    _upgrade("head")

    with engine.connect() as conn:
        first_name = conn.execute(
            text("SELECT first_name FROM users WHERE email = 'kept@example.com'")
        ).scalar_one()
    assert first_name == "Kept"
    assert _app_tables(engine) == set(Base.metadata.tables)
