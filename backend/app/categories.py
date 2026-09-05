"""Orbit explore chips. Keys stay in sync with frontend/lib/categories.ts."""

from sqlalchemy import or_
from sqlalchemy.orm import Query

CATEGORY_KEYS = ("tech", "design", "food", "music", "sports", "outdoors")

# activity = Plan.activity; purpose = Room.purpose.
CATEGORY_FILTERS: dict[str, dict[str, tuple[str, ...]]] = {
    "tech": {
        "activities": ("cowork", "event"),
        "purposes": ("cowork", "job_hunting"),
        "keywords": ("tech", "ai", "hack", "startup", "founder", "code", "software"),
    },
    "design": {
        "activities": ("event", "cowork"),
        "purposes": ("cowork", "other"),
        "keywords": ("design", "figma", "ux", "ui", "critique"),
    },
    "food": {
        "activities": ("meal", "coffee"),
        "purposes": ("coffee_chat",),
        "keywords": ("food", "lunch", "coffee", "dinner", "brunch", "philz"),
    },
    "music": {
        "activities": ("event",),
        "purposes": ("other",),
        "keywords": ("music", "concert", "dj", "vinyl", "show", "listen"),
    },
    "sports": {
        "activities": ("event",),
        "purposes": ("other",),
        "keywords": ("sport", "run", "game", "gym", "match", "pickup"),
    },
    "outdoors": {
        "activities": ("event", "ride_share"),
        "purposes": ("other",),
        "keywords": ("hike", "park", "outdoor", "trail", "walk", "bay"),
    },
}


def apply_category_filter(query: Query, *, category: str | None, text_columns: list, kind_column, kind_key: str) -> Query:
    if not category:
        return query
    spec = CATEGORY_FILTERS.get(category.lower())
    if spec is None:
        return query
    clauses = []
    kinds = spec.get("activities" if kind_key == "activity" else "purposes") or ()
    if kinds:
        clauses.append(kind_column.in_(kinds))
    for keyword in spec["keywords"]:
        pattern = f"%{keyword}%"
        for column in text_columns:
            clauses.append(column.ilike(pattern))
    if not clauses:
        return query
    return query.filter(or_(*clauses))
