from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.tenant import TenantContext, get_tenant_context
from app.governance.schemas import ActiveGovernanceProfileResponse
from app.governance.service import get_active_governance_profile

router = APIRouter(prefix="/governance", tags=["governance"])


@router.get("/profile/active", response_model=ActiveGovernanceProfileResponse)
def read_active_profile(
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ActiveGovernanceProfileResponse:
    return get_active_governance_profile(session, tenant)
