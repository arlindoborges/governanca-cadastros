from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import AppError
from app.core.processing import get_job, job_key, percent_for, set_running
from app.core.tenant import TenantContext, get_tenant_context
from app.imports.deletion import delete_progress_total
from app.imports.repository import get_batch
from app.imports.schemas import (
    ColumnMappingIn,
    ImportBatchDeleteStatus,
    ImportBatchDeleteStatusResponse,
    ImportBatchListResponse,
    ImportBatchPreviewData,
    ImportBatchPreviewResponse,
    ImportBatchProcessingStatus,
    ImportBatchProcessingStatusResponse,
    ImportRowErrorListResponse,
)
from app.imports.service import (
    apply_column_mapping,
    get_import_batch,
    list_batch_row_errors,
    list_organization_batches,
    queue_import_batch,
    validate_mapping_request,
)
from app.imports.tasks import (
    execute_import_batch_delete_job,
    execute_import_batch_mapping_job,
    execute_import_batch_upload_job,
)

router = APIRouter(prefix="/imports", tags=["imports"])


@router.get("/batches", response_model=ImportBatchListResponse)
def read_batches(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchListResponse:
    return ImportBatchListResponse(data=list_organization_batches(session, tenant, page, page_size))


@router.post(
    "/batches",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ImportBatchProcessingStatusResponse,
)
def post_batch(
    file: Annotated[UploadFile, File()],
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchProcessingStatusResponse:
    batch = queue_import_batch(session, tenant, file)
    key = job_key("import-upload", tenant.organization_id, batch.id)
    job = set_running(key, 1, "Iniciando upload...")
    background_tasks.add_task(
        execute_import_batch_upload_job,
        tenant.organization_id,
        tenant.user_id,
        tenant.role,
        batch.id,
    )
    return ImportBatchProcessingStatusResponse(
        data=ImportBatchProcessingStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
            batch_id=batch.id,
        )
    )


@router.get(
    "/batches/{batch_id}/upload/status",
    response_model=ImportBatchProcessingStatusResponse,
)
def read_import_batch_upload_status(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchProcessingStatusResponse:
    return _import_processing_status(
        session,
        tenant,
        batch_id,
        scope="import-upload",
        not_found_message="Nenhum processamento de upload encontrado para este lote.",
    )


@router.get("/batches/{batch_id}", response_model=ImportBatchPreviewResponse)
def read_batch(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchPreviewResponse:
    return ImportBatchPreviewResponse(data=get_import_batch(session, tenant, batch_id))


@router.delete(
    "/batches/{batch_id}",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ImportBatchDeleteStatusResponse,
)
def remove_batch(
    batch_id: UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchDeleteStatusResponse:
    return _start_import_batch_delete(background_tasks, session, tenant, batch_id)


@router.get("/batches/{batch_id}/delete/status", response_model=ImportBatchDeleteStatusResponse)
def read_import_batch_delete_status(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchDeleteStatusResponse:
    _ = session
    key = job_key("import-delete", tenant.organization_id, batch_id)
    job = get_job(key)
    if job is None:
        raise AppError(
            "NOT_FOUND",
            "Nenhuma exclusão em andamento foi encontrada para este lote.",
            status_code=404,
        )

    deleted_batch_id = None
    if job.status == "COMPLETED" and job.result is not None:
        deleted_batch_id = UUID(job.result["batch_id"])

    return ImportBatchDeleteStatusResponse(
        data=ImportBatchDeleteStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
            batch_id=deleted_batch_id,
        )
    )


@router.post(
    "/batches/{batch_id}/mapping",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ImportBatchProcessingStatusResponse,
)
def post_batch_mapping(
    batch_id: UUID,
    payload: ColumnMappingIn,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchProcessingStatusResponse:
    total_rows = validate_mapping_request(session, tenant, batch_id, payload)
    key = job_key("import-mapping", tenant.organization_id, batch_id)
    existing = get_job(key)
    if existing is not None and existing.status == "RUNNING":
        raise AppError(
            "IMPORT_MAPPING_ALREADY_RUNNING",
            "O mapeamento deste lote já está em andamento.",
            status_code=409,
        )

    job = set_running(key, total_rows, "Iniciando mapeamento...")
    background_tasks.add_task(
        execute_import_batch_mapping_job,
        tenant.organization_id,
        tenant.user_id,
        tenant.role,
        batch_id,
        payload,
    )
    return ImportBatchProcessingStatusResponse(
        data=ImportBatchProcessingStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
            batch_id=batch_id,
        )
    )


@router.get(
    "/batches/{batch_id}/mapping/status",
    response_model=ImportBatchProcessingStatusResponse,
)
def read_import_batch_mapping_status(
    batch_id: UUID,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportBatchProcessingStatusResponse:
    return _import_processing_status(
        session,
        tenant,
        batch_id,
        scope="import-mapping",
        not_found_message="Nenhum processamento de mapeamento encontrado para este lote.",
    )


@router.get("/batches/{batch_id}/row-errors", response_model=ImportRowErrorListResponse)
def read_batch_row_errors(
    batch_id: UUID,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    session: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ImportRowErrorListResponse:
    return ImportRowErrorListResponse(
        data=list_batch_row_errors(session, tenant, batch_id, page, page_size)
    )


def _start_import_batch_delete(
    background_tasks: BackgroundTasks,
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
) -> ImportBatchDeleteStatusResponse:
    batch = get_batch(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)

    key = job_key("import-delete", tenant.organization_id, batch_id)
    existing = get_job(key)
    if existing is not None and existing.status == "RUNNING":
        raise AppError(
            "IMPORT_DELETE_ALREADY_RUNNING",
            "A exclusão deste lote já está em andamento.",
            status_code=409,
        )

    total_steps = delete_progress_total(batch.total_rows)
    job = set_running(key, total_steps, "Iniciando exclusão do lote...")
    background_tasks.add_task(
        execute_import_batch_delete_job,
        tenant.organization_id,
        tenant.user_id,
        tenant.role,
        batch_id,
    )
    return ImportBatchDeleteStatusResponse(
        data=ImportBatchDeleteStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
            batch_id=batch_id,
        )
    )


def _import_processing_status(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    *,
    scope: str,
    not_found_message: str,
) -> ImportBatchProcessingStatusResponse:
    _ = session
    key = job_key(scope, tenant.organization_id, batch_id)
    job = get_job(key)
    if job is None:
        raise AppError("NOT_FOUND", not_found_message, status_code=404)

    preview = None
    if job.status == "COMPLETED" and job.result is not None:
        preview = ImportBatchPreviewData.model_validate(job.result)

    return ImportBatchProcessingStatusResponse(
        data=ImportBatchProcessingStatus(
            status=job.status,
            processed=job.processed,
            total=job.total,
            percent=percent_for(job),
            message=job.message,
            batch_id=batch_id,
            preview=preview,
        )
    )
