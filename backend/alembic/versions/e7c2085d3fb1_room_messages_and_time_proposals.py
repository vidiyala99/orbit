"""room messages and time proposals

Revision ID: e7c2085d3fb1
Revises: d4f19b7c2a86
Create Date: 2026-08-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7c2085d3fb1'
down_revision: Union[str, None] = 'd4f19b7c2a86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Three brand-new, empty tables: no backfill needed. Nothing on the existing
    # Thread/Message 1:1 path is altered, so no existing rows are touched.
    # status/kind are plain strings; their enum-ish values are validated at the
    # Pydantic layer, matching the existing Plan.activity / Room.purpose
    # convention (no DB-level CHECK constraints).

    # Created first: room_messages carries an FK to it.
    op.create_table('time_proposals',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('room_id', sa.UUID(), nullable=False),
    sa.Column('proposer_id', sa.UUID(), nullable=False),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
    # status: proposed | confirmed | cancelled
    sa.Column('status', sa.String(length=20), nullable=False),
    # Nullable: set only once every invited member has confirmed, mirroring
    # the existing Stamp.confirmed_at semantics.
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
    sa.ForeignKeyConstraint(['proposer_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # Row-per-member confirmation: generalizes Stamp's two fixed boolean columns
    # to N room members. The row existing IS the confirmation, so confirmed_at
    # is NOT NULL — it's always supplied at insert. Un-confirm = delete the row.
    op.create_table('time_proposal_confirmations',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('proposal_id', sa.UUID(), nullable=False),
    sa.Column('room_member_id', sa.UUID(), nullable=False),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['proposal_id'], ['time_proposals.id'], ),
    sa.ForeignKeyConstraint(['room_member_id'], ['room_members.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('proposal_id', 'room_member_id', name='uq_proposal_confirmation')
    )

    op.create_table('room_messages',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('room_id', sa.UUID(), nullable=False),
    # users.id, not room_members.id, matching messages.sender_id — leaving a
    # room must not orphan past messages.
    sa.Column('sender_id', sa.UUID(), nullable=False),
    # kind: text | plan_share | time_proposal
    sa.Column('kind', sa.String(length=20), nullable=False),
    # Nullable: card messages may carry no prose. "text messages must have a
    # body" is enforced at the Pydantic layer, not by the column.
    sa.Column('body', sa.Text(), nullable=True),
    # Typed, nullable card references — exactly one is set for a card kind,
    # none for kind="text". Preferred over a generic polymorphic blob.
    sa.Column('plan_id', sa.UUID(), nullable=True),
    sa.Column('time_proposal_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ),
    sa.ForeignKeyConstraint(['time_proposal_id'], ['time_proposals.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Reverse creation order: room_messages references time_proposals.
    op.drop_table('room_messages')
    op.drop_table('time_proposal_confirmations')
    op.drop_table('time_proposals')
