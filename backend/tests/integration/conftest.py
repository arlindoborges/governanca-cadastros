from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.core.db import SessionLocal
from app.core.seed import ensure_local_foundation
from app.main import app

BACKEND_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def migrated_client() -> Iterator[TestClient]:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    command.upgrade(config, "head")
    session = SessionLocal()
    try:
        ensure_local_foundation(session)
    finally:
        session.close()
    with TestClient(app) as client:
        yield client
