from __future__ import annotations

from uuid import UUID

from app.core.db import SessionLocal
from app.core.errors import AppError
from app.core.processing import complete, fail, job_key, set_running, update_progress
from app.core.tenant import TenantContext
from app.matching.repository import get_batch_for_matching
from app.matching.service import run_batch_matching


def execute_matching_job(
    organization_id: UUID,
    user_id: UUID,
    role: str,
    batch_id: UUID,
) -> None:
    key = job_key("matching", organization_id, batch_id)
    session = SessionLocal()
    try:
        tenant = TenantContext(
            organization_id=organization_id,
            user_id=user_id,
            role=role,
        )
        batch = get_batch_for_matching(session, organization_id, batch_id)
        if batch is None:
            fail(key, "Lote não encontrado.")
            return

        set_running(key, batch.valid_rows, "Preparando matching...")

        def on_progress(processed: int, total: int) -> None:
            update_progress(
                key,
                processed,
                total,
                f"Analisando registros ({processed:,} de {total:,})...",
            )

        summary = run_batch_matching(
            session,
            tenant,
            batch_id,
            on_progress=on_progress,
        )
        complete(key, summary.model_dump(), "Matching concluído.")
    except AppError as exc:
        session.rollback()
        fail(key, exc.message)
    except Exception:
        session.rollback()
        fail(key, "Falha ao executar matching.")
    finally:
        session.close()
