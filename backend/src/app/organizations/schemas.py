from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FoundationOrganization(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: str


class FoundationUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    status: str


class FoundationData(BaseModel):
    organization: FoundationOrganization
    user: FoundationUser
    role: str


class FoundationResponse(BaseModel):
    data: FoundationData
