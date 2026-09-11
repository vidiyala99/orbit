"""Coverage for the onboarding migration's backfill SQL.

Spec (docs/superpowers/specs/2026-08-23-onboarding-design.md, Testing
section): "Migration backfill: seed a pre-migration-shaped row, run
migration, assert first_name/last_name split correctly, onboarded_at is
null."

This drives Alembic directly against a real database, downgraded to the
schema state just before revision 7a2c9e5f1b34 (the `name` column still
exists, none of the new onboarding columns do), seeds raw rows there, then
upgrades to head and inspects what the backfill produced. It intentionally
does NOT use the `db_session` fixture's `Base.metadata.create_all()` setup,
since that creates the current (post-migration) schema rather than the
pre-migration one this test needs to seed.
"""
import os
from contextlib import contextmanager

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from app.config import settings

TEST_DATABASE_URL = settings.database_url.rsplit("/", 1)[0] + "/stayconnected_test"

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ALEMBIC_INI = os.path.join(_BACKEND_DIR, "alembic.ini")

PRE_MIGRATION_REVISION = "2f4fb15d6ae3"
ONBOARDING_REVISION = "7a2c9e5f1b34"


def _alembic_config() -> Config:
    cfg = Config(_ALEMBIC_INI)
    return cfg


@contextmanager
def _alembic_targeting_test_db():
    """alembic/env.py reads process DATABASE_URL only (never alembic.ini
    or Settings.env_file). Point it at stayconnected_test for the upgrade.
    """
    original = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    try:
        yield
    finally:
        if original is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = original


def _reset_to_blank_schema(engine) -> None:
    """Wipe every table (including alembic_version) so this test's own
    alembic-driven schema management doesn't collide with whatever the
    `db_session` fixture (which manages schema via
    `Base.metadata.create_all/drop_all`, not Alembic) left behind, and
    vice versa.
    """
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))


def test_onboarding_migration_backfills_name_split_and_leaves_onboarded_at_null():
    engine = create_engine(TEST_DATABASE_URL)
    _reset_to_blank_schema(engine)

    cfg = _alembic_config()

    # Get the db to the schema shape just before the onboarding migration
    # (has `name`, none of the new profile columns).
    with _alembic_targeting_test_db():
        command.upgrade(cfg, PRE_MIGRATION_REVISION)

    with engine.begin() as conn:
        # Two-word name: exercises the "split on first space" branch.
        conn.execute(
            text(
                "INSERT INTO users (id, email, name, created_at) "
                "VALUES (gen_random_uuid(), :email, :name, now())"
            ),
            {"email": "jamie-backfill-test@example.com", "name": "Jamie Rivera"},
        )
        # Single-word name: exercises the "whole name to first_name, empty
        # last_name" branch.
        conn.execute(
            text(
                "INSERT INTO users (id, email, name, created_at) "
                "VALUES (gen_random_uuid(), :email, :name, now())"
            ),
            {"email": "cher-backfill-test@example.com", "name": "Cher"},
        )

    try:
        # Run the actual migration under test, including its backfill SQL.
        with _alembic_targeting_test_db():
            command.upgrade(cfg, ONBOARDING_REVISION)

        with engine.connect() as conn:
            jamie = conn.execute(
                text(
                    "SELECT first_name, last_name, onboarded_at FROM users WHERE email = :email"
                ),
                {"email": "jamie-backfill-test@example.com"},
            ).one()
            cher = conn.execute(
                text(
                    "SELECT first_name, last_name, onboarded_at FROM users WHERE email = :email"
                ),
                {"email": "cher-backfill-test@example.com"},
            ).one()

        assert jamie.first_name == "Jamie"
        assert jamie.last_name == "Rivera"
        assert jamie.onboarded_at is None

        assert cher.first_name == "Cher"
        assert cher.last_name == ""
        assert cher.onboarded_at is None
    finally:
        # Leave the test db in the blank state every other test (via the
        # `db_session` fixture) expects to find at the start of its own
        # Base.metadata.create_all() — including no stray alembic_version
        # table, which would otherwise make a later run of *this* test
        # think it's already past PRE_MIGRATION_REVISION.
        _reset_to_blank_schema(engine)
    engine.dispose()
