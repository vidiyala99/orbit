from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context

from app.database_url import resolve_database_url
from app.db import Base
from app import models  # noqa: F401 — registers all tables on Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Never read sqlalchemy.url from alembic.ini (blank / leftover localhost).
# Never go through Settings.env_file. Process DATABASE_URL only, resolved
# at run time so tests can point Alembic at orbit_test.
def _database_url() -> str:
    return resolve_database_url()

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(_database_url(), poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
