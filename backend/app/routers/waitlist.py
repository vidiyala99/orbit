from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import WaitlistSignup
from ..schemas import WaitlistCreate, WaitlistOut, WaitlistCountOut

router = APIRouter(tags=["waitlist"])


@router.post("/waitlist", response_model=WaitlistOut, status_code=201)
def join_waitlist(body: WaitlistCreate, db: Session = Depends(get_db)):
    existing = db.query(WaitlistSignup).filter(WaitlistSignup.email == body.email).one_or_none()
    if existing is None:
        db.add(WaitlistSignup(email=body.email))
        db.commit()
    return WaitlistOut()


@router.get("/waitlist/count", response_model=WaitlistCountOut)
def waitlist_count(db: Session = Depends(get_db)):
    count = db.query(WaitlistSignup).count()
    return WaitlistCountOut(count=count)
