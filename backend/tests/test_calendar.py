from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from urllib.parse import urlparse, parse_qs

from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.models import User
from app.security import create_access_token

DAY_START = "2026-08-24T00:00:00-07:00"
DAY_END = "2026-08-25T00:00:00-07:00"

CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
GMAIL_LIST_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages"


def _client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def _user(db_session, email="cal@example.com", **kwargs):
    user = User(email=email, **kwargs)
    db_session.add(user)
    db_session.commit()
    return user


def _connected_user(db_session, email):
    return _user(
        db_session,
        email=email,
        google_calendar_refresh_token="refresh-abc",
        google_calendar_connected_at=datetime.now(timezone.utc),
    )


def _auth(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def _ok(payload):
    return MagicMock(status_code=200, json=lambda: payload)


def _subject(text):
    return _ok({"payload": {"headers": [{"name": "Subject", "value": text}]}})


def _router(calendar=None, gmail_list=None, gmail_messages=None):
    """Both sources go through httpx.get, so route the mock by URL. Anything a
    test doesn't supply raises, standing in for that source being broken."""
    def handler(url, **kwargs):
        if url == CALENDAR_URL:
            if calendar is None:
                raise Exception("calendar unavailable")
            return calendar
        if url == GMAIL_LIST_URL:
            if gmail_list is None:
                raise Exception("gmail unavailable")
            return gmail_list
        if url.startswith(f"{GMAIL_LIST_URL}/"):
            return (gmail_messages or {})[url.rsplit("/", 1)[1]]
        raise AssertionError(f"unexpected URL {url}")
    return handler


def _get_candidates(client, user):
    return client.get(
        "/me/calendar/candidates",
        params={"day_start": DAY_START, "day_end": DAY_END},
        headers=_auth(user),
    )


def test_connect_redirects_to_google_consent(db_session):
    client = _client(db_session)
    user = _user(db_session)
    token = create_access_token(user.id)

    res = client.get(f"/me/calendar/connect?token={token}", follow_redirects=False)
    assert res.status_code == 307

    location = res.headers["location"]
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    params = parse_qs(urlparse(location).query)
    assert params["access_type"] == ["offline"]
    assert params["prompt"] == ["consent"]
    # Both scopes in one grant — Gmail is a second candidate source, not a
    # second OAuth flow.
    assert params["scope"] == [
        "https://www.googleapis.com/auth/calendar.readonly"
        " https://www.googleapis.com/auth/gmail.readonly"
    ]
    assert params["response_type"] == ["code"]
    # One shared, already-allow-listed redirect URI for every Google flow.
    assert params["redirect_uri"] == ["http://localhost:8001/auth/google/callback"]
    assert params["state"] == [f"calendar:{token}"]

    app.dependency_overrides.clear()


def test_connect_rejects_invalid_token(db_session):
    client = _client(db_session)
    res = client.get("/me/calendar/connect?token=not-a-jwt", follow_redirects=False)
    assert res.status_code == 401
    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.post")
def test_shared_callback_stores_refresh_token_and_redirects(mock_post, db_session):
    client = _client(db_session)
    user = _user(db_session, email="cb@example.com")
    token = create_access_token(user.id)
    mock_post.return_value = MagicMock(
        status_code=200,
        json=lambda: {"access_token": "acc", "refresh_token": "refresh-abc"},
    )

    res = client.get(
        f"/auth/google/callback?code=auth-code&state=calendar:{token}", follow_redirects=False,
    )
    assert res.status_code == 307
    assert res.headers["location"] == "http://localhost:3000/today?calendar=connected"

    # The exchange must reuse the same redirect_uri the consent request used.
    _, kwargs = mock_post.call_args
    assert kwargs["data"]["redirect_uri"] == "http://localhost:8001/auth/google/callback"

    db_session.refresh(user)
    assert user.google_calendar_refresh_token == "refresh-abc"
    assert user.google_calendar_connected_at is not None

    app.dependency_overrides.clear()


def test_shared_callback_with_error_param_redirects_to_error(db_session):
    client = _client(db_session)
    user = _user(db_session, email="cberr@example.com")
    token = create_access_token(user.id)
    res = client.get(
        f"/auth/google/callback?error=access_denied&state=calendar:{token}",
        follow_redirects=False,
    )
    assert res.status_code == 307
    assert res.headers["location"] == "http://localhost:3000/today?calendar=error"
    app.dependency_overrides.clear()


def test_shared_callback_with_invalid_state_redirects_to_error(db_session):
    client = _client(db_session)
    res = client.get(
        "/auth/google/callback?code=auth-code&state=calendar:not-a-jwt", follow_redirects=False,
    )
    assert res.status_code == 307
    assert res.headers["location"] == "http://localhost:3000/today?calendar=error"
    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.post")
def test_shared_callback_with_failed_exchange_redirects_to_error(mock_post, db_session):
    client = _client(db_session)
    user = _user(db_session, email="cbfail@example.com")
    token = create_access_token(user.id)
    mock_post.return_value = MagicMock(status_code=400, json=lambda: {"error": "invalid_grant"})

    res = client.get(
        f"/auth/google/callback?code=auth-code&state=calendar:{token}", follow_redirects=False,
    )
    assert res.status_code == 307
    assert res.headers["location"] == "http://localhost:3000/today?calendar=error"

    db_session.refresh(user)
    assert user.google_calendar_refresh_token is None

    app.dependency_overrides.clear()


@patch("app.routers.auth.httpx.get")
@patch("app.routers.auth.httpx.post")
def test_shared_callback_with_login_state_runs_login_path(mock_post, mock_get, db_session):
    client = _client(db_session)
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "google-access-token"})
    mock_get.return_value = MagicMock(
        status_code=200,
        json=lambda: {"sub": "google-shared-1", "email": "sharedlogin@example.com"},
    )

    res = client.get("/auth/google/callback?code=auth-code&state=login", follow_redirects=False)
    assert res.status_code == 307
    assert res.headers["location"].startswith("http://localhost:3000/auth/google/callback?code=")

    user = db_session.query(User).filter(User.email == "sharedlogin@example.com").one()
    assert user.google_id == "google-shared-1"
    assert user.google_calendar_refresh_token is None

    app.dependency_overrides.clear()


