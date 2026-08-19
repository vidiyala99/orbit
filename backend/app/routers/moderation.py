from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import get_current_user
from ..models import Report, Block, User
from ..schemas import ReportCreate, BlockCreate

router = APIRouter(tags=["moderation"])

@router.post("/reports", status_code=201)
def create_report(body: ReportCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    report = Report(reporter_id=user.id, target_type=body.target_type, target_id=body.target_id, reason=body.reason)
    db.add(report)
    db.commit()
    return {"id": str(report.id)}

@router.post("/blocks", status_code=201)
def create_block(body: BlockCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    block = Block(blocker_id=user.id, blocked_id=body.blocked_user_id)
    db.add(block)
    db.commit()
    return {"id": str(block.id)}
