from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_current_user
from app.db import get_db
from app.models import User, Presence, EMBEDDING_DIM


def _user(db_session, email, **kwargs):
    user = User(email=email, **kwargs)
    db_session.add(user)
    db_session.commit()
    return user


def _client_as(db_session, user):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def _vector(seed: float) -> list[float]:
    return [seed] * EMBEDDING_DIM


def test_toggle_presence_on_creates_row(db_session):
    user = _user(db_session, "presence1@example.com")
    client = _client_as(db_session, user)

    resp = client.post("/presence", json={"lat": 37.4419, "lon": -122.1430})

    assert resp.status_code == 201
    body = resp.json()
    assert body["user_id"] == str(user.id)
    assert body["lat"] == 37.442  # _snap rounds to 3 decimals (~100m precision)
    assert body["lon"] == -122.143

    app.dependency_overrides.clear()


def test_toggling_on_again_replaces_the_previous_row(db_session):
    user = _user(db_session, "presence2@example.com")
    client = _client_as(db_session, user)

    first = client.post("/presence", json={"lat": 37.4419, "lon": -122.1430}).json()
    second = client.post("/presence", json={"lat": 37.5, "lon": -122.2}).json()

    assert first["id"] != second["id"]
    remaining = db_session.query(Presence).filter_by(user_id=user.id).all()
    assert len(remaining) == 1
    assert str(remaining[0].id) == second["id"]

    app.dependency_overrides.clear()


def test_toggle_presence_off_removes_row(db_session):
    user = _user(db_session, "presence3@example.com")
    client = _client_as(db_session, user)
    client.post("/presence", json={"lat": 37.4419, "lon": -122.1430})

    resp = client.delete("/presence")

    assert resp.status_code == 204
    assert db_session.query(Presence).filter_by(user_id=user.id).count() == 0

    app.dependency_overrides.clear()


def test_toggle_presence_off_when_not_present_is_a_no_op(db_session):
    user = _user(db_session, "presence4@example.com")
    client = _client_as(db_session, user)

    resp = client.delete("/presence")

    assert resp.status_code == 204

    app.dependency_overrides.clear()


def test_nearby_candidates_requires_requester_to_be_present(db_session):
    user = _user(db_session, "presence5@example.com")
    client = _client_as(db_session, user)

    resp = client.get("/presence/nearby")

    assert resp.status_code == 404

    app.dependency_overrides.clear()


def test_nearby_candidates_ranks_by_bio_similarity(db_session):
    now = datetime.now(timezone.utc)
    me = _user(db_session, "presence_me@example.com", bio_embedding=_vector(1.0))
    close_match = _user(
        db_session, "presence_close@example.com",
        first_name="Priya", last_name="K.",
        bio_embedding=_vector(1.0),
    )
    far_match = _user(
        db_session, "presence_far@example.com",
        first_name="Marcus", last_name="T.",
        bio_embedding=_vector(-1.0),
    )
    for u, (lat, lon) in [(me, (37.4419, -122.1430)), (close_match, (37.4420, -122.1431)), (far_match, (37.4421, -122.1432))]:
        db_session.add(Presence(
            user_id=u.id, lat=lat, lon=lon, location=f"SRID=4326;POINT({lon} {lat})",
            started_at=now, expires_at=now + timedelta(hours=2),
        ))
    db_session.commit()
    client = _client_as(db_session, me)

    resp = client.get("/presence/nearby")

    assert resp.status_code == 200
    body = resp.json()
    ids = [c["user_id"] for c in body]
    assert ids == [str(close_match.id), str(far_match.id)]
    assert body[0]["match_score"] > body[1]["match_score"]
    assert body[0]["why_meet"]

    app.dependency_overrides.clear()


def test_nearby_candidates_falls_back_to_tag_overlap_without_embedding(db_session):
    now = datetime.now(timezone.utc)
    me = _user(db_session, "presence_me2@example.com", intent_tags=["co_founder", "investors"])
    no_embedding = _user(
        db_session, "presence_noembed@example.com",
        first_name="Dana", intent_tags=["co_founder"],
    )
    for u, (lat, lon) in [(me, (37.4419, -122.1430)), (no_embedding, (37.4420, -122.1431))]:
        db_session.add(Presence(
            user_id=u.id, lat=lat, lon=lon, location=f"SRID=4326;POINT({lon} {lat})",
            started_at=now, expires_at=now + timedelta(hours=2),
        ))
    db_session.commit()
    client = _client_as(db_session, me)

    resp = client.get("/presence/nearby")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["user_id"] == str(no_embedding.id)
    assert body[0]["match_score"] > 0

    app.dependency_overrides.clear()


def test_nearby_candidates_excludes_expired_presence(db_session):
    now = datetime.now(timezone.utc)
    me = _user(db_session, "presence_me3@example.com")
    expired = _user(db_session, "presence_expired@example.com")
    db_session.add(Presence(
        user_id=me.id, lat=37.4419, lon=-122.1430,
        location="SRID=4326;POINT(-122.1430 37.4419)",
        started_at=now, expires_at=now + timedelta(hours=2),
    ))
    db_session.add(Presence(
        user_id=expired.id, lat=37.4420, lon=-122.1431,
        location="SRID=4326;POINT(-122.1431 37.4420)",
        started_at=now - timedelta(hours=3), expires_at=now - timedelta(hours=1),
    ))
    db_session.commit()
    client = _client_as(db_session, me)

    resp = client.get("/presence/nearby")

    assert resp.status_code == 200
    assert resp.json() == []

    app.dependency_overrides.clear()


def test_nearby_candidates_excludes_self(db_session):
    now = datetime.now(timezone.utc)
    me = _user(db_session, "presence_me4@example.com")
    db_session.add(Presence(
        user_id=me.id, lat=37.4419, lon=-122.1430,
        location="SRID=4326;POINT(-122.1430 37.4419)",
        started_at=now, expires_at=now + timedelta(hours=2),
    ))
    db_session.commit()
    client = _client_as(db_session, me)

    resp = client.get("/presence/nearby")

    assert resp.status_code == 200
    assert resp.json() == []

    app.dependency_overrides.clear()
