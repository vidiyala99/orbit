import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.auth import get_current_user
from app.db import get_db
from app.models import RoomMember, User


def _make_user(db_session, name):
    user = User(email=f"room_{name}@example.com")
    db_session.add(user)
    db_session.commit()
    return user


def _act_as(user):
    app.dependency_overrides[get_current_user] = lambda: user


def _client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


# Palo Alto / SF reference points, matching the plans tests.
PALO_ALTO = {"lat": 37.4419, "lon": -122.1430}
NEARBY = {"lat": 37.4443, "lon": -122.1598}
SF = {"lat": 37.7749, "lon": -122.4194}


# ---------------------------------------------------------------- create

def test_create_public_room_enrolls_creator_as_member(db_session):
    client = _client(db_session)
    creator = _make_user(db_session, "creator")
    _act_as(creator)

    resp = client.post("/rooms", json={
        "name": "Morning Cowork",
        "purpose": "cowork",
        "visibility": "public",
        **PALO_ALTO,
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Morning Cowork"
    assert body["purpose"] == "cowork"
    assert body["visibility"] == "public"
    assert body["creator_id"] == str(creator.id)
    assert body["member_count"] == 1
    assert body["is_member"] is True

    members = db_session.query(RoomMember).filter(
        RoomMember.room_id == uuid.UUID(body["id"])
    ).all()
    assert [m.user_id for m in members] == [creator.id]

    app.dependency_overrides.clear()


def test_create_private_room_without_location(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "private_creator"))

    resp = client.post("/rooms", json={
        "name": "Job Hunt Support",
        "purpose": "job_hunting",
        "visibility": "private",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["visibility"] == "private"
    assert body["lat"] is None
    assert body["lon"] is None
    assert body["member_count"] == 1

    app.dependency_overrides.clear()


def test_create_rejects_only_one_of_lat_lon(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "half_coords"))

    lat_only = client.post("/rooms", json={
        "name": "Half Pinned", "purpose": "coffee_chat",
        "visibility": "public", "lat": 37.4419,
    })
    assert lat_only.status_code == 422

    lon_only = client.post("/rooms", json={
        "name": "Half Pinned", "purpose": "coffee_chat",
        "visibility": "public", "lon": -122.1430,
    })
    assert lon_only.status_code == 422

    app.dependency_overrides.clear()


def test_create_rejects_unknown_purpose_and_visibility(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "bad_enums"))

    bad_purpose = client.post("/rooms", json={
        "name": "Nope", "purpose": "skydiving", "visibility": "public",
    })
    assert bad_purpose.status_code == 422

    bad_visibility = client.post("/rooms", json={
        "name": "Nope", "purpose": "other", "visibility": "secret",
    })
    assert bad_visibility.status_code == 422

    app.dependency_overrides.clear()


def test_create_rejects_empty_and_overlong_name(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "bad_name"))

    empty = client.post("/rooms", json={
        "name": "", "purpose": "other", "visibility": "public",
    })
    assert empty.status_code == 422

    too_long = client.post("/rooms", json={
        "name": "x" * 121, "purpose": "other", "visibility": "public",
    })
    assert too_long.status_code == 422

    app.dependency_overrides.clear()


# ------------------------------------------------------------------ list

def test_list_shows_public_rooms_to_non_members(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "list_owner")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Open Cowork", "purpose": "cowork",
        "visibility": "public", **PALO_ALTO,
    }).json()

    stranger = _make_user(db_session, "list_stranger")
    _act_as(stranger)
    resp = client.get("/rooms", params={**NEARBY, "radius_m": 2000})
    assert resp.status_code == 200
    found = {r["id"]: r for r in resp.json()}
    assert room["id"] in found
    assert found[room["id"]]["is_member"] is False
    assert found[room["id"]]["member_count"] == 1

    app.dependency_overrides.clear()


