from unittest.mock import patch
from uuid import uuid4

from app.models import User
from app.nebius import why_meet_lines


def _user(**kwargs):
    defaults = dict(
        id=uuid4(),
        email="a@example.com",
        first_name="Ada",
        headline=None,
        bio_text=None,
        intent_tags=None,
    )
    defaults.update(kwargs)
    return User(**defaults)


def test_why_meet_heuristic_without_api_key():
    viewer = _user(intent_tags=["co_founder", "customers"])
    other = _user(first_name="Priya", intent_tags=["co_founder", "investors"])

    lines = why_meet_lines(viewer, [other])

    assert other.id in lines
    assert "co founder" in lines[other.id].lower()


def test_why_meet_uses_nebius_when_configured(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "nebius_api_key", "nb_test")
    viewer = _user(first_name="Demo", intent_tags=["customers"])
    other = _user(first_name="Marcus", headline="Angel")

    with patch("app.nebius.httpx.post") as mock_post:
        mock_post.return_value.raise_for_status = lambda: None
        mock_post.return_value.json.return_value = {
            "choices": [{"message": {"content": '["Marcus is raising and you want customers."]'}}],
        }
        lines = why_meet_lines(viewer, [other])

    assert lines[other.id] == "Marcus is raising and you want customers."
    assert mock_post.call_args.kwargs["json"]["model"] == "google/gemma-3-27b-it"
    assert mock_post.call_args[0][0].endswith("/chat/completions")


def test_why_meet_falls_back_when_nebius_errors(monkeypatch):
    from app.config import settings
    import httpx

    monkeypatch.setattr(settings, "nebius_api_key", "nb_test")
    viewer = _user(first_name="Demo")
    other = _user(first_name="Priya", headline="PM at a startup")

    with patch("app.nebius.httpx.post", side_effect=httpx.TimeoutException("nope")):
        lines = why_meet_lines(viewer, [other])

    assert "Priya" in lines[other.id]
    assert "headline" in lines[other.id].lower() or "working on" in lines[other.id].lower()
