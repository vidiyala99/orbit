"""add person.followed_up_at

Revision ID: a91c4e7f2b38
Revises: f3a8b2c91d05
Create Date: 2026-09-08 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a91c4e7f2b38'
down_revision: Union[str, None] = 'f3a8b2c91d05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('people', sa.Column('followed_up_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('people', 'followed_up_at')