def test_list_hides_private_rooms_from_non_members(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "priv_owner")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Secret Study", "purpose": "study_group",
        "visibility": "private", **PALO_ALTO,
    }).json()

    stranger = _make_user(db_session, "priv_stranger")
    _act_as(stranger)
    ids = [r["id"] for r in client.get(
        "/rooms", params={**NEARBY, "radius_m": 2000}
    ).json()]
    assert room["id"] not in ids

    # ...but the creator, who is a member, still sees it.
    _act_as(owner)
    listed = {r["id"]: r for r in client.get(
        "/rooms", params={**NEARBY, "radius_m": 2000}
    ).json()}
    assert room["id"] in listed
    assert listed[room["id"]]["is_member"] is True

    app.dependency_overrides.clear()


def test_list_excludes_located_rooms_outside_radius(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "geo_owner"))
    far = client.post("/rooms", json={
        "name": "SF Cowork", "purpose": "cowork", "visibility": "public", **SF,
    }).json()
    near = client.post("/rooms", json={
        "name": "PA Cowork", "purpose": "cowork", "visibility": "public", **PALO_ALTO,
    }).json()

    ids = [r["id"] for r in client.get(
        "/rooms", params={**NEARBY, "radius_m": 5000}
    ).json()]
    assert near["id"] in ids
    assert far["id"] not in ids

    app.dependency_overrides.clear()


def test_list_always_includes_anywhere_nearby_rooms(db_session):
    """Rooms with no location aren't tied to a place, so radius can't exclude them."""
    client = _client(db_session)
    _act_as(_make_user(db_session, "anywhere_owner"))
    anywhere = client.post("/rooms", json={
        "name": "Remote Job Hunters", "purpose": "job_hunting", "visibility": "public",
    }).json()

    ids = [r["id"] for r in client.get(
        "/rooms", params={**SF, "radius_m": 100}
    ).json()]
    assert anywhere["id"] in ids

    app.dependency_overrides.clear()


# ---------------------------------------------------------------- detail

def test_get_unknown_room_is_404(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "detail_404"))
    resp = client.get(f"/rooms/{uuid.uuid4()}")
    assert resp.status_code == 404
    app.dependency_overrides.clear()


def test_get_private_room_forbidden_for_non_member_and_leaks_nothing(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "detail_owner")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Confidential Standup", "purpose": "study_group", "visibility": "private",
    }).json()

    _act_as(_make_user(db_session, "detail_stranger"))
    resp = client.get(f"/rooms/{room['id']}")
    assert resp.status_code == 403
    assert "Confidential Standup" not in resp.text
    assert "study_group" not in resp.text

    app.dependency_overrides.clear()


def test_get_room_detail_for_member(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "detail_member")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Coffee Chats", "purpose": "coffee_chat",
        "visibility": "public", **PALO_ALTO,
    }).json()

    resp = client.get(f"/rooms/{room['id']}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Coffee Chats"
    assert body["is_member"] is True
    assert body["member_count"] == 1

    app.dependency_overrides.clear()


# ------------------------------------------------------------------ join

def test_join_public_room_is_idempotent(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "join_owner")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Public Cowork", "purpose": "cowork", "visibility": "public",
    }).json()

    joiner = _make_user(db_session, "joiner")
    _act_as(joiner)
    first = client.post(f"/rooms/{room['id']}/join")
    assert first.status_code == 200
    assert first.json()["member_count"] == 2
    assert first.json()["is_member"] is True

    second = client.post(f"/rooms/{room['id']}/join")
    assert second.status_code == 200
    assert second.json()["member_count"] == 2

    rows = db_session.query(RoomMember).filter(
        RoomMember.room_id == uuid.UUID(room["id"]),
        RoomMember.user_id == joiner.id,
    ).all()
    assert len(rows) == 1

    app.dependency_overrides.clear()


def test_self_join_private_room_is_forbidden(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "pj_owner"))
    room = client.post("/rooms", json={
        "name": "Invite Only", "purpose": "study_group", "visibility": "private",
    }).json()

    _act_as(_make_user(db_session, "pj_stranger"))
    resp = client.post(f"/rooms/{room['id']}/join")
    assert resp.status_code == 403

    app.dependency_overrides.clear()


def test_join_unknown_room_is_404(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "join_404"))
    assert client.post(f"/rooms/{uuid.uuid4()}/join").status_code == 404
    app.dependency_overrides.clear()


# ------------------------------------------------------------ add member

