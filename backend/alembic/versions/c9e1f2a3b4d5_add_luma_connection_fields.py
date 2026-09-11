"""add luma connection fields to users

Revision ID: c9e1f2a3b4d5
Revises: b2d9e6f1a4c7
Create Date: 2026-09-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c9e1f2a3b4d5'
down_revision: Union[str, None] = 'b2d9e6f1a4c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('luma_session_ciphertext', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('luma_api_key_ciphertext', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('luma_connected_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'luma_connected_at')
    op.drop_column('users', 'luma_api_key_ciphertext')
    op.drop_column('users', 'luma_session_ciphertext')
