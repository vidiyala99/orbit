"""prune the stale pre-Orbit product

Drops Google Calendar, geocoding/presence, waitlist, bio-embedding matching,
and the old onboarding fields, plus every table no model maps any more (the
earlier plans/rooms/threads product) and the PostGIS/pgvector extensions.
Git history keeps the old shapes.

Revision ID: e1a7c4d9b2f0
Revises: c9e1f2a3b4d5
Create Date: 2026-09-11 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e1a7c4d9b2f0'
down_revision: Union[str, None] = 'c9e1f2a3b4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEAD_TABLES = (
    'waitlist_signups',
    'presence', 'follow_ups',
    'room_messages', 'time_proposal_confirmations', 'time_proposals',
    'room_members', 'rooms',
    'stamps', 'messages', 'threads', 'reports', 'plans', 'blocks',
)

DEAD_USER_COLUMNS = (
    'city', 'lat', 'lon', 'pain_points', 'pain_point_other',
    'google_calendar_refresh_token', 'google_calendar_connected_at',
    'bio_text', 'intent_tags', 'bio_embedding',
)


def upgrade() -> None:
    # IF EXISTS: databases built from different points in history may lack some.
    for table in DEAD_TABLES:
        op.execute(f'DROP TABLE IF EXISTS {table} CASCADE')
    for column in DEAD_USER_COLUMNS:
        op.execute(f'ALTER TABLE users DROP COLUMN IF EXISTS {column}')
    # Databases built on the old PostGIS image carry these extensions; nothing
    # uses them now and the plain postgres image can't load their libraries.
    op.execute(
        'DROP EXTENSION IF EXISTS postgis_tiger_geocoder, postgis_topology, '
        'fuzzystrmatch, postgis, vector CASCADE'
    )
    op.execute('DROP SCHEMA IF EXISTS tiger, tiger_data, topology CASCADE')


def downgrade() -> None:
    # One-way: the dropped product is gone from the code too. Restore it from
    # git history rather than resurrecting empty tables here.
    raise NotImplementedError('prune_stale_product is irreversible')
