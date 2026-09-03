from collections.abc import Callable
from datetime import UTC, datetime
from typing import NoReturn
from uuid import UUID, uuid4

from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.tenant import TenantContext
from app.imports.deletion import delete_import_batch as cascade_delete_import_batch
from app.imports.filenames import assert_xlsx_file_name, safe_file_name
from app.imports.models import ImportBatch, SourceRecord, SourceSystem
from app.imports.parsing import (
    iter_mapped_values,
    looks_like_zip,
    mapping_from_headers,
    parse_headers,
    parse_headers_and_rows,
    parse_headers_and_sample,
    preview_rows,
    row_issues,
)
from app.imports.repository import (
    find_active_duplicate_batch,
    get_batch,
    get_source_system,
    list_batches,
    list_row_errors,
    lock_batch,
)
from app.imports.schemas import (
    ColumnMappingIn,
    ImportBatchListData,
    ImportBatchPreviewData,
    ImportBatchRead,
    ImportRowError,
    ImportRowErrorListData,
)
from app.imports.seed import LOCAL_SOURCE_SYSTEM_ID
from app.imports.storage import (
    read_temp_bytes,
    read_upload_bytes,
    remove_batch_temp,
    sha256_hex,
    write_batch_temp,
)

_PARSE_MESSAGES = {
    "XLSX_EMPTY": "O arquivo está vazio.",
    "XLSX_TOO_LARGE": "O arquivo excede o tamanho máximo permitido.",
    "XLSX_INVALID": "Envie uma planilha Excel (.xlsx) válida.",
    "XLSX_HEADER": "O cabeçalho da planilha é inválido.",
    "XLSX_DUPLICATE_HEADER": "A planilha possui colunas duplicadas.",
    "XLSX_NO_DATA": "A planilha não possui linhas de dados.",
    "XLSX_MAPPING_OVERLAP": "Cada campo interno deve ser mapeado para uma coluna distinta.",
}


MAPPING_COMMIT_SIZE = 500
MAPPING_PROGRESS_INTERVAL = 100

UploadProgressCallback = Callable[[int, int, str], None]
MappingProgressCallback = Callable[[int, int, str], None]


def queue_import_batch(session: Session, tenant: TenantContext, upload_file) -> ImportBatch:
    settings = get_settings()
    source_system = _require_local_source_system(session, tenant)
    file_name = safe_file_name(getattr(upload_file, "filename", None))
    try:
        assert_xlsx_file_name(file_name)
    except ValueError as exc:
        raise AppError(
            "IMPORT_FILE_INVALID",
            "Envie um arquivo com extensão .xlsx.",
            status_code=422,
            details={"field": "file"},
        ) from exc
    try:
        content = read_upload_bytes(upload_file.file, settings.import_max_bytes)
    except ValueError as exc:
        _reraise_parse_error(exc)

    if not looks_like_zip(content[:4]):
        raise AppError(
            "IMPORT_FILE_INVALID",
            "Envie uma planilha Excel (.xlsx) válida.",
            status_code=422,
            details={"field": "file"},
        )

    file_hash = sha256_hex(content)
    duplicate = find_active_duplicate_batch(
        session, tenant.organization_id, source_system.id, file_hash
    )
    if duplicate is not None:
        raise AppError(
            "IMPORT_DUPLICATE_FILE",
            "Este arquivo já foi importado anteriormente.",
            status_code=409,
            details={"batch_id": str(duplicate.id)},
        )

    batch = ImportBatch(
        organization_id=tenant.organization_id,
        source_system_id=source_system.id,
        file_name=file_name,
        file_type="xlsx",
        file_hash=file_hash,
        source_reference_date=None,
        status="PROCESSING",
    )
    session.add(batch)
    try:
        session.flush()
        write_batch_temp(batch.id, content)
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise AppError(
            "IMPORT_DUPLICATE_FILE",
            "Este arquivo já foi importado anteriormente.",
            status_code=409,
        ) from exc
    except Exception:
        session.rollback()
        if batch.id:
            remove_batch_temp(batch.id)
        raise
    session.refresh(batch)
    return batch


