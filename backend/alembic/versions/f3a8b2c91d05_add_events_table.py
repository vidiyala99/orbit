"""add events table, backfill from person.event_id, repoint FK

Revision ID: f3a8b2c91d05
Revises: c8f1a0d3e4b2
Create Date: 2026-09-08 00:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f3a8b2c91d05'
down_revision: Union[str, None] = 'c8f1a0d3e4b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('source_url', sa.String(500), nullable=True),
        sa.Column('location', sa.String(300), nullable=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('guest_count', sa.Integer(), nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_events_user_id', 'events', ['user_id'])

    # Add the new UUID column alongside the old string one so data can move
    # across before the string column is dropped.
    op.add_column('people', sa.Column('event_id_new', postgresql.UUID(as_uuid=True), nullable=True))

    bind = op.get_bind()
    # One Event row per distinct (user_id, event_id string) pair currently
    # in use. starts_at defaults to now() for backfilled rows with no known
    # date — the known real one (blinkko-launch-party) is corrected by a
    # one-off UPDATE right after.
    distinct_pairs = bind.execute(sa.text(
        "SELECT DISTINCT user_id, event_id FROM people WHERE event_id IS NOT NULL"
    )).fetchall()
    for user_id, old_event_id in distinct_pairs:
        new_id = uuid.uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO events (id, user_id, title, starts_at, created_at) "
                "VALUES (:id, :user_id, :title, now(), now())"
            ),
            {"id": new_id, "user_id": user_id, "title": old_event_id},
        )
        bind.execute(
            sa.text(
                "UPDATE people SET event_id_new = :new_id "
                "WHERE user_id = :user_id AND event_id = :old_event_id"
            ),
            {"new_id": new_id, "user_id": user_id, "old_event_id": old_event_id},
        )
    # Known real event: correct the title/starts_at/source_url for rows
    # that were backfilled from the "blinkko-launch-party" string.
    bind.execute(sa.text(
        "UPDATE events SET title = 'Blinkko Launch Party', "
        "starts_at = '2026-09-08 18:00:00-07', "
        "location = '221 11th St, San Francisco', "
        "source_url = 'https://luma.com/blinkko?e=evt-w6V6FgMM4f1ZBEY' "
        "WHERE title = 'blinkko-launch-party'"
    ))

    op.drop_column('people', 'event_id')
    op.alter_column('people', 'event_id_new', new_column_name='event_id')
    op.create_index('ix_people_event_id', 'people', ['event_id'])
    op.create_foreign_key('fk_people_event_id', 'people', 'events', ['event_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_people_event_id', 'people', type_='foreignkey')
    op.drop_index('ix_people_event_id', table_name='people')
    op.add_column('people', sa.Column('event_id_old', sa.String(120), nullable=True))
    bind = op.get_bind()
    bind.execute(sa.text(
        "UPDATE people SET event_id_old = events.title "
        "FROM events WHERE people.event_id = events.id"
    ))
    op.drop_column('people', 'event_id')
    op.alter_column('people', 'event_id_old', new_column_name='event_id')
    op.create_index('ix_people_event_id', 'people', ['event_id'])
    op.drop_index('ix_events_user_id', table_name='events')
    op.drop_table('events')
