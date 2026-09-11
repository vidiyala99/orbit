"""add people and sync_runs

Revision ID: 9c4e2a8b1d70
Revises: 14862f714faf
Create Date: 2026-09-06 07:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c4e2a8b1d70'
down_revision: Union[str, None] = '14862f714faf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sync_runs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_sync_runs_user_id'), 'sync_runs', ['user_id'], unique=False)

    op.create_table(
        'people',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('role', sa.String(length=160), nullable=True),
        sa.Column('avatar_url', sa.String(length=255), nullable=True),
        sa.Column('linkedin_url', sa.String(length=255), nullable=True),
        sa.Column('x_url', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('where_met', sa.String(length=255), nullable=True),
        sa.Column('what_talked', sa.Text(), nullable=True),
        sa.Column('relevance', sa.String(length=280), nullable=True),
        sa.Column('invite_state', sa.String(length=20), nullable=True),
        sa.Column('pending_since', sa.DateTime(timezone=True), nullable=True),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_touch_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('intent', sa.String(length=160), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('dm', sa.Text(), nullable=True),
        sa.Column('email_draft', sa.Text(), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('evidence', sa.JSON(), nullable=True),
        sa.Column('note_payload', sa.Text(), nullable=True),
        sa.Column('dm_payload', sa.Text(), nullable=True),
        sa.Column('event_id', sa.String(length=120), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_people_user_id'), 'people', ['user_id'], unique=False)
    op.create_index(op.f('ix_people_event_id'), 'people', ['event_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_people_event_id'), table_name='people')
    op.drop_index(op.f('ix_people_user_id'), table_name='people')
    op.drop_table('people')
    op.drop_index(op.f('ix_sync_runs_user_id'), table_name='sync_runs')
    op.drop_table('sync_runs')
