from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from governanca.core.errors import AppError
from governanca.core.tenant import Tenant
from governanca.models.entities import ProductClassificationConfig, ProductClassificationNode
from governanca.services.pipeline import ensure_organization

MAX_DEPTH = 5
MIN_DEPTH = 1


def _get_config(session: Session, tenant: Tenant) -> ProductClassificationConfig:
    ensure_organization(session)
    config = session.get(ProductClassificationConfig, tenant.organization_id)
    if config is None:
        config = ProductClassificationConfig(organization_id=tenant.organization_id, depth_levels=3)
        session.add(config)
        session.flush()
    return config


def get_classification_state(session: Session, tenant: Tenant) -> dict:
    config = _get_config(session, tenant)
    nodes = session.scalars(
        select(ProductClassificationNode)
        .where(ProductClassificationNode.organization_id == tenant.organization_id)
        .order_by(ProductClassificationNode.level, ProductClassificationNode.sort_order, ProductClassificationNode.name)
    ).all()
    return {
        "depth_levels": config.depth_levels,
        "nodes": [_node_payload(n) for n in nodes],
        "tree": _build_tree(nodes),
    }


def _node_payload(node: ProductClassificationNode) -> dict:
    return {
        "id": str(node.id),
        "parent_id": str(node.parent_id) if node.parent_id else None,
        "level": node.level,
        "name": node.name,
        "description": node.description,
        "sort_order": node.sort_order,
    }


def _build_tree(nodes: list[ProductClassificationNode]) -> list[dict]:
    by_parent: dict[UUID | None, list[ProductClassificationNode]] = {}
    for node in nodes:
        by_parent.setdefault(node.parent_id, []).append(node)

    def walk(parent_id: UUID | None) -> list[dict]:
        children = by_parent.get(parent_id, [])
        return [
            {
                "id": str(n.id),
                "level": n.level,
                "name": n.name,
                "description": n.description,
                "sort_order": n.sort_order,
                "children": walk(n.id),
            }
            for n in children
        ]

    return walk(None)


def set_depth_levels(session: Session, tenant: Tenant, depth_levels: int) -> dict:
    if depth_levels < MIN_DEPTH or depth_levels > MAX_DEPTH:
        raise AppError(
            "VALIDATION_ERROR",
            f"Informe entre {MIN_DEPTH} e {MAX_DEPTH} níveis.",
            status_code=400,
        )

    config = _get_config(session, tenant)
    max_used = session.scalar(
        select(func.max(ProductClassificationNode.level)).where(
            ProductClassificationNode.organization_id == tenant.organization_id
        )
    )
    if max_used and depth_levels < max_used:
        raise AppError(
            "VALIDATION_ERROR",
            f"Não é possível reduzir para {depth_levels} níveis: já existem cadastros no nível {max_used}.",
            status_code=400,
        )

    config.depth_levels = depth_levels
    session.commit()
    session.refresh(config)
    return {"depth_levels": config.depth_levels}


def create_node(
    session: Session,
    tenant: Tenant,
    name: str,
    description: str | None,
    parent_id: UUID | None,
) -> dict:
    config = _get_config(session, tenant)
    level = 1
    if parent_id is not None:
        parent = session.get(ProductClassificationNode, parent_id)
        if parent is None or parent.organization_id != tenant.organization_id:
            raise AppError("NOT_FOUND", "Classificação pai não encontrada.", status_code=404)
        level = parent.level + 1
    if level > config.depth_levels:
        raise AppError(
            "VALIDATION_ERROR",
            f"O modelo permite no máximo {config.depth_levels} níveis.",
            status_code=400,
        )

    sort_query = select(func.coalesce(func.max(ProductClassificationNode.sort_order), -1)).where(
        ProductClassificationNode.organization_id == tenant.organization_id,
    )
    if parent_id is None:
        sort_query = sort_query.where(ProductClassificationNode.parent_id.is_(None))
    else:
        sort_query = sort_query.where(ProductClassificationNode.parent_id == parent_id)
    sort_order = session.scalar(sort_query)
    node = ProductClassificationNode(
        organization_id=tenant.organization_id,
        parent_id=parent_id,
        level=level,
        name=name.strip(),
        description=description.strip() if description else None,
        sort_order=int(sort_order or 0) + 1,
    )
    session.add(node)
    session.commit()
    session.refresh(node)
    return _node_payload(node)


def update_node(
    session: Session,
    tenant: Tenant,
    node_id: UUID,
    name: str,
    description: str | None,
) -> dict:
    node = session.get(ProductClassificationNode, node_id)
    if node is None or node.organization_id != tenant.organization_id:
        raise AppError("NOT_FOUND", "Classificação não encontrada.", status_code=404)
    node.name = name.strip()
    node.description = description.strip() if description else None
    session.commit()
    session.refresh(node)
    return _node_payload(node)


def delete_node(session: Session, tenant: Tenant, node_id: UUID) -> None:
    node = session.get(ProductClassificationNode, node_id)
    if node is None or node.organization_id != tenant.organization_id:
        raise AppError("NOT_FOUND", "Classificação não encontrada.", status_code=404)
    session.delete(node)
    session.commit()