def test_disconnect_clears_stored_token(db_session):
    client = _client(db_session)
    user = _user(
        db_session,
        email="disc@example.com",
        google_calendar_refresh_token="refresh-abc",
        google_calendar_connected_at=datetime.now(timezone.utc),
    )

    res = client.post("/me/calendar/disconnect", headers=_auth(user))
    assert res.status_code == 200
    assert res.json() == {"ok": True}

    db_session.refresh(user)
    assert user.google_calendar_refresh_token is None
    assert user.google_calendar_connected_at is None

    app.dependency_overrides.clear()


def test_candidates_when_not_connected(db_session):
    client = _client(db_session)
    user = _user(db_session, email="notconn@example.com")

    res = _get_candidates(client, user)
    assert res.status_code == 200
    assert res.json() == {"connected": False, "candidates": []}

    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.get")
@patch("app.routers.calendar.httpx.post")
def test_candidates_from_calendar_excludes_all_day_and_location_less(mock_post, mock_get, db_session):
    client = _client(db_session)
    user = _connected_user(db_session, "cands@example.com")
    mock_post.return_value = _ok({"access_token": "fresh"})
    mock_get.side_effect = _router(
        calendar=_ok({"items": [
            {
                "summary": "Dentist",
                "location": "123 Main St",
                "start": {"dateTime": "2026-08-24T09:00:00-07:00"},
                "end": {"dateTime": "2026-08-24T09:30:00-07:00"},
            },
            {
                "summary": "AI Founders Mixer",
                "location": "SoMa StrEat Food Park",
                "start": {"dateTime": "2026-08-24T18:00:00-07:00"},
                "end": {"dateTime": "2026-08-24T20:00:00-07:00"},
            },
            # All-day: bare `date`, no `dateTime` — not a candidate.
            {
                "summary": "Company Offsite",
                "location": "Tahoe",
                "start": {"date": "2026-08-24"},
                "end": {"date": "2026-08-25"},
            },
            # Timed but no location — nothing to pin to.
            {
                "summary": "Standup",
                "start": {"dateTime": "2026-08-24T09:45:00-07:00"},
                "end": {"dateTime": "2026-08-24T10:00:00-07:00"},
            },
        ]}),
        gmail_list=_ok({"messages": []}),
    )

    res = _get_candidates(client, user)
    assert res.status_code == 200
    body = res.json()
    assert body["connected"] is True
    # Soonest first, and only the two located, timed events.
    assert [c["title"] for c in body["candidates"]] == ["Dentist", "AI Founders Mixer"]
    assert all(c["source"] == "calendar" for c in body["candidates"])
    assert body["candidates"][1]["location"] == "SoMa StrEat Food Park"
    assert body["candidates"][1]["starts_at"].startswith("2026-08-24T18:00:00")
    assert body["candidates"][1]["ends_at"].startswith("2026-08-24T20:00:00")

    # Google was queried with the caller's local day boundaries.
    calendar_call = next(c for c in mock_get.call_args_list if c.args[0] == CALENDAR_URL)
    assert calendar_call.kwargs["params"]["timeMin"] == DAY_START
    assert calendar_call.kwargs["params"]["timeMax"] == DAY_END
    assert calendar_call.kwargs["params"]["singleEvents"] == "true"

    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.get")
