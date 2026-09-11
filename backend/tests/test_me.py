import pytest
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


def test_onboarding_sets_name_and_marks_onboarded(db_session):
    user = User(email="onboard1@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/onboarding", json={"first_name": "Priya", "last_name": "Shah"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["first_name"] == "Priya"
    assert body["last_name"] == "Shah"
    assert body["onboarded_at"] is not None

    app.dependency_overrides.clear()


def test_onboarding_rejects_missing_last_name(db_session):
    user = User(email="onboard2@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/onboarding", json={"first_name": "Dev"})

    assert resp.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.parametrize("method,path", [
    ("GET", "/geocode?q=Austin"),
    ("POST", "/waitlist"),
    ("GET", "/waitlist/count"),
    ("GET", "/me/calendar/connect"),
    ("POST", "/me/calendar/disconnect"),
    ("GET", "/me/calendar/candidates"),
])
def test_pre_orbit_endpoints_are_gone(method, path, db_session):
    user = User(email="gone@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    assert client.request(method, path).status_code == 404

    app.dependency_overrides.clear()


def test_me_returns_job_target_fields(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    user = User(
        email="job_target_get@example.com",
        target_role="Product Manager",
        target_industries=["fintech", "healthcare"],
    )
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    resp = client.get("/me")

    assert resp.status_code == 200
    body = resp.json()
    assert body["target_role"] == "Product Manager"
    assert body["target_industries"] == ["fintech", "healthcare"]

    app.dependency_overrides.clear()


def test_job_target_defaults_to_null(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    user = User(email="job_target_default@example.com")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    resp = client.get("/me")

    assert resp.status_code == 200
    body = resp.json()
    assert body["target_role"] is None
    assert body["target_industries"] is None

    app.dependency_overrides.clear()


def test_patch_job_target_sets_fields(db_session):
    user = User(email="job_target_patch1@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/job-target", json={
        "target_role": "Staff Engineer",
        "target_industries": ["climate", "robotics"],
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["target_role"] == "Staff Engineer"
    assert body["target_industries"] == ["climate", "robotics"]

    app.dependency_overrides.clear()


def test_patch_job_target_allows_clearing_fields(db_session):
    user = User(
        email="job_target_patch2@example.com",
        target_role="Old Role",
        target_industries=["old_industry"],
    )
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/job-target", json={
        "target_role": None,
        "target_industries": None,
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["target_role"] is None
    assert body["target_industries"] is None

    app.dependency_overrides.clear()


def test_patch_job_target_rejects_overlong_role(db_session):
    user = User(email="job_target_patch3@example.com")
    db_session.add(user)
    db_session.commit()
    client = _onboarding_client(db_session, user)

    resp = client.patch("/me/job-target", json={
        "target_role": "x" * 161,
    })

    assert resp.status_code == 422

    app.dependency_overrides.clear()
