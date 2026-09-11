"""plan structured composer fields: activity, openness, detail

Revision ID: c3d81a6f4e29
Revises: 7a2c9e5f1b34
Create Date: 2026-08-23 10:12:03.884517

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d81a6f4e29'
down_revision: Union[str, None] = '7a2c9e5f1b34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add as nullable first so existing rows survive, backfill, then tighten.
    op.add_column('plans', sa.Column('activity', sa.String(length=20), nullable=True))
    op.add_column('plans', sa.Column('openness', sa.String(length=20), nullable=True))
    op.add_column('plans', sa.Column('detail', sa.String(length=500), nullable=True))

    op.execute(
        "UPDATE plans SET activity = 'other' WHERE activity IS NULL"
    )
    op.execute(
        "UPDATE plans SET openness = 'open_to_chat' WHERE openness IS NULL"
    )

    op.alter_column('plans', 'activity', existing_type=sa.String(length=20), nullable=False)
    op.alter_column('plans', 'openness', existing_type=sa.String(length=20), nullable=False)


def downgrade() -> None:
    op.drop_column('plans', 'detail')
    op.drop_column('plans', 'openness')
    op.drop_column('plans', 'activity')
