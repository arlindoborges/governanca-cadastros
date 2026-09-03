from __future__ import annotations

from uuid import UUID

from app.core.db import SessionLocal
from app.core.errors import AppError
from app.core.processing import complete, fail, job_key, set_running, update_progress
from app.core.tenant import TenantContext
from app.imports.deletion import delete_import_batch, delete_progress_total
from app.imports.repository import get_batch
from app.imports.schemas import ColumnMappingIn
from app.imports.service import apply_column_mapping, finalize_import_batch


def execute_import_batch_delete_job(
    organization_id: UUID,
    user_id: UUID,
    role: str,
    batch_id: UUID,
) -> None:
    key = job_key("import-delete", organization_id, batch_id)
    session = SessionLocal()
    try:
        tenant = TenantContext(
            organization_id=organization_id,
            user_id=user_id,
            role=role,
        )
        batch = get_batch(session, organization_id, batch_id)
        if batch is None:
            fail(key, "Lote não encontrado.")
            return

        total_steps = delete_progress_total(batch.total_rows)
        set_running(key, total_steps, "Iniciando exclusão do lote...")

        def on_progress(processed: int, total: int, message: str) -> None:
            update_progress(key, processed, total, message)

        deleted = delete_import_batch(
            session,
            tenant.organization_id,
            batch_id,
            on_progress=on_progress,
        )
        if not deleted:
            fail(key, "Lote não encontrado.")
            session.rollback()
            return

        complete(
            key,
            {"batch_id": str(batch_id), "deleted": True},
            "Exclusão concluída.",
        )
    except AppError as exc:
        session.rollback()
        fail(key, exc.message)
    except Exception:
        session.rollback()
        fail(key, "Falha ao excluir o lote.")
    finally:
        session.close()


def execute_import_batch_upload_job(
    organization_id: UUID,
    user_id: UUID,
    role: str,
    batch_id: UUID,
) -> None:
    key = job_key("import-upload", organization_id, batch_id)
    session = SessionLocal()
    try:
        tenant = TenantContext(
            organization_id=organization_id,
            user_id=user_id,
            role=role,
        )
        set_running(key, 1, "Preparando leitura da planilha...")

        def on_progress(processed: int, total: int, message: str) -> None:
            update_progress(key, processed, max(total, 1), message)

        preview = finalize_import_batch(
            session,
            tenant,
            batch_id,
            on_progress=on_progress,
        )
        complete(key, preview.model_dump(), "Upload concluído.")
    except AppError as exc:
        session.rollback()
        fail(key, exc.message)
    except Exception:
        session.rollback()
        fail(key, "Falha ao processar o arquivo enviado.")
    finally:
        session.close()


def execute_import_batch_mapping_job(
    organization_id: UUID,
    user_id: UUID,
    role: str,
    batch_id: UUID,
    payload: ColumnMappingIn,
) -> None:
    key = job_key("import-mapping", organization_id, batch_id)
    session = SessionLocal()
    try:
        tenant = TenantContext(
            organization_id=organization_id,
            user_id=user_id,
            role=role,
        )
        batch = get_batch(session, organization_id, batch_id)
        if batch is None:
            fail(key, "Lote não encontrado.")
            return

        set_running(key, max(batch.valid_rows, 1) or 1, "Iniciando mapeamento...")

        def on_progress(processed: int, total: int, message: str) -> None:
            update_progress(key, processed, total, message)

        preview = apply_column_mapping(
            session,
            tenant,
            batch_id,
            payload,
            on_progress=on_progress,
        )
        complete(key, preview.model_dump(), "Mapeamento concluído.")
    except AppError as exc:
        session.rollback()
        fail(key, exc.message)
    except Exception:
        session.rollback()
        fail(key, "Falha ao confirmar o mapeamento.")
    finally:
        session.close()
