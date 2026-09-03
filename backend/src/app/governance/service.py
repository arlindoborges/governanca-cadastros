
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.tenant import TenantContext
from app.governance.models import GovernanceProfile, GovernanceProfileVersion
from app.governance.schemas import (
    ActiveGovernanceProfileData,
    ActiveGovernanceProfileResponse,
    GovernanceProfileVersionRead,
)


def get_active_governance_profile(
    session: Session, tenant: TenantContext
) -> ActiveGovernanceProfileResponse:
    version = session.scalar(
        select(GovernanceProfileVersion).where(
            GovernanceProfileVersion.organization_id == tenant.organization_id,
            GovernanceProfileVersion.status == "ACTIVE",
        )
    )
    if version is None:
        raise AppError(
            "GOVERNANCE_PROFILE_NOT_CONFIGURED",
            "Nenhum perfil de governança ativo está configurado.",
            status_code=404,
        )
    profile = session.get(GovernanceProfile, version.governance_profile_id)
    if profile is None or profile.organization_id != tenant.organization_id:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    return ActiveGovernanceProfileResponse(
        data=ActiveGovernanceProfileData(
            profile_id=profile.id,
            profile_name=profile.name,
            version=GovernanceProfileVersionRead.model_validate(version),
        )
    )
