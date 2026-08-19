from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.models import User, Thread

@patch("app.routers.chat_ws.verify_token")
def test_two_participants_exchange_a_message(mock_verify, db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    priya = User(clerk_id="user_ws_priya", name="Priya")
    dev = User(clerk_id="user_ws_dev", name="Dev")
    db_session.add_all([priya, dev]); db_session.commit()
    a, b = sorted([priya.id, dev.id], key=str)
    thread = Thread(user_a_id=a, user_b_id=b)
    db_session.add(thread); db_session.commit()

    def fake_verify(token):
        return {"priya-token": "user_ws_priya", "dev-token": "user_ws_dev"}[token]
    mock_verify.side_effect = fake_verify

    client = TestClient(app)
    with client.websocket_connect(f"/ws/threads/{thread.id}?token=priya-token") as ws_priya:
        with client.websocket_connect(f"/ws/threads/{thread.id}?token=dev-token") as ws_dev:
            ws_priya.send_json({"body": "still down for that ride?"})
            received = ws_dev.receive_json()
            assert received["body"] == "still down for that ride?"
            assert received["sender_id"] == str(priya.id)

    app.dependency_overrides.clear()
