from __future__ import annotations

from uuid import UUID

from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from governanca.core.db import get_db
from governanca.core.errors import AppError
from governanca.core.tenant import Tenant, local_tenant
from governanca.imports.columns import read_spreadsheet_headers, suggest_mapping, count_importable_records
from governanca.services import decision_config as config_svc
from governanca.services import pipeline as svc

router = APIRouter(tags=["api"])


def tenant() -> Tenant:
    return local_tenant()


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class SanitizationConfigIn(BaseModel):
    version: int = 1
    principles: list[str] = Field(default_factory=list)
    steps: list[dict] = Field(default_factory=list)


class MappingIn(BaseModel):
    source_code: str | None = None
    original_description: str | None = None
    original_unit: str | None = None


class DecisionIn(BaseModel):
    decision: str
    source_record_id: UUID | None = None
    candidate_id: UUID | None = None
    governance_group_code: str | None = None
    excluded_source_record_ids: list[UUID] = Field(default_factory=list)
    reason: str | None = None


class DiagnosticDispositionIn(BaseModel):
    source_record_id: UUID
    disposition: str = Field(pattern="^(MANTER|INATIVAR)$")


class MasterConversionFactorIn(BaseModel):
    master_id: UUID
    factor: float = Field(gt=0)


class MasterUnifyIn(BaseModel):
    selected_master_ids: list[UUID] = Field(min_length=2)
    target_master_id: UUID
    conversion_factors: list[MasterConversionFactorIn] = Field(default_factory=list)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/dashboard")
