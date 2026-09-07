import pytest
from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.db import get_db
from app.main import app
from app.models import User


@pytest.fixture()
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def demo_enabled(monkeypatch):
    monkeypatch.setattr(settings, "demo_login_enabled", True)


# ------------------------------------------------------------------ off

def test_flag_defaults_to_on_when_unset_in_the_environment():
    """Hackathon lock: judges enter without setting flags or Google OAuth."""
    assert Settings(_env_file=None).demo_login_enabled is True


def test_demo_login_is_404_when_disabled(client, db_session, monkeypatch):
    """404, not 403: the endpoint must not even look like it exists."""
    monkeypatch.setattr(settings, "demo_login_enabled", False)
    resp = client.post("/auth/demo-login")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Not Found"}
    assert db_session.query(User).count() == 0


# ------------------------------------------------------------------- on

def test_demo_login_returns_login_shaped_token(client, db_session, demo_enabled):
    resp = client.post("/auth/demo-login")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"access_token", "user"}
    assert body["user"]["email"] == "demo@stayconnected.app"

    # The token is a normal session token: it authenticates a normal request.
    me = client.get("/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["id"] == body["user"]["id"]


def test_demo_user_is_fully_onboarded(client, db_session, demo_enabled):
    user = client.post("/auth/demo-login").json()["user"]
    assert user["first_name"] == "Demo"
    assert user["city"] == "Mountain View, CA"
    assert user["lat"] == pytest.approx(37.3861)
    assert user["lon"] == pytest.approx(-122.0839)
    assert user["onboarded_at"] is not None


def test_demo_login_twice_does_not_duplicate_the_user(client, db_session, demo_enabled):
    first = client.post("/auth/demo-login")
    assert first.status_code == 200

    second = client.post("/auth/demo-login")
    assert second.status_code == 200
    assert second.json()["user"]["id"] == first.json()["user"]["id"]
    assert db_session.query(User).filter(User.email == "demo@stayconnected.app").count() == 1


def test_demo_login_pins_world_to_a_picked_city(client, db_session, demo_enabled):
    token = client.post("/auth/demo-login", json={
        "lat": 40.7128, "lon": -74.006, "city": "New York, NY",
    }).json()["access_token"]
    user = client.get("/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert user["city"] == "New York, NY"
    assert user["lat"] == pytest.approx(40.7128)
    assert user["headline"] == "Just exploring"
