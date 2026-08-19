import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.config import settings

TEST_DATABASE_URL = settings.database_url.rsplit("/", 1)[0] + "/stayconnected_test"

@pytest.fixture(scope="session", autouse=True)
def _create_test_db():
    admin_engine = create_engine(settings.database_url.rsplit("/", 1)[0] + "/stayconnected", isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.exec_driver_sql("SELECT 1")  # verify connectivity early with a clear error
    yield

@pytest.fixture()
def db_session():
    engine = create_engine(TEST_DATABASE_URL)
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS postgis")
        conn.commit()
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()
    Base.metadata.drop_all(engine)
