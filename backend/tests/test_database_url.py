import pytest

from app.database_url import (
    LOCAL_DEFAULT,
    normalize_database_url,
    resolve_database_url,
)


def test_normalize_render_postgres_scheme():
    assert normalize_database_url(
        "postgres://u:p@dpg-abc/orbit"
    ) == "postgresql+psycopg://u:p@dpg-abc/orbit"
    assert normalize_database_url(
        "postgresql://u:p@dpg-abc/orbit"
    ) == "postgresql+psycopg://u:p@dpg-abc/orbit"


def test_resolve_prefers_process_env_over_localhost_fallback(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://prod:secret@dpg-xyz/orbit")
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("RENDER_SERVICE_ID", raising=False)
    assert resolve_database_url(LOCAL_DEFAULT) == "postgresql+psycopg://prod:secret@dpg-xyz/orbit"


def test_resolve_on_render_rejects_localhost(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://stayconnected:localdev@127.0.0.1:5434/stayconnected")
    with pytest.raises(RuntimeError, match="localhost"):
        resolve_database_url()


def test_resolve_on_render_requires_env(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="must be set"):
        resolve_database_url()


def test_local_default_when_unset(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("RENDER_SERVICE_ID", raising=False)
    assert resolve_database_url() == LOCAL_DEFAULT
