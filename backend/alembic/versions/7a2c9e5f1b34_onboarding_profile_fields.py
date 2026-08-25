"""onboarding: profile fields on users, drop name

Revision ID: 7a2c9e5f1b34
Revises: 2f4fb15d6ae3
Create Date: 2026-08-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a2c9e5f1b34'
down_revision: Union[str, None] = '2f4fb15d6ae3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('first_name', sa.String(length=60), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=60), nullable=True))
    op.add_column('users', sa.Column('city', sa.String(length=120), nullable=True))
    op.add_column('users', sa.Column('lat', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('lon', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('pain_points', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('pain_point_other', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('onboarded_at', sa.DateTime(timezone=True), nullable=True))

    # Backfill: split the old `name` column on the first space into
    # first_name / last_name. Single-word names go entirely into
    # first_name, last_name becomes ''. onboarded_at stays null for all
    # pre-existing rows (desired: they get routed through onboarding).
    op.execute(
        """
        UPDATE users
        SET
            first_name = CASE
                WHEN position(' ' in name) > 0 THEN substring(name from 1 for position(' ' in name) - 1)
                ELSE name
            END,
            last_name = CASE
                WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
                ELSE ''
            END
        """
    )

    op.drop_column('users', 'name')


def downgrade() -> None:
    # Best-effort: re-add `name` as nullable and reconstruct it from
    # first_name/last_name. This is lossy for city/lat/lon/pain_points/
    # pain_point_other/onboarded_at, which are dropped outright — those
    # values cannot be recovered by a subsequent upgrade().
    op.add_column('users', sa.Column('name', sa.String(length=120), nullable=True))
    op.execute(
        """
        UPDATE users
        SET name = trim(concat_ws(' ', first_name, nullif(last_name, '')))
        """
    )

    op.drop_column('users', 'onboarded_at')
    op.drop_column('users', 'pain_point_other')
    op.drop_column('users', 'pain_points')
    op.drop_column('users', 'lon')
    op.drop_column('users', 'lat')
    op.drop_column('users', 'city')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
