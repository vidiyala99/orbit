"""google calendar connection fields on users

Revision ID: b6e04f2a71cd
Revises: c3d81a6f4e29
Create Date: 2026-08-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6e04f2a71cd'
down_revision: Union[str, None] = 'c3d81a6f4e29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Both nullable, no backfill: NULL is the correct value for every
    # existing row and means "Google Calendar not connected".
    op.add_column('users', sa.Column('google_calendar_refresh_token', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('google_calendar_connected_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'google_calendar_connected_at')
    op.drop_column('users', 'google_calendar_refresh_token')
