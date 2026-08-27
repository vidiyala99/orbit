import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.db import get_db
from app.main import app
from app.models import Plan, RoomMessage, TimeProposal, TimeProposalConfirmation, User

CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

TOMORROW = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
    minute=0, second=0, microsecond=0
)
SLOT_START = TOMORROW.replace(hour=17)
SLOT_END = TOMORROW.replace(hour=18)


def _make_user(db_session, name, **kwargs):
    user = User(email=f"roomchat_{name}@example.com", **kwargs)
    db_session.add(user)
    db_session.commit()
    return user


def _act_as(user):
    app.dependency_overrides[get_current_user] = lambda: user


def _client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def _make_room(client, name="Chat Room", visibility="public"):
    return client.post("/rooms", json={
        "name": name, "purpose": "cowork", "visibility": visibility,
    }).json()


def _make_plan(db_session, user):
    plan = Plan(
        user_id=user.id,
        activity="coffee",
        openness="open_to_chat",
        detail=None,
        text="Coffee, open to chat",
        lat=37.4419,
        lon=-122.1430,
        location="SRID=4326;POINT(-122.1430 37.4419)",
        starts_at=SLOT_START,
        ends_at=SLOT_END,
    )
    db_session.add(plan)
    db_session.commit()
    return plan


def _propose(client, room_id, body=None):
    return client.post(f"/rooms/{room_id}/proposals", json={
        "starts_at": SLOT_START.isoformat(),
        "ends_at": SLOT_END.isoformat(),
        **({"body": body} if body else {}),
    })


# -------------------------------------------------------------- messages

def test_member_can_post_and_read_a_text_message(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "msg_owner")
    _act_as(owner)
    room = _make_room(client)

    resp = client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "text", "body": "anyone here at 5?",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["kind"] == "text"
    assert body["body"] == "anyone here at 5?"
    assert body["sender_id"] == str(owner.id)
    assert body["room_id"] == room["id"]
    assert body["plan"] is None
    assert body["time_proposal"] is None

    listed = client.get(f"/rooms/{room['id']}/messages")
    assert listed.status_code == 200
    assert [m["body"] for m in listed.json()] == ["anyone here at 5?"]

    app.dependency_overrides.clear()


def test_messages_are_listed_oldest_first(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "order_owner"))
    room = _make_room(client)

    for text in ["first", "second", "third"]:
        client.post(f"/rooms/{room['id']}/messages", json={"kind": "text", "body": text})

    listed = client.get(f"/rooms/{room['id']}/messages").json()
    assert [m["body"] for m in listed] == ["first", "second", "third"]

    app.dependency_overrides.clear()


def test_member_can_share_a_plan(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "share_owner")
    _act_as(owner)
    room = _make_room(client)
    plan = _make_plan(db_session, owner)

    resp = client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "plan_share", "plan_id": str(plan.id), "body": "join me",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["kind"] == "plan_share"
    assert body["plan_id"] == str(plan.id)
    # The card needs the plan itself, so the thread renders in one round trip.
    assert body["plan"]["text"] == "Coffee, open to chat"
    assert body["plan"]["id"] == str(plan.id)

    listed = client.get(f"/rooms/{room['id']}/messages").json()
    assert listed[0]["plan"]["text"] == "Coffee, open to chat"

    app.dependency_overrides.clear()


def test_text_message_requires_a_body(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "empty_text"))
    room = _make_room(client)

    assert client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "text",
    }).status_code == 422
    assert client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "text", "body": "   ",
    }).status_code == 422

    app.dependency_overrides.clear()


def test_plan_share_requires_a_plan_id(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "share_no_plan"))
    room = _make_room(client)

    assert client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "plan_share", "body": "look",
    }).status_code == 422

    app.dependency_overrides.clear()


def test_posting_an_unknown_plan_is_404(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "share_ghost"))
    room = _make_room(client)

    assert client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "plan_share", "plan_id": str(uuid.uuid4()),
    }).status_code == 404

    app.dependency_overrides.clear()


def test_unknown_message_kind_is_rejected(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "bad_kind"))
    room = _make_room(client)

    assert client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "carrier_pigeon", "body": "coo",
    }).status_code == 422

    app.dependency_overrides.clear()


def test_non_member_cannot_read_or_post_messages(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "closed_owner")
    _act_as(owner)
    room = _make_room(client)
    client.post(f"/rooms/{room['id']}/messages", json={"kind": "text", "body": "secret"})

    _act_as(_make_user(db_session, "closed_stranger"))
    read = client.get(f"/rooms/{room['id']}/messages")
    assert read.status_code == 403
    assert "secret" not in read.text
    assert client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "text", "body": "hi",
    }).status_code == 403

    app.dependency_overrides.clear()


def test_messages_on_an_unknown_room_are_404(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "msg_404"))
    ghost = uuid.uuid4()
    assert client.get(f"/rooms/{ghost}/messages").status_code == 404
    assert client.post(f"/rooms/{ghost}/messages", json={
        "kind": "text", "body": "hi",
    }).status_code == 404
    app.dependency_overrides.clear()


