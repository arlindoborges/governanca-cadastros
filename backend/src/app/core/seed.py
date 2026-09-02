from uuid import UUID

from sqlalchemy.orm import Session

from app.organizations.models import Organization, OrganizationUser, User

LOCAL_ORGANIZATION_ID = UUID("a1e1c3f4-1111-4111-8111-000000000001")
LOCAL_USER_ID = UUID("a1e1c3f4-1111-4111-8111-000000000002")
LOCAL_ORGANIZATION_USER_ID = UUID("a1e1c3f4-1111-4111-8111-000000000003")
LOCAL_ORGANIZATION_NAME = "Organização Local"
LOCAL_USER_NAME = "Usuário Local"
LOCAL_USER_EMAIL = "local@localhost"
LOCAL_ROLE = "operator"
STATUS_ACTIVE = "ACTIVE"


def ensure_local_foundation(session: Session) -> None:
    organization = session.get(Organization, LOCAL_ORGANIZATION_ID)
    if organization is None:
        session.add(
            Organization(
                id=LOCAL_ORGANIZATION_ID,
                name=LOCAL_ORGANIZATION_NAME,
                status=STATUS_ACTIVE,
            )
        )
    else:
        organization.name = LOCAL_ORGANIZATION_NAME
        organization.status = STATUS_ACTIVE

    user = session.get(User, LOCAL_USER_ID)
    if user is None:
        session.add(
            User(
                id=LOCAL_USER_ID,
                name=LOCAL_USER_NAME,
                email=LOCAL_USER_EMAIL,
                status=STATUS_ACTIVE,
            )
        )
    else:
        user.name = LOCAL_USER_NAME
        user.email = LOCAL_USER_EMAIL
        user.status = STATUS_ACTIVE

    session.flush()

    link = session.get(OrganizationUser, LOCAL_ORGANIZATION_USER_ID)
    if link is None:
        session.add(
            OrganizationUser(
                id=LOCAL_ORGANIZATION_USER_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                user_id=LOCAL_USER_ID,
                role=LOCAL_ROLE,
                status=STATUS_ACTIVE,
            )
        )
    else:
        link.role = LOCAL_ROLE
        link.status = STATUS_ACTIVE

    session.commit()
