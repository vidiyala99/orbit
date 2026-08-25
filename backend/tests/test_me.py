from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db
from app.auth import get_current_user
from app.models import User


def test_me_returns_the_backend_user_row(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    user = User(
        email="user_me_test@example.com",
        first_name="Priya",
        last_name="Shah",
        headline="PM, ex-Stripe",
    )
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    resp = client.get("/me")

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(user.id)
    assert body["email"] == "user_me_test@example.com"
    assert body["first_name"] == "Priya"
    assert body["last_name"] == "Shah"
    assert body["headline"] == "PM, ex-Stripe"

    app.dependency_overrides.clear()


def _onboarding_client(db_session, user):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


@patch("app.routers.me.geocode_city")
def test_onboarding_happy_path_sets_all_fields(mock_geocode, db_session):
    mock_geocode.return_value = (30.2672, -97.7431)
    user = User(email="onboard1@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/onboarding", json={
        "first_name": "Priya",
        "last_name": "Shah",
        "city": "Austin, TX",
        "pain_points": ["cold_outreach", "other"],
        "pain_point_other": "Too many cold DMs",
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["first_name"] == "Priya"
    assert body["last_name"] == "Shah"
    assert body["city"] == "Austin, TX"
    assert body["pain_points"] == ["cold_outreach", "other"]
    assert body["pain_point_other"] == "Too many cold DMs"
    assert body["lat"] == 30.2672
    assert body["lon"] == -97.7431
    assert body["onboarded_at"] is not None

    app.dependency_overrides.clear()


@patch("app.routers.me.geocode_city")
def test_onboarding_geocoding_failure_still_succeeds_with_null_lat_lon(mock_geocode, db_session):
    mock_geocode.return_value = None
    user = User(email="onboard2@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/onboarding", json={
        "first_name": "Dev",
        "last_name": "Kulkarni",
        "city": "Some Unknown Place",
        "pain_points": ["no_time"],
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["lat"] is None
    assert body["lon"] is None
    assert body["onboarded_at"] is not None

    app.dependency_overrides.clear()


@patch("app.routers.me.geocode_city")
def test_onboarding_rejects_empty_pain_points(mock_geocode, db_session):
    user = User(email="onboard3@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/onboarding", json={
        "first_name": "Dev",
        "last_name": "Kulkarni",
        "city": "Austin, TX",
        "pain_points": [],
    })

    assert resp.status_code == 422
    assert not mock_geocode.called

    app.dependency_overrides.clear()


@patch("app.routers.me.geocode_city")
def test_onboarding_rejects_missing_required_fields(mock_geocode, db_session):
    user = User(email="onboard4@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/onboarding", json={
        "first_name": "Dev",
        "pain_points": ["no_time"],
    })

    assert resp.status_code == 422

    app.dependency_overrides.clear()


@patch("app.routers.me.geocode_city")
def test_onboarding_ignores_pain_point_other_when_other_not_selected(mock_geocode, db_session):
    mock_geocode.return_value = (1.0, 2.0)
    user = User(email="onboard5@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/onboarding", json={
        "first_name": "Dev",
        "last_name": "Kulkarni",
        "city": "Austin, TX",
        "pain_points": ["no_time"],
        "pain_point_other": "should be ignored",
    })

    assert resp.status_code == 200
    assert resp.json()["pain_point_other"] is None

    app.dependency_overrides.clear()
