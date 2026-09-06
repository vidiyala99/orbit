from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.models import SyncRun, User
from app.people_fixtures import FIXTURE_EVENT_ID, FIXTURE_PEOPLE
from app.schemas import DEMO_EVENT_ID


def _client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _auth_client(db_session):
    client = next(_client(db_session))
    token = client.post("/auth/demo-login").json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client


def test_people_routes_require_auth(db_session):
    client = next(_client(db_session))
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.get("/people", headers=bad).status_code == 401
    assert client.post("/people", json={"name": "Ada"}, headers=bad).status_code == 401
    assert client.get("/sync-runs", headers=bad).status_code == 401
    assert client.post("/sync-runs", json={"source": "fixture"}, headers=bad).status_code == 401
    assert client.get(f"/events/{DEMO_EVENT_ID}/guests", headers=bad).status_code == 401


def test_demo_login_fixture_sync_lists_people_with_payloads(db_session):
    client = _auth_client(db_session)

    run = client.post("/sync-runs", json={"source": "fixture"})
    assert run.status_code == 201
    body = run.json()
    assert body["source"] == "fixture"
    assert body["status"] == "ok"
    assert body["error"] is None

    people = client.get("/people").json()
    assert len(people) >= 3
    names = {p["name"] for p in people}
    assert {"Alex Rivera", "Sam Okonkwo", "Riley Park"} <= names
    for person in people:
        assert person["note_payload"]
        assert person["dm_payload"]
        assert person["note_payload"] == person["note"]
        assert person["dm_payload"] == person["dm"]
        assert person["note"] != person["dm"]
        assert person["event_id"] == FIXTURE_EVENT_ID
        assert person["evidence"]
        assert all("source_id" in item and "quote" in item for item in person["evidence"])


def test_fixture_sync_is_idempotent(db_session):
    client = _auth_client(db_session)
    client.post("/sync-runs", json={"source": "fixture"})
    client.post("/sync-runs", json={"source": "fixture"})

    people = client.get("/people").json()
    assert len(people) == len(FIXTURE_PEOPLE)
    runs = client.get("/sync-runs").json()
    assert len(runs) == 2
    assert all(r["source"] == "fixture" for r in runs)


def test_event_guests_aliases_people_filtered_by_event(db_session):
    client = _auth_client(db_session)
    client.post("/sync-runs", json={"source": "fixture"})

    guests = client.get(f"/events/{DEMO_EVENT_ID}/guests")
    assert guests.status_code == 200
    guest_list = guests.json()
    assert len(guest_list) >= 3
    assert all(p["event_id"] == DEMO_EVENT_ID for p in guest_list)
    assert all(p.get("relevance") for p in guest_list)

    filtered = client.get("/people", params={"event_id": DEMO_EVENT_ID}).json()
    assert [p["id"] for p in filtered] == [p["id"] for p in guest_list]

    empty = client.get("/events/some-other-event/guests").json()
    assert empty == []


def test_patch_person_updates_note_and_dm_payloads(db_session):
    client = _auth_client(db_session)
    client.post("/sync-runs", json={"source": "fixture"})
    person = client.get("/people").json()[0]

    patched = client.patch(f"/people/{person['id']}", json={
        "note": "Updated long note with the same mixer facts, rewritten.",
        "dm": "Short rewritten DM.",
    })
    assert patched.status_code == 200
    body = patched.json()
    assert body["note"] == "Updated long note with the same mixer facts, rewritten."
    assert body["dm"] == "Short rewritten DM."
    assert body["note_payload"] == body["note"]
    assert body["dm_payload"] == body["dm"]

    fetched = client.get(f"/people/{person['id']}").json()
    assert fetched["note"] == body["note"]
    assert fetched["dm"] == body["dm"]


def test_create_person_and_get_by_id(db_session):
    client = _auth_client(db_session)
    created = client.post("/people", json={
        "name": "Jordan Hale",
        "role": "Engineer",
        "event_id": "other-meetup",
        "note": "Met at the hallway track.",
        "dm": "Jordan — good to meet you in the hallway.",
        "invite_state": "pending",
    })
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Jordan Hale"
    assert body["note_payload"] == "Met at the hallway track."
    assert body["dm_payload"] == "Jordan — good to meet you in the hallway."
    assert body["invite_state"] == "pending"
    assert body["pending_since"] is not None

    fetched = client.get(f"/people/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == body["id"]


def test_import_json_creates_sync_run_and_people(db_session):
    client = _auth_client(db_session)
    res = client.post("/people/import", json={
        "people": [
            {"name": "Casey Lin", "role": "PM", "event_id": "import-night", "note": "n", "dm": "d"},
            {"name": "Drew Ng", "email": "drew@example.com"},
        ],
    })
    assert res.status_code == 201
    body = res.json()
    assert body["created"] == 2
    assert {p["name"] for p in body["people"]} == {"Casey Lin", "Drew Ng"}

    listed = client.get("/people", params={"event_id": "import-night"}).json()
    assert len(listed) == 1
    assert listed[0]["name"] == "Casey Lin"

    runs = client.get("/sync-runs").json()
    assert len(runs) == 1
    assert runs[0]["source"] == "csv"
    assert runs[0]["status"] == "ok"


def test_import_csv_creates_people(db_session):
    client = _auth_client(db_session)
    csv_body = (
        "name,role,event_id,note,dm\n"
        "Mina Cho,Designer,csv-event,Long note about the booth.,Short booth DM.\n"
    )
    res = client.post(
        "/people/import",
        content=csv_body,
        headers={"Content-Type": "text/csv"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["created"] == 1
    assert body["people"][0]["name"] == "Mina Cho"
    assert body["people"][0]["note_payload"] == "Long note about the booth."
    assert body["people"][0]["dm_payload"] == "Short booth DM."

    run = db_session.query(SyncRun).one()
    assert run.source == "csv"
    assert run.status == "ok"


def test_people_are_scoped_to_the_signed_in_user(db_session):
    client = _auth_client(db_session)
    client.post("/sync-runs", json={"source": "fixture"})
    assert len(client.get("/people").json()) >= 3

    other = User(email="other-comms@example.com")
    db_session.add(other)
    db_session.commit()
    from app.security import create_access_token
    other_client = TestClient(app)
    app.dependency_overrides[get_db] = lambda: db_session
    other_list = other_client.get(
        "/people",
        headers={"Authorization": f"Bearer {create_access_token(other.id)}"},
    )
    assert other_list.status_code == 200
    assert other_list.json() == []
    app.dependency_overrides.clear()


def test_sync_runs_csv_source_is_rejected(db_session):
    client = _auth_client(db_session)
    res = client.post("/sync-runs", json={"source": "csv"})
    assert res.status_code == 400


def test_unknown_person_is_404(db_session):
    client = _auth_client(db_session)
    res = client.get("/people/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404


def test_health_still_ok_with_people_routes(db_session):
    client = next(_client(db_session))
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
