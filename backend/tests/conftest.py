from collections.abc import Generator
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session, sessionmaker

from governanca.core.config import get_settings
from governanca.core.db import Base
from governanca.main import create_app
from governanca.models import entities  # noqa: F401
from governanca.services.pipeline import ensure_organization


def _test_database_url() -> str:
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return explicit
    base = get_settings().database_url
    if base.rsplit("/", 1)[-1].endswith("_test"):
        return base
    return f"{base}_test"


def _ensure_test_database(url: str) -> None:
    parsed = make_url(url)
    if not parsed.database or not parsed.database.endswith("_test"):
        raise RuntimeError("Banco de testes deve terminar com _test.")

    admin_url = parsed.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": parsed.database},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{parsed.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def engine():
    url = _test_database_url()
    _ensure_test_database(url)
    eng = create_engine(url, pool_pre_ping=True)
    Base.metadata.drop_all(bind=eng)
    Base.metadata.create_all(bind=eng)
    with eng.connect() as conn:
        conn.execute(text("SELECT 1"))
    yield eng
    Base.metadata.drop_all(bind=eng)


@pytest.fixture
def db_session(engine) -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    TestingSessionLocal = sessionmaker(bind=connection, autoflush=False, autocommit=False)
    session = TestingSessionLocal()
    ensure_organization(session)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(engine) -> Generator[TestClient, None, None]:
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db() -> Generator[Session, None, None]:
        session = TestingSessionLocal()
        try:
            ensure_organization(session)
            yield session
        finally:
            session.close()

    app = create_app()
    from governanca.core.db import get_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
