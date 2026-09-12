"""person triage state (kept / skipped)

Revision ID: b7e4a91c2d08
Revises: a3c8f21e9d47
Create Date: 2026-09-11 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7e4a91c2d08"
down_revision: Union[str, None] = "a3c8f21e9d47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("people", sa.Column("triage_state", sa.String(length=20), nullable=True))
    op.add_column("people", sa.Column("triaged_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_people_triage_state", "people", ["triage_state"])


def downgrade() -> None:
    op.drop_index("ix_people_triage_state", table_name="people")
    op.drop_column("people", "triaged_at")
    op.drop_column("people", "triage_state")
