"""user focus fields (Role + Struggle)

Revision ID: a3c8f21e9d47
Revises: f2b8d1c4a7e3
Create Date: 2026-09-11 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c8f21e9d47'
down_revision: Union[str, None] = 'f2b8d1c4a7e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('focus_role', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('focus_struggle', sa.String(length=400), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'focus_struggle')
    op.drop_column('users', 'focus_role')
