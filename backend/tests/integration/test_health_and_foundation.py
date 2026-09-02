from uuid import uuid4

from sqlalchemy.exc import IntegrityError

from app.core.db import SessionLocal
from app.core.seed import (
    LOCAL_ORGANIZATION_ID,
    LOCAL_ROLE,
    LOCAL_USER_EMAIL,
    LOCAL_USER_ID,
)
from app.organizations.models import Organization


def test_live_does_not_require_database(migrated_client) -> None:
    response = migrated_client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_reaches_postgresql(migrated_client) -> None:
    response = migrated_client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_foundation_reads_seeded_tenant(migrated_client) -> None:
    response = migrated_client.get("/api/v1/foundation")
    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["organization"]["id"] == str(LOCAL_ORGANIZATION_ID)
    assert payload["organization"]["name"] == "Organização Local"
    assert payload["organization"]["status"] == "ACTIVE"
    assert payload["user"]["id"] == str(LOCAL_USER_ID)
    assert payload["user"]["email"] == LOCAL_USER_EMAIL
    assert payload["role"] == LOCAL_ROLE


def test_organization_status_rejects_unknown_value() -> None:
    session = SessionLocal()
    try:
        session.add(
            Organization(
                id=uuid4(),
                name="Inválida",
                status="UNKNOWN",
            )
        )
        session.flush()
        raise AssertionError("CHECK de status deveria rejeitar UNKNOWN")
    except IntegrityError:
        session.rollback()
    finally:
        session.close()
