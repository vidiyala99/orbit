from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.models import User, Thread

@patch("app.routers.chat_ws.verify_token")
def test_two_participants_exchange_a_message(mock_verify, db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = User(email="priya@example.com", name="Priya")
    dev = User(email="dev@example.com", name="Dev")
    db_session.add_all([priya, dev]); db_session.commit()
    a, b = sorted([priya.id, dev.id], key=str)
    thread = Thread(user_a_id=a, user_b_id=b)
    db_session.add(thread); db_session.commit()

    def fake_verify(token):
        return {"priya-token": priya.id, "dev-token": dev.id}[token]
    mock_verify.side_effect = fake_verify

    client = TestClient(app)
    with client.websocket_connect(f"/ws/threads/{thread.id}?token=priya-token") as ws_priya:
        with client.websocket_connect(f"/ws/threads/{thread.id}?token=dev-token") as ws_dev:
            ws_priya.send_json({"body": "still down for that ride?"})
            received = ws_dev.receive_json()
            assert received["body"] == "still down for that ride?"
            assert received["sender_id"] == str(priya.id)

    app.dependency_overrides.clear()

@patch("app.routers.chat_ws.verify_token")
def test_blocked_content_message_is_rejected_without_closing_the_socket(mock_verify, db_session):
    from app.models import Message
    app.dependency_overrides[get_db] = lambda: db_session
    priya = User(email="priya-filter@example.com", name="Priya")
    dev = User(email="dev-filter@example.com", name="Dev")
    db_session.add_all([priya, dev]); db_session.commit()
    a, b = sorted([priya.id, dev.id], key=str)
    thread = Thread(user_a_id=a, user_b_id=b)
    db_session.add(thread); db_session.commit()

    mock_verify.side_effect = lambda token: {"priya-token": priya.id}[token]

    client = TestClient(app)
    with client.websocket_connect(f"/ws/threads/{thread.id}?token=priya-token") as ws:
        ws.send_json({"body": "free crypto giveaway, click here to claim"})
        assert ws.receive_json() == {"error": "message not allowed"}

        # the socket is still usable for a legitimate message
        ws.send_json({"body": "see you at the cafe"})
        echoed = ws.receive_json()
        assert echoed["body"] == "see you at the cafe"

    persisted = db_session.query(Message).filter(Message.thread_id == thread.id).all()
    assert [m.body for m in persisted] == ["see you at the cafe"]

    app.dependency_overrides.clear()
