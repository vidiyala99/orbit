"""add user job target fields (target_role, target_industries)

Revision ID: b2d9e6f1a4c7
Revises: a91c4e7f2b38
Create Date: 2026-09-08 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2d9e6f1a4c7'
down_revision: Union[str, None] = 'a91c4e7f2b38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('target_role', sa.String(length=160), nullable=True))
    op.add_column('users', sa.Column('target_industries', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'target_industries')
    op.drop_column('users', 'target_role')
