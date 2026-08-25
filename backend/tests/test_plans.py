from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_current_user, get_optional_user
from app.models import User
from app.routers.plans import _assemble_plan_text

def _override_user(db_session, name="Priya Shah"):
    user = User(email=f"user_{name.replace(' ', '_')}@example.com")
    db_session.add(user)
    db_session.commit()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_optional_user] = lambda: user
    return user

def test_create_and_discover_nearby_plan(db_session):
    from app.db import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    user = _override_user(db_session)
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    ends = now + timedelta(hours=2)
    create_resp = client.post("/plans", json={
        "activity": "coffee",
        "openness": "open_to_chat",
        "detail": "Near University Ave.",
        "lat": 37.4419,
        "lon": -122.1430,
        "starts_at": now.isoformat(),
        "ends_at": ends.isoformat(),
    })
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["text"] == _assemble_plan_text(
        "coffee", "open_to_chat", now, ends, "Near University Ave.",
    )
    assert created["user_id"] == str(user.id)

    # 500m away in Palo Alto, within a 2km radius search
    list_resp = client.get("/plans", params={
        "lat": 37.4443, "lon": -122.1598, "radius_m": 2000,
        "at": now.isoformat(),
    })
    assert list_resp.status_code == 200
    ids = [p["id"] for p in list_resp.json()]
    assert created["id"] in ids

    app.dependency_overrides.clear()

def test_discovery_is_public_no_auth_required(db_session):
    from app.db import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session)
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    ends = now + timedelta(hours=2)
    created = client.post("/plans", json={
        "activity": "coffee", "openness": "open_to_chat",
        "detail": "Near University Ave.",
        "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": ends.isoformat(),
    }).json()

    # No dependency override for get_current_user/get_optional_user, no Authorization
    # header sent at all -- discovery must still work for a signed-out visitor.
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_optional_user, None)

    list_resp = client.get("/plans", params={
        "lat": 37.4443, "lon": -122.1598, "radius_m": 2000, "at": now.isoformat(),
    })
    assert list_resp.status_code == 200
    ids = [p["id"] for p in list_resp.json()]
    assert created["id"] in ids

    detail_resp = client.get(f"/plans/{created['id']}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["text"] == _assemble_plan_text(
        "coffee", "open_to_chat", now, ends, "Near University Ave.",
    )

    app.dependency_overrides.clear()

def test_discover_excludes_plans_outside_radius(db_session):
    from app.db import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session)
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    client.post("/plans", json={
        "activity": "other", "openness": "actively_meeting",
        "detail": "Meetup in SF.",
        "lat": 37.7749, "lon": -122.4194,
        "starts_at": now.isoformat(),
        "ends_at": (now + timedelta(hours=2)).isoformat(),
    })

    # Mountain View, ~50km from SF — outside a 5km radius
    list_resp = client.get("/plans", params={
        "lat": 37.3861, "lon": -122.0839, "radius_m": 5000,
        "at": now.isoformat(),
    })
    assert list_resp.json() == []

    app.dependency_overrides.clear()

def test_get_single_plan(db_session):
    from app.db import get_db
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "single_plan_user")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    ends = now + timedelta(hours=1)
    created = client.post("/plans", json={
        "activity": "coffee", "openness": "heads_down",
        "detail": "Founders Coffee.",
        "lat": 37.44, "lon": -122.16,
        "starts_at": now.isoformat(), "ends_at": ends.isoformat(),
    }).json()

    resp = client.get(f"/plans/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["text"] == _assemble_plan_text(
        "coffee", "heads_down", now, ends, "Founders Coffee.",
    )
    app.dependency_overrides.clear()

def test_stored_coordinates_are_snapped_to_neighborhood_precision(db_session):
    """Global Constraint: exact GPS coordinates are never stored or served."""
    from app.db import get_db
    from app.models import Plan
    app.dependency_overrides[get_db] = lambda: db_session
    _override_user(db_session, "snap_user")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    resp = client.post("/plans", json={
        "activity": "coffee", "openness": "open_to_chat",
        "lat": 37.44190123456, "lon": -122.14309876543,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=1)).isoformat(),
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["lat"] == 37.442
    assert body["lon"] == -122.143

    # ...and the imprecise value is what actually landed in the database
    stored = db_session.query(Plan).filter(Plan.id == body["id"]).one()
    assert stored.lat == 37.442
    assert stored.lon == -122.143
    app.dependency_overrides.clear()

def test_discovery_hides_plans_from_blocked_users(db_session):
    from app.db import get_db
    from app.models import Block
    app.dependency_overrides[get_db] = lambda: db_session
    spammer = _override_user(db_session, "spammer")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    spam_plan = client.post("/plans", json={
        "activity": "other", "openness": "open_to_chat", "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=2)).isoformat(),
    }).json()

    blocker = _override_user(db_session, "blocker")
    params = {"lat": 37.4419, "lon": -122.1430, "radius_m": 2000, "at": now.isoformat()}

    before = [p["id"] for p in client.get("/plans", params=params).json()]
    assert spam_plan["id"] in before

    db_session.add(Block(blocker_id=blocker.id, blocked_id=spammer.id))
    db_session.commit()

    after = [p["id"] for p in client.get("/plans", params=params).json()]
    assert spam_plan["id"] not in after
    app.dependency_overrides.clear()

def test_discovery_hides_plans_from_users_who_blocked_me(db_session):
    from app.db import get_db
    from app.models import Block
    app.dependency_overrides[get_db] = lambda: db_session
    poster = _override_user(db_session, "reverse_poster")
    client = TestClient(app)

    now = datetime.now(timezone.utc)
    plan = client.post("/plans", json={
        "activity": "cowork", "openness": "heads_down", "lat": 37.4419, "lon": -122.1430,
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(hours=2)).isoformat(),
    }).json()

    viewer = _override_user(db_session, "reverse_viewer")
    db_session.add(Block(blocker_id=poster.id, blocked_id=viewer.id))
    db_session.commit()

    params = {"lat": 37.4419, "lon": -122.1430, "radius_m": 2000, "at": now.isoformat()}
    ids = [p["id"] for p in client.get("/plans", params=params).json()]
    assert plan["id"] not in ids
    app.dependency_overrides.clear()
