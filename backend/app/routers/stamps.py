import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Thread, Stamp, User
from ..schemas import StampOut

router = APIRouter(tags=["stamps"])

@router.post("/threads/{thread_id}/stamp", response_model=StampOut)
def confirm_stamp(thread_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
    if thread is None:
        raise HTTPException(status_code=404, detail="thread not found")
    if user.id not in (thread.user_a_id, thread.user_b_id):
        raise HTTPException(status_code=403, detail="not a participant")

    stamp = db.query(Stamp).filter(Stamp.thread_id == thread_id).one_or_none()
    if stamp is None:
        stamp = Stamp(thread_id=thread_id)
        db.add(stamp)

    if user.id == thread.user_a_id:
        stamp.user_a_confirmed = True
    else:
        stamp.user_b_confirmed = True

    if stamp.user_a_confirmed and stamp.user_b_confirmed and stamp.confirmed_at is None:
        stamp.confirmed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(stamp)
    return StampOut(
        confirmed=bool(stamp.user_a_confirmed and stamp.user_b_confirmed),
        confirmed_at=stamp.confirmed_at,
    )
