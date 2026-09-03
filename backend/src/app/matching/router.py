from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db, release_request_transaction
from app.core.errors import AppError
from app.core.processing import get_job, job_key, percent_for, set_running
from app.core.tenant import TenantContext, get_tenant_context
from app.matching.repository import get_batch_for_matching
from app.matching.schemas import (
    MatchingBatchSummary,
    MatchingBatchSummaryResponse,
    MatchingEligibleBatchListResponse,
    MatchingResultListResponse,
    MatchingRunStatus,
    MatchingRunStatusResponse,
)
from app.matching.service import (
    get_batch_matching_summary,
    list_eligible_matching_batches,
    list_matching_results,
)
from app.matching.tasks import execute_matching_job

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/batches", response_model=MatchingEligibleBatchListResponse)
def read_eligible_matching_batches(
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> MatchingEligibleBatchListResponse:
    return MatchingEligibleBatchListResponse(
        data=list_eligible_matching_batches(session, tenant)
    )


@router.post(
    "/batches/{batch_id}/run",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=MatchingRunStatusResponse,
)
def post_run_matching(
    batch_id: UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> MatchingRunStatusResponse:
    batch = get_batch_for_matching(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)

    key = job_key("matching", tenant.organization_id, batch_id)
    existing = get_job(key)
    if existing is not None and existing.status == "RUNNING":
        raise AppError(
            "MATCHING_ALREADY_RUNNING",
            "O matching deste lote já está em andamento.",
            status_code=409,
        )

    job = set_running(key, batch.valid_rows, "Iniciando matching...")
    background_tasks.add_task(
        execute_matching_job,
        tenant.organization_id,
        tenant.user_id,
        tenant.role,
        batch_id,
    )
    release_request_transaction(session)
    return MatchingRunStatusResponse(
        data=MatchingRunStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
        )
    )


@router.get("/batches/{batch_id}/run/status", response_model=MatchingRunStatusResponse)
def read_matching_run_status(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> MatchingRunStatusResponse:
    _ = session
    key = job_key("matching", tenant.organization_id, batch_id)
    job = get_job(key)
    if job is None:
        raise AppError(
            "NOT_FOUND",
            "Nenhum processamento de matching encontrado para este lote.",
            status_code=404,
        )

    summary = None
    if job.status == "COMPLETED" and job.result is not None:
        summary = MatchingBatchSummary.model_validate(job.result)

    return MatchingRunStatusResponse(
        data=MatchingRunStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
            summary=summary,
        )
    )


@router.get("/batches/{batch_id}/summary", response_model=MatchingBatchSummaryResponse)
def read_matching_summary(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> MatchingBatchSummaryResponse:
    return MatchingBatchSummaryResponse(
        data=get_batch_matching_summary(session, tenant, batch_id)
    )


@router.get("/batches/{batch_id}/results", response_model=MatchingResultListResponse)
def read_matching_results(
    batch_id: UUID,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> MatchingResultListResponse:
    return MatchingResultListResponse(
        data=list_matching_results(session, tenant, batch_id, page, page_size)
    )
