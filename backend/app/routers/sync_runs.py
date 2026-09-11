from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import SyncRun, User
from ..people_fixtures import seed_fixture_people
from ..schemas import SyncRunCreate, SyncRunOut

router = APIRouter(prefix="/sync-runs", tags=["sync-runs"])


@router.get("", response_model=list[SyncRunOut])
def list_sync_runs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(SyncRun)
        .filter(SyncRun.user_id == user.id)
        .order_by(SyncRun.created_at.desc())
        .all()
    )


@router.post("", response_model=SyncRunOut, status_code=201)
def create_sync_run(
    body: SyncRunCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """source=fixture loads demo people with filled note/dm payloads.

    source=csv is created by POST /people/import, not here — no scrape jobs.
    """
    if body.source != "fixture":
        raise HTTPException(
            status_code=400,
            detail="POST /sync-runs only accepts source=fixture; CSV goes to POST /people/import",
        )

    seed_fixture_people(db, user)
    run = SyncRun(user_id=user.id, source="fixture", status="ok")
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
