from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import ProgrammingError

from app.pg_extensions import (
    PostgresCapabilities,
    ensure_postgres_extensions,
    get_capabilities,
    set_capabilities,
    try_create_extension,
)


@pytest.fixture(autouse=True)
def _reset_caps():
    yield
    set_capabilities(PostgresCapabilities(postgis=True, vector=True))


def test_try_create_extension_does_not_raise_when_missing():
    def execute(statement, *args, **kwargs):
        sql = str(getattr(statement, "text", statement))
        if "pg_extension" in sql:
            row = MagicMock()
            row.scalar.return_value = None
            return row
        if "CREATE EXTENSION" in sql:
            raise ProgrammingError("CREATE EXTENSION", {}, Exception("not available"))
        return MagicMock()

    connection = MagicMock()
    connection.execute.side_effect = execute
    assert try_create_extension(connection, "postgis") is False


def test_ensure_records_missing_extensions(monkeypatch):
    monkeypatch.setattr("app.pg_extensions.try_create_extension", lambda _c, name: False)
    caps = ensure_postgres_extensions(MagicMock())
    assert caps == PostgresCapabilities(postgis=False, vector=False)
    assert get_capabilities().postgis is False
