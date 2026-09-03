from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import AppError
from app.core.processing import get_job, job_key, percent_for, set_running
from app.core.tenant import TenantContext, get_tenant_context
from app.normalization.schemas import (
    NormalizationBatchSummary,
    NormalizationBatchSummaryResponse,
    NormalizationEligibleBatchListResponse,
    NormalizationRecordListResponse,
    NormalizationRunStatus,
    NormalizationRunStatusResponse,
    ReviewIssueListResponse,
)
from app.normalization.service import (
    get_batch_normalization_summary,
    list_batch_review_issues,
    list_eligible_batches,
    list_normalized_records,
)
from app.normalization.tasks import execute_normalization_job
from app.normalization.repository import get_batch_for_normalization

router = APIRouter(prefix="/normalization", tags=["normalization"])


@router.get("/batches", response_model=NormalizationEligibleBatchListResponse)
def read_eligible_batches(
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> NormalizationEligibleBatchListResponse:
    return NormalizationEligibleBatchListResponse(data=list_eligible_batches(session, tenant))


@router.post(
    "/batches/{batch_id}/run",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=NormalizationRunStatusResponse,
)
def post_run_normalization(
    batch_id: UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> NormalizationRunStatusResponse:
    batch = get_batch_for_normalization(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    if batch.status != "COMPLETED":
        raise AppError(
            "NORMALIZATION_BATCH_NOT_READY",
            "Somente lotes concluídos podem ser normalizados.",
            status_code=409,
            details={"status": batch.status},
        )

    key = job_key("normalization", tenant.organization_id, batch_id)
    existing = get_job(key)
    if existing is not None and existing.status == "RUNNING":
        raise AppError(
            "NORMALIZATION_ALREADY_RUNNING",
            "A normalização deste lote já está em andamento.",
            status_code=409,
        )

    job = set_running(key, batch.valid_rows, "Iniciando normalização...")
    background_tasks.add_task(
        execute_normalization_job,
        tenant.organization_id,
        tenant.user_id,
        tenant.role,
        batch_id,
    )
    return NormalizationRunStatusResponse(
        data=NormalizationRunStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
        )
    )


@router.get("/batches/{batch_id}/run/status", response_model=NormalizationRunStatusResponse)
def read_normalization_run_status(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> NormalizationRunStatusResponse:
    _ = session
    key = job_key("normalization", tenant.organization_id, batch_id)
    job = get_job(key)
    if job is None:
        raise AppError(
            "NOT_FOUND",
            "Nenhum processamento de normalização encontrado para este lote.",
            status_code=404,
        )

    summary = None
    if job.status == "COMPLETED" and job.result is not None:
        summary = NormalizationBatchSummary.model_validate(job.result)

    return NormalizationRunStatusResponse(
        data=NormalizationRunStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
            summary=summary,
        )
    )


@router.get("/batches/{batch_id}/summary", response_model=NormalizationBatchSummaryResponse)
def read_normalization_summary(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> NormalizationBatchSummaryResponse:
    return NormalizationBatchSummaryResponse(
        data=get_batch_normalization_summary(session, tenant, batch_id)
    )


@router.get("/batches/{batch_id}/records", response_model=NormalizationRecordListResponse)
def read_normalized_records(
    batch_id: UUID,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> NormalizationRecordListResponse:
    return NormalizationRecordListResponse(
        data=list_normalized_records(session, tenant, batch_id, page, page_size)
    )


@router.get("/batches/{batch_id}/issues", response_model=ReviewIssueListResponse)
def read_review_issues(
    batch_id: UUID,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ReviewIssueListResponse:
    return ReviewIssueListResponse(
        data=list_batch_review_issues(session, tenant, batch_id, page, page_size)
    )
