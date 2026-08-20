from app.filters import contains_blocked_content

def test_filter_flags_blocked_words():
    assert contains_blocked_content("visit my site for free crypto giveaway") is True

def test_filter_allows_normal_text():
    assert contains_blocked_content("Coffee near University Ave, open to chat") is False

from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.auth import get_current_user
from app.models import User
from datetime import datetime, timedelta, timezone

def test_plan_with_blocked_content_is_rejected(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    user = User(email="user_filter_test@example.com", name="Test User")
    db_session.add(user); db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    resp = client.post("/plans", json={
        "text": "wire transfer needed, click here to claim your prize",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=1)).isoformat(),
    })
    assert resp.status_code == 422
    app.dependency_overrides.clear()

def test_report_and_block_endpoints(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    reporter = User(email="user_reporter@example.com", name="Reporter")
    target = User(email="user_target@example.com", name="Target")
    db_session.add_all([reporter, target]); db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: reporter
    client = TestClient(app)

    report_resp = client.post("/reports", json={
        "target_type": "user", "target_id": str(target.id), "reason": "spam",
    })
    assert report_resp.status_code == 201

    block_resp = client.post("/blocks", json={"blocked_user_id": str(target.id)})
    assert block_resp.status_code == 201
    app.dependency_overrides.clear()