# ------------------------------------------------------------- proposals

def test_member_can_propose_a_time(db_session):
    client = _client(db_session)
    proposer = _make_user(db_session, "prop_owner")
    _act_as(proposer)
    room = _make_room(client)

    resp = _propose(client, room["id"], body="works for me?")
    assert resp.status_code == 201
    body = resp.json()
    assert body["room_id"] == room["id"]
    assert body["proposer_id"] == str(proposer.id)
    assert body["status"] == "proposed"
    assert body["confirmed_at"] is None
    assert body["confirmations"] == []
    assert body["confirmed_by_me"] is False
    assert body["member_count"] == 1

    # The proposal shows up in the room thread as a card.
    messages = client.get(f"/rooms/{room['id']}/messages").json()
    assert len(messages) == 1
    assert messages[0]["kind"] == "time_proposal"
    assert messages[0]["body"] == "works for me?"
    assert messages[0]["time_proposal"]["id"] == body["id"]

    app.dependency_overrides.clear()


def test_proposal_rejects_end_before_start(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "prop_backwards"))
    room = _make_room(client)

    resp = client.post(f"/rooms/{room['id']}/proposals", json={
        "starts_at": SLOT_END.isoformat(),
        "ends_at": SLOT_START.isoformat(),
    })
    assert resp.status_code == 422

    app.dependency_overrides.clear()


def test_list_proposals_for_a_room(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "prop_list"))
    room = _make_room(client)
    first = _propose(client, room["id"]).json()

    listed = client.get(f"/rooms/{room['id']}/proposals")
    assert listed.status_code == 200
    assert [p["id"] for p in listed.json()] == [first["id"]]

    app.dependency_overrides.clear()


def test_non_member_cannot_propose_or_list_proposals(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "prop_owner2")
    _act_as(owner)
    room = _make_room(client)
    _propose(client, room["id"])

    _act_as(_make_user(db_session, "prop_stranger"))
    assert client.get(f"/rooms/{room['id']}/proposals").status_code == 403
    assert _propose(client, room["id"]).status_code == 403

    app.dependency_overrides.clear()


# ---------------------------------------------------------- confirmation

def test_confirming_records_the_members_confirmation(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "conf_owner")
    other = _make_user(db_session, "conf_other")
    _act_as(owner)
    room = _make_room(client)
    _act_as(other)
    client.post(f"/rooms/{room['id']}/join")

    _act_as(owner)
    proposal = _propose(client, room["id"]).json()

    resp = client.post(f"/rooms/{room['id']}/proposals/{proposal['id']}/confirm")
    assert resp.status_code == 200
    body = resp.json()
    assert body["confirmed_by_me"] is True
    assert [c["user_id"] for c in body["confirmations"]] == [str(owner.id)]
    assert body["member_count"] == 2
    # One of two members: still waiting.
    assert body["status"] == "proposed"
    assert body["confirmed_at"] is None

    app.dependency_overrides.clear()


def test_all_members_confirming_flips_the_proposal_to_confirmed(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "flip_owner")
    other = _make_user(db_session, "flip_other")
    _act_as(owner)
    room = _make_room(client)
    _act_as(other)
    client.post(f"/rooms/{room['id']}/join")

    _act_as(owner)
    proposal = _propose(client, room["id"]).json()
    client.post(f"/rooms/{room['id']}/proposals/{proposal['id']}/confirm")

    _act_as(other)
    resp = client.post(f"/rooms/{room['id']}/proposals/{proposal['id']}/confirm")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "confirmed"
    assert body["confirmed_at"] is not None
    assert len(body["confirmations"]) == 2

    row = db_session.query(TimeProposal).filter(
        TimeProposal.id == uuid.UUID(proposal["id"])
    ).one()
    db_session.refresh(row)
    assert row.status == "confirmed"
    assert row.confirmed_at is not None

    app.dependency_overrides.clear()


def test_confirming_twice_is_idempotent(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "idem_owner")
    _make_user(db_session, "idem_other")
    _act_as(owner)
    room = _make_room(client)
    proposal = _propose(client, room["id"]).json()

    first = client.post(f"/rooms/{room['id']}/proposals/{proposal['id']}/confirm").json()
    second = client.post(f"/rooms/{room['id']}/proposals/{proposal['id']}/confirm").json()
    assert second["status"] == "confirmed"
    assert len(second["confirmations"]) == 1
    # The confirm timestamp isn't bumped by a repeat click.
    assert second["confirmed_at"] == first["confirmed_at"]

    assert db_session.query(TimeProposalConfirmation).filter(
        TimeProposalConfirmation.proposal_id == uuid.UUID(proposal["id"])
    ).count() == 1

    app.dependency_overrides.clear()


