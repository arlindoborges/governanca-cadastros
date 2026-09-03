from dataclasses import dataclass
from uuid import UUID

LOCAL_ORG_ID = UUID("00000000-0000-4000-8000-000000000001")


@dataclass(frozen=True)
class Tenant:
    organization_id: UUID


def local_tenant() -> Tenant:
    return Tenant(organization_id=LOCAL_ORG_ID)
