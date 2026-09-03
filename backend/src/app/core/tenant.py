from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import AppError
from app.core.seed import LOCAL_ORGANIZATION_ID, LOCAL_USER_ID
from app.organizations.models import OrganizationUser


@dataclass(frozen=True)
class TenantContext:
    organization_id: UUID
    user_id: UUID
    role: str


def get_tenant_context(session: Session = Depends(get_db)) -> TenantContext:
    if not get_settings().is_local_identity_allowed:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)

    link = session.scalar(
        select(OrganizationUser).where(
            OrganizationUser.organization_id == LOCAL_ORGANIZATION_ID,
            OrganizationUser.user_id == LOCAL_USER_ID,
            OrganizationUser.status == "ACTIVE",
        )
    )
    if link is None:
        raise AppError(
            "FOUNDATION_NOT_INITIALIZED",
            "A fundação local ainda não foi inicializada.",
            status_code=404,
        )
    return TenantContext(
        organization_id=link.organization_id,
        user_id=link.user_id,
        role=link.role,
    )
