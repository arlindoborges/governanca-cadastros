from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from governanca.core.db import get_db
from governanca.core.tenant import Tenant, local_tenant
from governanca.services import product_classification as svc

router = APIRouter(prefix="/product-classifications", tags=["product-classifications"])


def tenant() -> Tenant:
    return local_tenant()


class DepthConfigIn(BaseModel):
    depth_levels: int = Field(ge=1, le=5)


class ClassificationNodeIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    parent_id: UUID | None = None


class ClassificationNodeUpdateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


@router.get("")
def get_product_classifications(session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    return {"data": svc.get_classification_state(session, t)}


@router.put("/config")
def set_depth_config(
    body: DepthConfigIn, session: Session = Depends(get_db), t: Tenant = Depends(tenant)
) -> dict:
    return {"data": svc.set_depth_levels(session, t, body.depth_levels)}


@router.post("/nodes")
def create_classification_node(
    body: ClassificationNodeIn, session: Session = Depends(get_db), t: Tenant = Depends(tenant)
) -> dict:
    return {
        "data": svc.create_node(session, t, body.name, body.description, body.parent_id),
    }


@router.patch("/nodes/{node_id}")
def update_classification_node(
    node_id: UUID,
    body: ClassificationNodeUpdateIn,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {"data": svc.update_node(session, t, node_id, body.name, body.description)}


@router.delete("/nodes/{node_id}")
def delete_classification_node(
    node_id: UUID, session: Session = Depends(get_db), t: Tenant = Depends(tenant)
) -> dict:
    svc.delete_node(session, t, node_id)
    return {"data": {"deleted": True}}
