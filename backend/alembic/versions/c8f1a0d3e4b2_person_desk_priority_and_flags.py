"""person desk priority and connected flags

Revision ID: c8f1a0d3e4b2
Revises: 9c4e2a8b1d70
Create Date: 2026-09-06 08:14:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f1a0d3e4b2'
down_revision: Union[str, None] = '9c4e2a8b1d70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('people', sa.Column('priority', sa.String(length=20), nullable=True))
    op.add_column(
        'people',
        sa.Column('linkedin_connected', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'people',
        sa.Column('x_interacted', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('people', 'x_interacted')
    op.drop_column('people', 'linkedin_connected')
    op.drop_column('people', 'priority')