@patch("app.routers.calendar.httpx.post")
def test_candidates_from_gmail_use_subject_and_have_no_time(mock_post, mock_get, db_session):
    client = _client(db_session)
    user = _connected_user(db_session, "gmailcand@example.com")
    mock_post.return_value = _ok({"access_token": "fresh"})
    mock_get.side_effect = _router(
        calendar=_ok({"items": []}),
        gmail_list=_ok({"messages": [{"id": "m1"}, {"id": "m2"}]}),
        gmail_messages={
            "m1": _subject("You're going to Rooftop Demo Night"),
            "m2": _subject("Your Meetup RSVP is confirmed"),
        },
    )

    res = _get_candidates(client, user)
    body = res.json()
    assert body["connected"] is True
    assert body["candidates"] == [
        {"source": "gmail", "title": "You're going to Rooftop Demo Night",
         "location": None, "starts_at": None, "ends_at": None},
        {"source": "gmail", "title": "Your Meetup RSVP is confirmed",
         "location": None, "starts_at": None, "ends_at": None},
    ]

    list_call = next(c for c in mock_get.call_args_list if c.args[0] == GMAIL_LIST_URL)
    assert list_call.kwargs["params"]["q"] == (
        "(from:lu.ma OR from:luma.com OR from:meetup.com OR from:eventbrite.com) newer_than:45d"
    )
    assert list_call.kwargs["params"]["maxResults"] == 5

    detail_call = next(
        c for c in mock_get.call_args_list if c.args[0] == f"{GMAIL_LIST_URL}/m1"
    )
    assert detail_call.kwargs["params"] == {"format": "metadata", "metadataHeaders": "Subject"}

    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.get")
@patch("app.routers.calendar.httpx.post")
def test_candidates_merge_calendar_first_then_gmail_capped_at_four(mock_post, mock_get, db_session):
    client = _client(db_session)
    user = _connected_user(db_session, "merged@example.com")
    mock_post.return_value = _ok({"access_token": "fresh"})
    mock_get.side_effect = _router(
        calendar=_ok({"items": [
            {
                "summary": "Late Event",
                "location": "Mission",
                "start": {"dateTime": "2026-08-24T20:00:00-07:00"},
                "end": {"dateTime": "2026-08-24T22:00:00-07:00"},
            },
            {
                "summary": "Early Event",
                "location": "SoMa",
                "start": {"dateTime": "2026-08-24T08:00:00-07:00"},
                "end": {"dateTime": "2026-08-24T09:00:00-07:00"},
            },
        ]}),
        gmail_list=_ok({"messages": [{"id": f"m{i}"} for i in range(1, 6)]}),
        gmail_messages={f"m{i}": _subject(f"Mail {i}") for i in range(1, 6)},
    )

    res = _get_candidates(client, user)
    body = res.json()
    assert [(c["source"], c["title"]) for c in body["candidates"]] == [
        ("calendar", "Early Event"),
        ("calendar", "Late Event"),
        ("gmail", "Mail 1"),
        ("gmail", "Mail 2"),
    ]

    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.get")
