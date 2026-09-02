from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.seed import LOCAL_ORGANIZATION_ID, LOCAL_USER_ID
from app.organizations.models import Organization, OrganizationUser, User
from app.organizations.schemas import FoundationData, FoundationOrganization, FoundationUser


def get_local_foundation(session: Session) -> FoundationData:
    organization = session.get(Organization, LOCAL_ORGANIZATION_ID)
    user = session.get(User, LOCAL_USER_ID)
    link = session.scalar(
        select(OrganizationUser).where(
            OrganizationUser.organization_id == LOCAL_ORGANIZATION_ID,
            OrganizationUser.user_id == LOCAL_USER_ID,
            OrganizationUser.status == "ACTIVE",
        )
    )
    if organization is None or user is None or link is None:
        raise AppError(
            "FOUNDATION_NOT_INITIALIZED",
            "A fundação local ainda não foi inicializada.",
            status_code=404,
        )
    return FoundationData(
        organization=FoundationOrganization.model_validate(organization),
        user=FoundationUser.model_validate(user),
        role=link.role,
    )