def test_solo_room_confirms_immediately(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "solo_owner"))
    room = _make_room(client)
    proposal = _propose(client, room["id"]).json()

    body = client.post(f"/rooms/{room['id']}/proposals/{proposal['id']}/confirm").json()
    assert body["status"] == "confirmed"

    app.dependency_overrides.clear()


def test_non_member_cannot_confirm(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "cnf_owner")
    _act_as(owner)
    room = _make_room(client)
    proposal = _propose(client, room["id"]).json()

    _act_as(_make_user(db_session, "cnf_stranger"))
    resp = client.post(f"/rooms/{room['id']}/proposals/{proposal['id']}/confirm")
    assert resp.status_code == 403

    assert db_session.query(TimeProposalConfirmation).count() == 0

    app.dependency_overrides.clear()


def test_confirming_a_proposal_from_another_room_is_404(db_session):
    client = _client(db_session)
    owner = _make_user(db_session, "xroom_owner")
    _act_as(owner)
    room_a = _make_room(client, name="A")
    room_b = _make_room(client, name="B")
    proposal = _propose(client, room_a["id"]).json()

    resp = client.post(f"/rooms/{room_b['id']}/proposals/{proposal['id']}/confirm")
    assert resp.status_code == 404

    app.dependency_overrides.clear()


# ------------------------------------------------------------ day view

def test_availability_returns_busy_blocks_per_member(db_session):
    client = _client(db_session)
    owner = _make_user(
        db_session, "avail_owner",
        google_calendar_refresh_token="refresh-abc",
        google_calendar_connected_at=datetime.now(timezone.utc),
    )
    other = _make_user(db_session, "avail_other")
    _act_as(owner)
    room = _make_room(client)
    _act_as(other)
    client.post(f"/rooms/{room['id']}/join")
    _act_as(owner)

    events = MagicMock(status_code=200, json=lambda: {"items": [
        {"summary": "Standup",
         "start": {"dateTime": SLOT_START.isoformat()},
         "end": {"dateTime": SLOT_END.isoformat()}},
        {"summary": "Holiday", "start": {"date": "2026-08-25"},
         "end": {"date": "2026-08-26"}},
    ]})
    with patch("app.routers.calendar._fresh_access_token", return_value="tok"), \
            patch("app.routers.calendar.httpx.get", return_value=events):
        resp = client.get(f"/rooms/{room['id']}/availability", params={
            "day_start": SLOT_START.isoformat(), "day_end": SLOT_END.isoformat(),
        })

    assert resp.status_code == 200
    members = {m["user_id"]: m for m in resp.json()["members"]}
    assert members[str(owner.id)]["connected"] is True
    # The all-day event has no dateTime and isn't a busy block.
    assert len(members[str(owner.id)]["busy"]) == 1
    assert members[str(other.id)]["connected"] is False
    assert members[str(other.id)]["busy"] == []

    app.dependency_overrides.clear()


def test_availability_degrades_when_google_is_unreachable(db_session):
    client = _client(db_session)
    owner = _make_user(
        db_session, "avail_down",
        google_calendar_refresh_token="refresh-abc",
        google_calendar_connected_at=datetime.now(timezone.utc),
    )
    _act_as(owner)
    room = _make_room(client)

    def boom(*args, **kwargs):
        raise Exception("google is down")

    with patch("app.routers.calendar._fresh_access_token", return_value="tok"), \
            patch("app.routers.calendar.httpx.get", side_effect=boom):
        resp = client.get(f"/rooms/{room['id']}/availability", params={
            "day_start": SLOT_START.isoformat(), "day_end": SLOT_END.isoformat(),
        })

    assert resp.status_code == 200
    assert resp.json()["members"][0]["busy"] == []

    app.dependency_overrides.clear()


def test_non_member_cannot_read_availability(db_session):
    client = _client(db_session)
    _act_as(_make_user(db_session, "avail_owner2"))
    room = _make_room(client)

    _act_as(_make_user(db_session, "avail_stranger"))
    resp = client.get(f"/rooms/{room['id']}/availability", params={
        "day_start": SLOT_START.isoformat(), "day_end": SLOT_END.isoformat(),
    })
    assert resp.status_code == 403

    app.dependency_overrides.clear()


def test_room_message_rows_carry_the_expected_columns(db_session):
    """Guards the kind/FK invariant at the row level, not just the API."""
    client = _client(db_session)
    owner = _make_user(db_session, "row_owner")
    _act_as(owner)
    room = _make_room(client)
    plan = _make_plan(db_session, owner)
    client.post(f"/rooms/{room['id']}/messages", json={
        "kind": "plan_share", "plan_id": str(plan.id),
    })

    row = db_session.query(RoomMessage).filter(
        RoomMessage.room_id == uuid.UUID(room["id"])
    ).one()
    assert row.kind == "plan_share"
    assert row.plan_id == plan.id
    assert row.time_proposal_id is None
    assert row.body is None

    app.dependency_overrides.clear()
