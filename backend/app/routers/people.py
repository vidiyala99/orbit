import csv
import io
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Person, SyncRun, User
from ..people import person_from_create, apply_person_update
from ..schemas import PeopleImportOut, PersonCreate, PersonOut, PersonUpdate

router = APIRouter(tags=["people"])


def _owned_person(db: Session, user: User, person_id: uuid.UUID) -> Person:
    person = db.query(Person).filter(
        Person.id == person_id, Person.user_id == user.id,
    ).one_or_none()
    if person is None:
        raise HTTPException(status_code=404, detail="person not found")
    return person


def _list_people(db: Session, user: User, event_id: str | None) -> list[Person]:
    query = db.query(Person).filter(Person.user_id == user.id)
    if event_id is not None:
        query = query.filter(Person.event_id == event_id)
    return query.order_by(Person.name.asc()).all()


@router.get("/people", response_model=list[PersonOut])
def list_people(
    event_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _list_people(db, user, event_id)


@router.post("/people", response_model=PersonOut, status_code=201)
def create_person(
    body: PersonCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    person = person_from_create(user.id, body)
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.post("/people/import", response_model=PeopleImportOut, status_code=201)
async def import_people(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """CSV or JSON body → SyncRun(source=csv) + Person rows. No scrape."""
    content_type = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    raw = await request.body()
    try:
        rows = _parse_import_body(raw, content_type)
    except ValueError as exc:
        _record_sync(db, user, source="csv", status="error", error=str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    created: list[Person] = []
    try:
        for row in rows:
            person = person_from_create(user.id, PersonCreate.model_validate(row))
            db.add(person)
            created.append(person)
    except ValidationError as exc:
        db.rollback()
        _record_sync(db, user, source="csv", status="error", error=str(exc))
        raise HTTPException(status_code=422, detail=json.loads(exc.json())) from exc

    _record_sync(db, user, source="csv", status="ok", error=None, commit=False)
    db.commit()
    for person in created:
        db.refresh(person)
    return PeopleImportOut(created=len(created), people=created)


@router.get("/people/{person_id}", response_model=PersonOut)
def get_person(
    person_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _owned_person(db, user, person_id)


@router.patch("/people/{person_id}", response_model=PersonOut)
def update_person(
    person_id: uuid.UUID,
    body: PersonUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    person = _owned_person(db, user, person_id)
    apply_person_update(person, body)
    db.commit()
    db.refresh(person)
    return person


@router.get("/events/{event_id}/guests", response_model=list[PersonOut])
def list_event_guests(
    event_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Same Person shape as GET /people?event_id=, for a Luma-style guest list."""
    return _list_people(db, user, event_id)


def _record_sync(
    db: Session, user: User, *, source: str, status: str, error: str | None, commit: bool = True,
) -> SyncRun:
    run = SyncRun(user_id=user.id, source=source, status=status, error=error)
    db.add(run)
    if commit:
        db.commit()
    return run


def _parse_import_body(raw: bytes, content_type: str) -> list[dict]:
    if not raw.strip():
        raise ValueError("import body is empty")

    if content_type in ("text/csv", "application/csv"):
        return _rows_from_csv(raw.decode("utf-8-sig"))

    if content_type in ("application/json", ""):
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            # Face may POST CSV with a generic content-type.
            if "," in raw.decode("utf-8-sig", errors="replace").splitlines()[0]:
                return _rows_from_csv(raw.decode("utf-8-sig"))
            raise ValueError(f"invalid JSON: {exc}") from exc
        return _rows_from_json(payload)

    # Multipart is not required; treat unknown types as CSV if they look like one.
    text = raw.decode("utf-8-sig")
    if text.lstrip().startswith("{") or text.lstrip().startswith("["):
        return _rows_from_json(json.loads(text))
    return _rows_from_csv(text)


def _rows_from_json(payload) -> list[dict]:
    if isinstance(payload, dict) and "csv" in payload and isinstance(payload["csv"], str):
        return _rows_from_csv(payload["csv"])
    if isinstance(payload, dict) and "people" in payload:
        payload = payload["people"]
    if isinstance(payload, dict) and "name" in payload:
        payload = [payload]
    if not isinstance(payload, list):
        raise ValueError("JSON import must be a list, {people: [...]}, or {csv: \"...\"}")
    rows = []
    for item in payload:
        if not isinstance(item, dict):
            raise ValueError("each imported person must be an object")
        rows.append(item)
    if not rows:
        raise ValueError("import body has no people")
    return rows


def _rows_from_csv(text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("CSV is missing a header row")
    rows = []
    for raw in reader:
        row = {}
        for key, value in raw.items():
            if key is None:
                continue
            field = key.strip()
            if not field or value is None:
                continue
            value = value.strip()
            if value == "":
                continue
            if field == "score":
                row[field] = float(value)
            elif field == "evidence":
                row[field] = json.loads(value)
            else:
                row[field] = value
        if "name" not in row:
            raise ValueError("CSV row is missing name")
        rows.append(row)
    if not rows:
        raise ValueError("CSV has no data rows")
    return rows
