import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..auth import verify_token
from ..filters import contains_blocked_content
from ..models import Thread, Message, User

router = APIRouter(tags=["chat"])

# Minimal in-process connection registry: thread_id -> list of (user_id, websocket)
_connections: dict[uuid.UUID, list[tuple[uuid.UUID, WebSocket]]] = {}

@router.websocket("/ws/threads/{thread_id}")
async def chat_socket(
    websocket: WebSocket,
    thread_id: uuid.UUID,
    token: str,
    db: Session = Depends(get_db),
):
    try:
        clerk_id = verify_token(token)
    except Exception:
        await websocket.close(code=4401)
        return

    user = db.query(User).filter(User.clerk_id == clerk_id).one_or_none()
    thread = db.query(Thread).filter(Thread.id == thread_id).one_or_none()
    if user is None or thread is None or user.id not in (thread.user_a_id, thread.user_b_id):
        await websocket.close(code=4403)
        return

    await websocket.accept()
    _connections.setdefault(thread_id, []).append((user.id, websocket))

    try:
        while True:
            data = await websocket.receive_json()
            if contains_blocked_content(data["body"]):
                # Reject this one message without persisting, broadcasting, or
                # tearing down the connection.
                await websocket.send_json({"error": "message not allowed"})
                continue
            message = Message(thread_id=thread_id, sender_id=user.id, body=data["body"])
            db.add(message)
            db.commit()
            db.refresh(message)

            payload = {
                "id": str(message.id),
                "thread_id": str(thread_id),
                "sender_id": str(user.id),
                "body": message.body,
                "created_at": message.created_at.isoformat(),
            }
            for _, peer_ws in _connections.get(thread_id, []):
                await peer_ws.send_json(payload)
    except WebSocketDisconnect:
        pass
    finally:
        _connections[thread_id] = [
            (uid, ws) for uid, ws in _connections.get(thread_id, []) if ws is not websocket
        ]
