from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def ensure_postgres_extensions(connection) -> None:
    """PostGIS is required for plans/rooms. vector is optional (embeddings)."""
    connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    try:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception:
        pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
