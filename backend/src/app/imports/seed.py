from uuid import UUID

from sqlalchemy.orm import Session

from app.core.seed import LOCAL_ORGANIZATION_ID
from app.imports.models import SourceSystem

LOCAL_SOURCE_SYSTEM_ID = UUID("a1e1c3f4-1111-4111-8111-000000000010")
LOCAL_SOURCE_SYSTEM_NAME = "Sistema Local"
STATUS_ACTIVE = "ACTIVE"


def ensure_local_source_system(session: Session) -> None:
    system = session.get(SourceSystem, LOCAL_SOURCE_SYSTEM_ID)
    if system is None:
        session.add(
            SourceSystem(
                id=LOCAL_SOURCE_SYSTEM_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                name=LOCAL_SOURCE_SYSTEM_NAME,
                description="Sistema de origem do ambiente local.",
                status=STATUS_ACTIVE,
            )
        )
    else:
        system.organization_id = LOCAL_ORGANIZATION_ID
        system.name = LOCAL_SOURCE_SYSTEM_NAME
        system.status = STATUS_ACTIVE
    session.commit()