def test_member_can_add_user_to_private_room(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "add_owner")
    invitee = _make_user(db_session, "add_invitee")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Private Study", "purpose": "study_group", "visibility": "private",
    }).json()

    resp = client.post(f"/rooms/{room['id']}/members", json={"user_id": str(invitee.id)})
    assert resp.status_code == 200
    assert resp.json()["member_count"] == 2

    # the added user can now see and open the room
    _act_as(invitee)
    detail = client.get(f"/rooms/{room['id']}")
    assert detail.status_code == 200
    assert detail.json()["is_member"] is True

    app.dependency_overrides.clear()


def test_adding_a_member_twice_is_idempotent(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "add_twice_owner")
    invitee = _make_user(db_session, "add_twice_invitee")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Dupes", "purpose": "other", "visibility": "private",
    }).json()

    client.post(f"/rooms/{room['id']}/members", json={"user_id": str(invitee.id)})
    again = client.post(f"/rooms/{room['id']}/members", json={"user_id": str(invitee.id)})
    assert again.status_code == 200
    assert again.json()["member_count"] == 2

    app.dependency_overrides.clear()


def test_non_member_cannot_add_to_private_room(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "add_forbidden_owner")
    outsider = _make_user(db_session, "add_forbidden_outsider")
    victim = _make_user(db_session, "add_forbidden_victim")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Locked", "purpose": "other", "visibility": "private",
    }).json()

    _act_as(outsider)
    resp = client.post(f"/rooms/{room['id']}/members", json={"user_id": str(victim.id)})
    assert resp.status_code == 403

    app.dependency_overrides.clear()


def test_non_member_cannot_add_to_public_room(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "pub_add_owner")
    outsider = _make_user(db_session, "pub_add_outsider")
    victim = _make_user(db_session, "pub_add_victim")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Public But Members Add", "purpose": "cowork", "visibility": "public",
    }).json()

    _act_as(outsider)
    resp = client.post(f"/rooms/{room['id']}/members", json={"user_id": str(victim.id)})
    assert resp.status_code == 403

    app.dependency_overrides.clear()


def test_adding_unknown_user_is_404(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "add_unknown_owner"))
    room = client.post("/rooms", json={
        "name": "Ghosts", "purpose": "other", "visibility": "private",
    }).json()

    resp = client.post(f"/rooms/{room['id']}/members", json={"user_id": str(uuid.uuid4())})
    assert resp.status_code == 404

    app.dependency_overrides.clear()


# ----------------------------------------------------------------- leave

def test_leave_removes_membership_and_is_idempotent(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "leave_owner")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Comers And Goers", "purpose": "cowork", "visibility": "public",
    }).json()

    joiner = _make_user(db_session, "leaver")
    _act_as(joiner)
    client.post(f"/rooms/{room['id']}/join")

    # 204: leave says nothing about the room, so it can't leak a private room's
    # details to someone who was never in it.
    assert client.post(f"/rooms/{room['id']}/leave").status_code == 204
    assert client.post(f"/rooms/{room['id']}/leave").status_code == 204

    after = client.get(f"/rooms/{room['id']}").json()
    assert after["is_member"] is False
    assert after["member_count"] == 1

    assert db_session.query(RoomMember).filter(
        RoomMember.room_id == uuid.UUID(room["id"]),
        RoomMember.user_id == joiner.id,
    ).count() == 0

    app.dependency_overrides.clear()


def test_leaving_a_private_room_you_were_never_in_is_a_noop(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "leave_priv_owner"))
    room = client.post("/rooms", json={
        "name": "Never Joined", "purpose": "other", "visibility": "private",
    }).json()

    _act_as(_make_user(db_session, "leave_priv_stranger"))
    resp = client.post(f"/rooms/{room['id']}/leave")
    assert resp.status_code == 204
    assert "Never Joined" not in resp.text

    app.dependency_overrides.clear()


# ------------------------------------------------------------ moderation

def test_a_room_can_be_reported(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "report_owner")
    _act_as(owner)
    room = client.post("/rooms", json={
        "name": "Spam Room", "purpose": "other", "visibility": "public",
    }).json()

    resp = client.post("/reports", json={
        "target_type": "room", "target_id": room["id"], "reason": "spam",
    })
    assert resp.status_code == 201

    app.dependency_overrides.clear()
