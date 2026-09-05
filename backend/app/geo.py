"""Geo helpers that keep the MVP funnel working without PostGIS."""

from __future__ import annotations

from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Distance, ST_DWithin
from sqlalchemy import and_

from .pg_extensions import get_capabilities

# One degree of latitude is ~111 km. Good enough for a city-sized demo radius.
_METERS_PER_DEG = 111_000.0


def wkt_point(lon: float, lat: float) -> str | None:
    """WKT for a Geography column, or None when PostGIS is missing."""
    if not get_capabilities().postgis:
        return None
    return f"SRID=4326;POINT({lon} {lat})"


def apply_radius_filter(
    query,
    *,
    lat_col,
    lon_col,
    location_col,
    lat: float,
    lon: float,
    radius_m: int,
    allow_unlocated: bool = False,
):
    if get_capabilities().postgis:
        point = WKTElement(f"POINT({lon} {lat})", srid=4326)
        spatial = ST_DWithin(location_col, point, radius_m)
        if allow_unlocated:
            spatial = location_col.is_(None) | spatial
        return query.filter(spatial)

    deg = max(float(radius_m) / _METERS_PER_DEG, 0.001)
    box = and_(
        lat_col.between(lat - deg, lat + deg),
        lon_col.between(lon - deg, lon + deg),
    )
    if allow_unlocated:
        box = lat_col.is_(None) | box
    return query.filter(box)


def distance_order(location_col, lat: float, lon: float):
    if not get_capabilities().postgis:
        return None
    point = WKTElement(f"POINT({lon} {lat})", srid=4326)
    return ST_Distance(location_col, point)
