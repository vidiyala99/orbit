import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Thread, Message, User
from ..schemas import ThreadCreate, ThreadOut, MessageOut

router = APIRouter(prefix="/threads", tags=["threads"])

@router.post("", response_model=ThreadOut, status_code=201)
def start_or_resume_thread(body: ThreadCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
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
