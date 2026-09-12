"""person match signals (situational tags)

Revision ID: c4f8a12e9b03
Revises: b7e4a91c2d08
Create Date: 2026-09-12 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4f8a12e9b03"
down_revision: Union[str, None] = "b7e4a91c2d08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("people", sa.Column("signals", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("people", "signals")
