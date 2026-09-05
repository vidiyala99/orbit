"""Column types that degrade when PostGIS / pgvector are missing."""

from __future__ import annotations

import geoalchemy2
import pgvector.sqlalchemy
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text


def _has_extension(name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.execute(
            text("SELECT 1 FROM pg_extension WHERE extname = :name"),
            {"name": name},
        ).scalar()
    )


def location_column(*, nullable: bool = False):
    """Geography(POINT) when PostGIS exists; nullable text otherwise."""
    if _has_extension("postgis"):
        return sa.Column(
            "location",
            geoalchemy2.types.Geography(
                geometry_type="POINT",
                srid=4326,
                from_text="ST_GeogFromText",
                name="geography",
                nullable=nullable,
            ),
            nullable=nullable,
        )
    return sa.Column("location", sa.Text(), nullable=True)


def embedding_column():
    """pgvector when available; JSON so User rows still load without it."""
    if _has_extension("vector"):
        return sa.Column(
            "bio_embedding",
            pgvector.sqlalchemy.vector.VECTOR(dim=1536),
            nullable=True,
        )
    return sa.Column("bio_embedding", sa.JSON(), nullable=True)
