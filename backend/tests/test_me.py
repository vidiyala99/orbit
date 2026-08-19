from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.auth import get_current_user
from app.models import User


def test_me_returns_the_backend_user_row(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    user = User(clerk_id="user_me_test", name="Priya Shah", headline="PM, ex-Stripe")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    resp = client.get("/me")

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(user.id)
    assert body["clerk_id"] == "user_me_test"
    assert body["name"] == "Priya Shah"
    assert body["headline"] == "PM, ex-Stripe"

    app.dependency_overrides.clear()
