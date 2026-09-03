from __future__ import annotations

from uuid import UUID

from app.core.db import SessionLocal
from app.core.errors import AppError
from app.core.processing import complete, fail, job_key, update_progress
from app.core.tenant import TenantContext
from app.normalization.fase1 import SanitizeOptions
from app.normalization.schemas import NormalizationBatchSummary
from app.normalization.service import get_batch_for_normalization, run_batch_normalization


def execute_normalization_job(
    organization_id: UUID,
    user_id: UUID,
    role: str,
    batch_id: UUID,
    sanitize_options: SanitizeOptions | None = None,
) -> None:
    key = job_key("normalization", organization_id, batch_id)
    session = SessionLocal()
    try:
        tenant = TenantContext(
            organization_id=organization_id,
            user_id=user_id,
            role=role,
        )
        batch = get_batch_for_normalization(session, organization_id, batch_id)
        if batch is None:
            fail(key, "Lote não encontrado.")
            return

        update_progress(key, 0, batch.valid_rows, "Preparando normalização...")

        def on_progress(processed: int, total: int) -> None:
            update_progress(
                key,
                processed,
                total,
                f"Normalizando registros ({processed:,} de {total:,})...",
            )

        summary = run_batch_normalization(
            session,
            tenant,
            batch_id,
            sanitize_options=sanitize_options,
            on_progress=on_progress,
        )
        complete(key, summary.model_dump(), "Normalização concluída.")
    except AppError as exc:
        session.rollback()
        fail(key, exc.message)
    except Exception:
        session.rollback()
        fail(key, "Falha ao normalizar o lote.")
    finally:
        session.close()


def normalization_run_status(
    organization_id: UUID, batch_id: UUID
) -> NormalizationBatchSummary | None:
    from app.core.processing import get_job

    job = get_job(job_key("normalization", organization_id, batch_id))
    if job is None or job.status != "COMPLETED" or job.result is None:
        return None
    return NormalizationBatchSummary.model_validate(job.result)
