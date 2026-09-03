from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class GovernanceProfileVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    governance_profile_id: UUID
    version_number: int
    status: str
    created_at: datetime


class ActiveGovernanceProfileData(BaseModel):
    profile_id: UUID
    profile_name: str
    version: GovernanceProfileVersionRead


class ActiveGovernanceProfileResponse(BaseModel):
    data: ActiveGovernanceProfileData
