"""rooms and room members

Revision ID: d4f19b7c2a86
Revises: b6e04f2a71cd
Create Date: 2026-08-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# `location` below was a PostGIS Geography column (NOT NULL on plans/presence).
# It is pre-Orbit and dropped by the prune migration, so it is now plain nullable
# Text: history builds without PostGIS. The original is in git.


# revision identifiers, used by Alembic.
revision: str = 'd4f19b7c2a86'
down_revision: Union[str, None] = 'b6e04f2a71cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Two brand-new, empty tables: no backfill needed.
    # purpose/visibility are plain strings; their enum-ish values are validated
    # at the Pydantic layer, matching the existing Plan.activity convention.
    op.create_table('rooms',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('creator_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('purpose', sa.String(length=20), nullable=False),
    sa.Column('visibility', sa.String(length=10), nullable=False),
    # lat/lon/location nullable: a room can be "anywhere nearby" instead of
    # pinned to a venue; location is set only when lat/lon are supplied.
    sa.Column('lat', sa.Float(), nullable=True),
    sa.Column('lon', sa.Float(), nullable=True),
    sa.Column('location', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('room_members',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('room_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('room_id', 'user_id', name='uq_room_member')
    )


def downgrade() -> None:
    op.drop_table('room_members')
    # geoalchemy2 drops the spatial index along with the table.
    op.drop_table('rooms')
