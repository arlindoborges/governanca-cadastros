from __future__ import annotations

from collections.abc import Callable, Sequence
from uuid import UUID

from sqlalchemy import ColumnElement, delete, or_, select
from sqlalchemy.orm import Session

from app.imports.models import ImportBatch, SourceRecord
from app.imports.repository import get_batch
from app.imports.storage import remove_batch_temp
from app.matching.models import MatchCandidate, MatchEvidence, MatchingResult, MatchingRun
from app.normalization.models import ReviewIssue, SourceRecordAttribute

DELETE_CHUNK_SIZE = 500
DELETE_SETUP_STEPS = 6
DELETE_FINAL_STEPS = 1

ProgressCallback = Callable[[int, int, str], None]


def delete_progress_total(record_count: int) -> int:
    return DELETE_SETUP_STEPS + (2 * max(record_count, 1)) + DELETE_FINAL_STEPS


def _chunks(values: Sequence[UUID], size: int = DELETE_CHUNK_SIZE) -> list[Sequence[UUID]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def _delete_in_chunks(
    session: Session,
    organization_id: UUID,
    column: ColumnElement[UUID],
    ids: Sequence[UUID],
) -> None:
    if not ids:
        return
    model = column.class_
    for chunk in _chunks(ids):
        session.execute(
            delete(model).where(
                model.organization_id == organization_id,
                column.in_(chunk),
            )
        )
        session.commit()


def delete_import_batch(
    session: Session,
    organization_id: UUID,
    batch_id: UUID,
    *,
    on_progress: ProgressCallback | None = None,
) -> bool:
    batch = get_batch(session, organization_id, batch_id)
    if batch is None:
        return False

    record_ids = list(
        session.scalars(
            select(SourceRecord.id).where(
                SourceRecord.organization_id == organization_id,
                SourceRecord.import_batch_id == batch_id,
            )
        )
    )
    record_count = len(record_ids)
    row_units = max(record_count, 1)
    total_steps = delete_progress_total(record_count)
    current_step = 0

    def report(
        message: str,
        *,
        processed: int | None = None,
        phase: str | None = None,
    ) -> None:
        nonlocal current_step
        if processed is None or phase is None:
            current_step += 1
            step = current_step
        elif phase == "attributes":
            step = DELETE_SETUP_STEPS + processed
        else:
            step = DELETE_SETUP_STEPS + row_units + processed
        if on_progress:
            on_progress(min(step, total_steps - DELETE_FINAL_STEPS), total_steps, message)

    run_ids = list(
        session.scalars(
            select(MatchingRun.id).where(
                MatchingRun.organization_id == organization_id,
                MatchingRun.import_batch_id == batch_id,
            )
        )
    )
    result_filters = []
    if record_ids:
        result_filters.append(MatchingResult.source_record_id.in_(record_ids))
    if run_ids:
        result_filters.append(MatchingResult.matching_run_id.in_(run_ids))
    result_ids = (
        list(
            session.scalars(
                select(MatchingResult.id).where(
                    MatchingResult.organization_id == organization_id,
                    or_(*result_filters),
                )
            )
        )
        if result_filters
        else []
    )
    candidate_filters = []
    if result_ids:
        candidate_filters.append(MatchCandidate.matching_result_id.in_(result_ids))
    if record_ids:
        candidate_filters.append(MatchCandidate.source_record_id.in_(record_ids))
        candidate_filters.append(MatchCandidate.candidate_source_record_id.in_(record_ids))
    candidate_ids = (
        list(
            session.scalars(
                select(MatchCandidate.id).where(
                    MatchCandidate.organization_id == organization_id,
                    or_(*candidate_filters),
                )
            )
        )
        if candidate_filters
        else []
    )

    report("Removendo evidências de matching...")
    _delete_in_chunks(session, organization_id, MatchEvidence.match_candidate_id, candidate_ids)

    report("Removendo candidatos de matching...")
    _delete_in_chunks(session, organization_id, MatchCandidate.id, candidate_ids)

    report("Removendo resultados de matching...")
    _delete_in_chunks(session, organization_id, MatchingResult.id, result_ids)

    report("Removendo execuções de matching...")
    _delete_in_chunks(session, organization_id, MatchingRun.id, run_ids)

    report("Removendo pendências de revisão...")
    _delete_in_chunks(session, organization_id, ReviewIssue.source_record_id, record_ids)

    report("Removendo atributos extraídos...")
    if record_ids:
        removed = 0
        for chunk in _chunks(record_ids):
            session.execute(
                delete(SourceRecordAttribute).where(
                    SourceRecordAttribute.organization_id == organization_id,
                    SourceRecordAttribute.source_record_id.in_(chunk),
                )
            )
            session.commit()
            removed += len(chunk)
            report(
                f"Removendo atributos extraídos ({removed:,} de {record_count:,})...",
                processed=removed,
                phase="attributes",
            )

    report("Removendo registros importados...", processed=0, phase="records")
    if record_ids:
        removed = 0
        for chunk in _chunks(record_ids):
            session.execute(
                delete(SourceRecord).where(
                    SourceRecord.organization_id == organization_id,
                    SourceRecord.id.in_(chunk),
                )
            )
            session.commit()
            removed += len(chunk)
            report(
                f"Removendo registros ({removed:,} de {record_count:,})...",
                processed=removed,
                phase="records",
            )

    report("Finalizando exclusão do lote...")
    locked_batch = session.get(ImportBatch, batch_id)
    if locked_batch is not None and locked_batch.organization_id == organization_id:
        session.delete(locked_batch)
        session.commit()
    remove_batch_temp(batch_id)
    if on_progress:
        on_progress(total_steps, total_steps, "Exclusão concluída.")
    return True