@patch("app.routers.calendar.httpx.post")
def test_candidates_when_neither_source_matches(mock_post, mock_get, db_session):
    client = _client(db_session)
    user = _connected_user(db_session, "nomatch@example.com")
    mock_post.return_value = _ok({"access_token": "fresh"})
    mock_get.side_effect = _router(
        calendar=_ok({"items": []}),
        gmail_list=_ok({}),
    )

    res = _get_candidates(client, user)
    assert res.json() == {"connected": True, "candidates": []}

    # Still connected — nothing cleared just because there was nothing to show.
    db_session.refresh(user)
    assert user.google_calendar_refresh_token == "refresh-abc"

    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.post")
def test_candidates_clears_revoked_refresh_token(mock_post, db_session):
    client = _client(db_session)
    user = _user(
        db_session,
        email="revoked@example.com",
        google_calendar_refresh_token="refresh-revoked",
        google_calendar_connected_at=datetime.now(timezone.utc),
    )
    mock_post.return_value = MagicMock(status_code=400, json=lambda: {"error": "invalid_grant"})

    res = _get_candidates(client, user)
    assert res.status_code == 200
    assert res.json() == {"connected": False, "candidates": []}

    db_session.refresh(user)
    assert user.google_calendar_refresh_token is None
    assert user.google_calendar_connected_at is None

    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.get")
@patch("app.routers.calendar.httpx.post")
def test_gmail_failure_still_returns_calendar_candidates(mock_post, mock_get, db_session):
    client = _client(db_session)
    user = _connected_user(db_session, "gmailfail@example.com")
    mock_post.return_value = _ok({"access_token": "fresh"})
    mock_get.side_effect = _router(calendar=_ok({"items": [{
        "summary": "AI Founders Mixer",
        "location": "SoMa",
        "start": {"dateTime": "2026-08-24T18:00:00-07:00"},
        "end": {"dateTime": "2026-08-24T20:00:00-07:00"},
    }]}))  # gmail_list omitted -> raises

    res = _get_candidates(client, user)
    assert res.status_code == 200
    body = res.json()
    assert body["connected"] is True
    assert [c["title"] for c in body["candidates"]] == ["AI Founders Mixer"]

    app.dependency_overrides.clear()


@patch("app.routers.calendar.httpx.get")
@patch("app.routers.calendar.httpx.post")
def test_calendar_failure_still_returns_gmail_candidates(mock_post, mock_get, db_session):
    client = _client(db_session)
    user = _connected_user(db_session, "calfail@example.com")
    mock_post.return_value = _ok({"access_token": "fresh"})
    mock_get.side_effect = _router(  # calendar omitted -> raises
        gmail_list=_ok({"messages": [{"id": "m1"}]}),
        gmail_messages={"m1": _subject("Rooftop Demo Night")},
    )

    res = _get_candidates(client, user)
    assert res.status_code == 200
    body = res.json()
    assert body["connected"] is True
    assert [(c["source"], c["title"]) for c in body["candidates"]] == [
        ("gmail", "Rooftop Demo Night"),
    ]

    app.dependency_overrides.clear()


def test_me_exposes_calendar_connected_flag(db_session):
    client = _client(db_session)
    user = _user(db_session, email="meflag@example.com")

    res = client.get("/me", headers=_auth(user))
    assert res.status_code == 200
    assert res.json()["google_calendar_connected"] is False
    assert "google_calendar_refresh_token" not in res.json()

    user.google_calendar_refresh_token = "refresh-abc"
    user.google_calendar_connected_at = datetime.now(timezone.utc)
    db_session.commit()

    res = client.get("/me", headers=_auth(user))
    assert res.json()["google_calendar_connected"] is True

    app.dependency_overrides.clear()


def test_create_plan_accepts_event_activity(db_session):
    client = _client(db_session)
    user = _user(db_session, email="eventplan@example.com")

    now = datetime.now(timezone.utc)
    res = client.post("/plans", json={
        "activity": "event",
        "openness": "open_to_chat",
        "detail": "AI Founders Mixer @ SoMa",
        "lat": 37.7749,
        "lon": -122.4194,
        "starts_at": now.isoformat(),
        "ends_at": (now + timedelta(hours=2)).isoformat(),
    }, headers=_auth(user))
    assert res.status_code == 201
    assert res.json()["activity"] == "event"

    app.dependency_overrides.clear()
