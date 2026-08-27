import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Block, Thread, Message, User
from ..schemas import ThreadCreate, ThreadOut, ThreadSummaryOut, MessageOut

router = APIRouter(prefix="/threads", tags=["threads"])

@router.get("", response_model=list[ThreadSummaryOut])
def list_threads(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    threads = (
        db.query(Thread)
        .filter(or_(Thread.user_a_id == user.id, Thread.user_b_id == user.id))
        .all()
    )
    if not threads:
        return []

    # Ascending, so the last write per thread_id wins and is the newest message.
    last_message = {
        m.thread_id: m
        for m in db.query(Message)
        .filter(Message.thread_id.in_([t.id for t in threads]))
        .order_by(Message.created_at.asc())
        .all()
    }
    other_id = {t.id: t.user_b_id if t.user_a_id == user.id else t.user_a_id for t in threads}
    others = {u.id: u for u in db.query(User).filter(User.id.in_(other_id.values())).all()}

    summaries = [
        ThreadSummaryOut(
            id=t.id,
            user_a_id=t.user_a_id,
            user_b_id=t.user_b_id,
            created_at=t.created_at,
            other_user=others[other_id[t.id]],
            last_message=last_message.get(t.id),
        )
        for t in threads
    ]
    summaries.sort(
        key=lambda s: s.last_message.created_at if s.last_message else s.created_at,
        reverse=True,
    )
    return summaries

@router.post("", response_model=ThreadOut, status_code=201)
def start_or_resume_thread(body: ThreadCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if body.other_user_id == user.id:
        raise HTTPException(status_code=400, detail="cannot start a thread with yourself")

    blocked = (
        db.query(Block)
        .filter(
            or_(
                and_(Block.blocker_id == user.id, Block.blocked_id == body.other_user_id),
                and_(Block.blocker_id == body.other_user_id, Block.blocked_id == user.id),
            )
        )
        .first()
    )
    if blocked is not None:
        raise HTTPException(status_code=403, detail="cannot start a thread with a blocked user")

    a, b = sorted([user.id, body.other_user_id], key=str)
    existing = db.query(Thread).filter(Thread.user_a_id == a, Thread.user_b_id == b).one_or_none()
    if existing:
        return existing
    thread = Thread(user_a_id=a, user_b_id=b)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread

@router.get("/{thread_id}/messages", response_model=list[MessageOut])
def list_messages(thread_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
    if thread is None:
        raise HTTPException(status_code=404, detail="thread not found")
    if user.id not in (thread.user_a_id, thread.user_b_id):
        raise HTTPException(status_code=403, detail="not a participant")
    return (
        db.query(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .all()
    )