def finalize_import_batch(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    *,
    on_progress: UploadProgressCallback | None = None,
) -> ImportBatchPreviewData:
    batch = get_batch(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    if batch.status != "PROCESSING":
        raise AppError(
            "IMPORT_BATCH_NOT_PROCESSABLE",
            "Este lote não está aguardando processamento.",
            status_code=409,
            details={"status": batch.status},
        )

    settings = get_settings()
    try:
        content = read_temp_bytes(batch.id)

        def parse_progress(processed: int, total: int) -> None:
            if on_progress:
                on_progress(
                    processed,
                    total,
                    f"Lendo planilha ({processed:,} de {total:,})...",
                )

        headers, rows = parse_headers_and_rows(content, on_progress=parse_progress)
    except FileNotFoundError as exc:
        raise AppError(
            "IMPORT_UPLOAD_EXPIRED",
            "O arquivo temporário deste lote não está mais disponível. Envie o arquivo novamente.",
            status_code=409,
        ) from exc
    except ValueError as exc:
        _reraise_parse_error(exc)

    if len(headers) > settings.import_max_columns:
        raise AppError(
            "IMPORT_TOO_MANY_COLUMNS",
            "O arquivo possui mais colunas do que o permitido.",
            status_code=422,
            details={"max_columns": settings.import_max_columns},
        )
    if len(rows) > settings.import_max_rows:
        raise AppError(
            "IMPORT_TOO_MANY_ROWS",
            "O arquivo possui mais linhas do que o permitido.",
            status_code=422,
            details={"max_rows": settings.import_max_rows},
        )

    batch = _lock_batch_or_busy(session, tenant.organization_id, batch_id)
    if batch.status != "PROCESSING":
        raise AppError(
            "IMPORT_BATCH_NOT_PROCESSABLE",
            "Este lote não está aguardando processamento.",
            status_code=409,
            details={"status": batch.status},
        )
    batch.status = "AWAITING_MAPPING"
    session.commit()
    session.refresh(batch)
    return ImportBatchPreviewData(
        batch=ImportBatchRead.model_validate(batch),
        headers=headers,
        sample_rows=preview_rows(rows),
    )


def create_import_batch(
    session: Session,
    tenant: TenantContext,
    upload_file,
) -> ImportBatchPreviewData:
    batch = queue_import_batch(session, tenant, upload_file)
    return finalize_import_batch(session, tenant, batch.id)


def get_import_batch(
    session: Session, tenant: TenantContext, batch_id: UUID
) -> ImportBatchPreviewData:
    batch = _require_batch(session, tenant, batch_id)
    headers: list[str] = []
    sample: list[dict[str, str]] = []
    if batch.status == "AWAITING_MAPPING":
        try:
            headers, sample = parse_headers_and_sample(read_temp_bytes(batch.id))
        except FileNotFoundError:
            headers, sample = [], []
        except ValueError as exc:
            _reraise_parse_error(exc)
    return ImportBatchPreviewData(
        batch=ImportBatchRead.model_validate(batch),
        headers=headers,
        sample_rows=sample,
    )


def list_organization_batches(
    session: Session, tenant: TenantContext, page: int, page_size: int
) -> ImportBatchListData:
    page, page_size = _pagination(page, page_size)
    items, total = list_batches(
        session, tenant.organization_id, offset=(page - 1) * page_size, limit=page_size
    )
    return ImportBatchListData(
        items=[ImportBatchRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
    )


def apply_column_mapping(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    payload: ColumnMappingIn,
    *,
    on_progress: MappingProgressCallback | None = None,
) -> ImportBatchPreviewData:
    batch = get_batch(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    if batch.status == "COMPLETED":
        raise AppError(
            "IMPORT_BATCH_ALREADY_PROCESSED",
            "Este lote já foi processado.",
            status_code=409,
            details={"batch_id": str(batch.id)},
        )
    if batch.status != "AWAITING_MAPPING":
        raise AppError(
            "IMPORT_BATCH_NOT_MAPPABLE",
            "Este lote não está aguardando mapeamento.",
            status_code=409,
            details={"status": batch.status},
        )

    headers, rows, mapping = _load_mapping_context(batch, payload, on_progress=on_progress)
    batch = _lock_batch_or_busy(session, tenant.organization_id, batch_id)
    if batch.status == "COMPLETED":
        raise AppError(
            "IMPORT_BATCH_ALREADY_PROCESSED",
            "Este lote já foi processado.",
            status_code=409,
            details={"batch_id": str(batch.id)},
        )
    if batch.status != "AWAITING_MAPPING":
        raise AppError(
            "IMPORT_BATCH_NOT_MAPPABLE",
            "Este lote não está aguardando mapeamento.",
            status_code=409,
            details={"status": batch.status},
        )
    batch.status = "PROCESSING"
    session.commit()
    session.refresh(batch)

    records: list[SourceRecord] = []
    valid_rows = 0
    invalid_rows = 0
    total_rows = len(rows)
    if on_progress:
        on_progress(0, total_rows, "Preparando importação das linhas...")

    for index, (row_number, raw_data, source_code, description, unit) in enumerate(
        iter_mapped_values(rows, mapping), start=1
    ):
        issues = row_issues(source_code, description, unit)
        status = "INVALID" if issues else "IMPORTED"
        if issues:
            invalid_rows += 1
        else:
            valid_rows += 1
        records.append(
            SourceRecord(
                id=uuid4(),
                organization_id=tenant.organization_id,
                source_system_id=batch.source_system_id,
                import_batch_id=batch.id,
                row_number=row_number,
                source_code=source_code,
                original_description=description,
                original_unit=unit,
                raw_data=raw_data,
                processing_status=status,
            )
        )
        if len(records) >= MAPPING_COMMIT_SIZE:
            session.add_all(records)
            session.commit()
            records = []
        if on_progress and (
            index % MAPPING_PROGRESS_INTERVAL == 0 or index == total_rows
        ):
            on_progress(
                index,
                total_rows,
                f"Importando linhas ({index:,} de {total_rows:,})...",
            )

    if records:
        session.add_all(records)
    batch.column_mapping = mapping
    batch.total_rows = valid_rows + invalid_rows
    batch.valid_rows = valid_rows
    batch.invalid_rows = invalid_rows
    batch.status = "COMPLETED"
    batch.imported_at = datetime.now(UTC)
    session.commit()
    session.refresh(batch)
    remove_batch_temp(batch.id)
    return ImportBatchPreviewData(
        batch=ImportBatchRead.model_validate(batch),
        headers=[],
        sample_rows=[],
    )


def delete_import_batch(session: Session, tenant: TenantContext, batch_id: UUID) -> None:
    deleted = cascade_delete_import_batch(session, tenant.organization_id, batch_id)
    if not deleted:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    session.commit()


def list_batch_row_errors(
    session: Session, tenant: TenantContext, batch_id: UUID, page: int, page_size: int
) -> ImportRowErrorListData:
    batch = _require_batch(session, tenant, batch_id)
    page, page_size = _pagination(page, page_size)
    items, total = list_row_errors(
        session,
        tenant.organization_id,
        batch.id,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    return ImportRowErrorListData(
        items=[
            ImportRowError(
                row_number=item.row_number,
                source_code=item.source_code,
                original_description=item.original_description,
                original_unit=item.original_unit,
                issues=row_issues(item.source_code, item.original_description, item.original_unit),
            )
            for item in items
        ],
        page=page,
        page_size=page_size,
        total=total,
    )


def validate_mapping_request(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    payload: ColumnMappingIn,
) -> int:
    batch = get_batch(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    if batch.status == "COMPLETED":
        raise AppError(
            "IMPORT_BATCH_ALREADY_PROCESSED",
            "Este lote já foi processado.",
            status_code=409,
            details={"batch_id": str(batch.id)},
        )
    if batch.status != "AWAITING_MAPPING":
        raise AppError(
            "IMPORT_BATCH_NOT_MAPPABLE",
            "Este lote não está aguardando mapeamento.",
            status_code=409,
            details={"status": batch.status},
        )
    _validate_mapping_headers(batch, payload)
    return 1


def _validate_mapping_headers(batch: ImportBatch, payload: ColumnMappingIn) -> None:
    try:
        headers = parse_headers(read_temp_bytes(batch.id))
        mapping_from_headers(headers, payload.model_dump())
    except FileNotFoundError as exc:
        raise AppError(
            "IMPORT_UPLOAD_EXPIRED",
            "O arquivo temporário deste lote não está mais disponível. Envie o arquivo novamente.",
            status_code=409,
        ) from exc
    except KeyError as exc:
        raise AppError(
            "IMPORT_REQUIRED_COLUMN_MISSING",
            "Mapeie código, descrição e unidade.",
            status_code=422,
            details={"field": str(exc.args[0])},
        ) from exc
    except LookupError as exc:
        raise AppError(
            "IMPORT_REQUIRED_COLUMN_MISSING",
            "A coluna mapeada não existe no arquivo.",
            status_code=422,
            details={"field": str(exc.args[0])},
        ) from exc
    except ValueError as exc:
        _reraise_parse_error(exc)


def _load_mapping_context(
    batch: ImportBatch,
    payload: ColumnMappingIn,
    *,
    on_progress: MappingProgressCallback | None = None,
) -> tuple[list[str], list[dict[str, str]], dict[str, str]]:
    try:
        content = read_temp_bytes(batch.id)

        def parse_progress(processed: int, total: int) -> None:
            if on_progress:
                on_progress(
                    processed,
                    total,
                    f"Lendo planilha ({processed:,} de {total:,})...",
                )

        headers, rows = parse_headers_and_rows(content, on_progress=parse_progress)
        mapping = mapping_from_headers(headers, payload.model_dump())
    except FileNotFoundError as exc:
        raise AppError(
            "IMPORT_UPLOAD_EXPIRED",
            "O arquivo temporário deste lote não está mais disponível. Envie o arquivo novamente.",
            status_code=409,
        ) from exc
    except KeyError as exc:
        raise AppError(
            "IMPORT_REQUIRED_COLUMN_MISSING",
            "Mapeie código, descrição e unidade.",
            status_code=422,
            details={"field": str(exc.args[0])},
        ) from exc
    except LookupError as exc:
        raise AppError(
            "IMPORT_REQUIRED_COLUMN_MISSING",
            "A coluna mapeada não existe no arquivo.",
            status_code=422,
            details={"field": str(exc.args[0])},
        ) from exc
    except ValueError as exc:
        _reraise_parse_error(exc)
    return headers, rows, mapping


def _lock_batch_or_busy(session: Session, organization_id: UUID, batch_id: UUID) -> ImportBatch:
    try:
        batch = lock_batch(session, organization_id, batch_id, nowait=True)
    except OperationalError as exc:
        raise AppError(
            "IMPORT_BATCH_BUSY",
            "Este lote já está sendo processado. Aguarde e tente novamente.",
            status_code=409,
        ) from exc
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    return batch


def _require_local_source_system(session: Session, tenant: TenantContext) -> SourceSystem:
    system = get_source_system(session, tenant.organization_id, LOCAL_SOURCE_SYSTEM_ID)
    if system is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    if system.status != "ACTIVE":
        raise AppError(
            "IMPORT_SOURCE_SYSTEM_INACTIVE",
            "A origem padrão está inativa.",
            status_code=422,
        )
    return system


def _require_batch(session: Session, tenant: TenantContext, batch_id: UUID) -> ImportBatch:
    batch = get_batch(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    return batch


def _pagination(page: int, page_size: int) -> tuple[int, int]:
    if page < 1 or page_size < 1 or page_size > 100:
        raise AppError(
            "VALIDATION_ERROR",
            "Paginação inválida.",
            status_code=422,
            details={"page": page, "page_size": page_size},
        )
    return page, page_size


def _reraise_parse_error(exc: ValueError) -> NoReturn:
    code = str(exc)
    raise AppError(
        "IMPORT_FILE_INVALID",
        _PARSE_MESSAGES.get(code, "A planilha XLSX é inválida."),
        status_code=422,
        details={"reason": code},
    ) from exc