def dashboard(session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    svc.ensure_organization(session)
    summary = svc.dashboard_summary(session, t)
    config = config_svc.get_sanitization_config(session, t)
    summary["sanitization_configured"] = config is not None
    return {"data": summary}


@router.get("/sanitization-config")
def get_sanitization_config(session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    svc.ensure_organization(session)
    saved = config_svc.get_sanitization_config(session, t)
    if saved is None:
        return {"data": config_svc.get_default_sanitization_config()}
    return {"data": saved}


@router.put("/sanitization-config")
def save_sanitization_config(
    body: SanitizationConfigIn,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    svc.ensure_organization(session)
    return {"data": config_svc.save_sanitization_config(session, t, body.model_dump())}


@router.get("/projects")
def list_projects(session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    svc.ensure_organization(session)
    items = svc.list_projects(session, t)
    return {
        "data": {
            "items": [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "description": p.description,
                    "status": p.status,
                    "created_at": p.created_at.isoformat(),
                }
                for p in items
            ]
        }
    }


@router.post("/projects")
def create_project(body: ProjectIn, session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    svc.ensure_organization(session)
    project = svc.create_project(session, t, body.name, body.description)
    return {"data": {"id": str(project.id), "name": project.name}}


@router.patch("/projects/{project_id}")
def update_project(
    project_id: UUID,
    body: ProjectIn,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    project = svc.update_project(session, t, project_id, body.name, body.description)
    return {
        "data": {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "status": project.status,
        }
    }


@router.delete("/projects/{project_id}")
def delete_project(project_id: UUID, session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    svc.delete_project(session, t, project_id)
    return {"data": {"deleted": True}}


@router.get("/projects/{project_id}/batches")
def list_batches(project_id: UUID, session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    items = svc.list_batches(session, t, project_id)
    return {
        "data": {
            "items": [
                {
                    "id": str(b.id),
                    "file_name": b.file_name,
                    "source_name": b.source_name,
                    "status": b.status,
                    "total_rows": b.total_rows,
                }
                for b in items
            ]
        }
    }


@router.post("/imports/preview")
async def preview_import(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    headers = [header for header in read_spreadsheet_headers(content) if header]
    if not headers:
        raise AppError("VALIDATION_ERROR", "Planilha sem cabeçalhos.", status_code=422)
    suggested_mapping = suggest_mapping(headers)
    importable_rows = 0
    if suggested_mapping.get("original_description"):
        importable_rows = count_importable_records(content, suggested_mapping)
    return {
        "data": {
            "headers": headers,
            "suggested_mapping": suggested_mapping,
            "importable_rows": importable_rows,
        }
    }


@router.post("/projects/{project_id}/imports")
async def import_batch(
    project_id: UUID,
    file: UploadFile = File(...),
    source_name: str | None = Form(default=None),
    source_code: str | None = Form(default=None),
    original_description: str | None = Form(default=None),
    original_unit: str | None = Form(default=None),
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    content = await file.read()
    mapping = {
        k: v
        for k, v in {
            "source_code": source_code,
            "original_description": original_description,
            "original_unit": original_unit,
        }.items()
        if v
    }
    if "original_description" not in mapping:
        raise AppError("VALIDATION_ERROR", "Informe a coluna de descrição.", status_code=422)
    batch = svc.upload_and_map(
        session,
        t,
        project_id,
        file.filename or "import.xlsx",
        content,
        source_name,
        mapping,
    )
    return {"data": {"batch_id": str(batch.id), "total_rows": batch.total_rows}}


@router.post("/batches/{batch_id}/sanitize")
def sanitize_batch(batch_id: UUID, session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    return {"data": svc.run_sanitization(session, t, batch_id)}


@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: UUID, session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    svc.delete_import_batch(session, t, batch_id)
    return {"data": {"deleted": True}}


@router.get("/batches/{batch_id}")
def get_batch(batch_id: UUID, session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    return {"data": svc.get_batch_detail(session, t, batch_id)}


@router.get("/batches/{batch_id}/records")
def list_batch_records(
    batch_id: UUID,
    q: str | None = None,
    sort: str = "row_number",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {
        "data": svc.list_batch_records(
            session,
            t,
            batch_id,
            q=q,
            sort=sort,
            order=order,
            page=page,
            page_size=page_size,
        )
    }


@router.get("/batches/{batch_id}/diagnostics")
def batch_diagnostics(
    batch_id: UUID,
    identification: str | None = None,
    q: str | None = None,
    sort: str = "row_number",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {
        "data": svc.list_diagnostics(
            session,
            t,
            batch_id,
            identification=identification,
            q=q,
            sort=sort,
            order=order,
            page=page,
            page_size=page_size,
        )
    }


@router.post("/batches/{batch_id}/diagnostics/apply")
def apply_diagnostic_treatment(
    batch_id: UUID,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {"data": svc.apply_diagnostic_treatment(session, t, batch_id)}


@router.put("/batches/{batch_id}/diagnostics/dispositions")
def save_diagnostic_disposition(
    batch_id: UUID,
    body: DiagnosticDispositionIn,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {
        "data": svc.set_diagnostic_disposition(
            session,
            t,
            batch_id,
            body.source_record_id,
            body.disposition,
        )
    }


@router.post("/batches/{batch_id}/match")
def match_batch(batch_id: UUID, session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    return {"data": svc.run_matching(session, t, batch_id)}


@router.get("/batches/{batch_id}/queue")
def review_queue(
    batch_id: UUID,
    relationship: str | None = None,
    q: str | None = None,
    sort: str = "score",
    order: str = "desc",
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {
        "data": svc.list_queue(
            session,
            t,
            batch_id,
            relationship=relationship,
            q=q,
            sort=sort,
            order=order,
            page=page,
            page_size=page_size,
        )
    }


@router.post("/batches/{batch_id}/decisions")
def apply_decision(
    batch_id: UUID,
    body: DecisionIn,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    applied = svc.apply_decision(
        session,
        t,
        batch_id,
        body.decision,
        body.source_record_id,
        body.candidate_id,
        body.reason,
        body.governance_group_code,
        body.excluded_source_record_ids or None,
    )
    return {"data": {"applied": applied}}


@router.get("/master-products")
def master_products(
    q: str | None = None,
    status: str | None = "ACTIVE",
    sort: str = "master_code",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {
        "data": svc.list_masters(
            session,
            t,
            q=q,
            status=status,
            sort=sort,
            order=order,
            page=page,
            page_size=page_size,
        )
    }


@router.post("/master-products/unify")
def unify_master_products(
    body: MasterUnifyIn,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {
        "data": svc.unify_masters(
            session,
            t,
            selected_master_ids=body.selected_master_ids,
            target_master_id=body.target_master_id,
            conversion_factors={
                item.master_id: Decimal(str(item.factor)) for item in body.conversion_factors
            },
        )
    }


@router.get("/master-products/{master_id}/inactive-records")
def master_inactive_records(
    master_id: UUID,
    session: Session = Depends(get_db),
    t: Tenant = Depends(tenant),
) -> dict:
    return {"data": {"items": svc.list_master_inactive_records(session, t, master_id)}}


@router.get("/mappings")
def mappings(session: Session = Depends(get_db), t: Tenant = Depends(tenant)) -> dict:
    return {"data": {"items": svc.list_mappings(session, t)}}
