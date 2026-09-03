from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.governance.models import AttributeDefinition, GovernanceProfileVersion
from app.imports.models import ImportBatch, SourceRecord
from app.matching.models import MatchCandidate, MatchingResult, MatchingRun
from app.normalization.models import SourceRecordAttribute


def get_active_profile_version(
    session: Session, organization_id: UUID
) -> GovernanceProfileVersion | None:
    return session.scalar(
        select(GovernanceProfileVersion).where(
            GovernanceProfileVersion.organization_id == organization_id,
            GovernanceProfileVersion.status == "ACTIVE",
        )
    )


def get_batch_for_matching(
    session: Session, organization_id: UUID, batch_id: UUID
) -> ImportBatch | None:
    return session.scalar(
        select(ImportBatch).where(
            ImportBatch.id == batch_id,
            ImportBatch.organization_id == organization_id,
            ImportBatch.status == "COMPLETED",
        )
    )


def lock_batch(session: Session, organization_id: UUID, batch_id: UUID) -> ImportBatch | None:
    return session.scalar(
        select(ImportBatch)
        .where(
            ImportBatch.id == batch_id,
            ImportBatch.organization_id == organization_id,
        )
        .with_for_update()
    )


def list_eligible_batches(session: Session, organization_id: UUID) -> list[ImportBatch]:
    statement: Select[tuple[ImportBatch]] = (
        select(ImportBatch)
        .where(
            ImportBatch.organization_id == organization_id,
            ImportBatch.status == "COMPLETED",
        )
        .order_by(ImportBatch.imported_at.desc().nullslast(), ImportBatch.created_at.desc())
    )
    batches = list(session.scalars(statement))
    eligible: list[ImportBatch] = []
    for batch in batches:
        count = session.scalar(
            select(func.count())
            .select_from(SourceRecord)
            .where(
                SourceRecord.import_batch_id == batch.id,
                SourceRecord.organization_id == organization_id,
                SourceRecord.processing_status.in_(("NORMALIZED", "PENDING_INFORMATION")),
            )
        )
        if count and count > 0:
            eligible.append(batch)
    return eligible


def list_matchable_records(
    session: Session, organization_id: UUID, batch_id: UUID
) -> list[SourceRecord]:
    return list(
        session.scalars(
            select(SourceRecord).where(
                SourceRecord.organization_id == organization_id,
                SourceRecord.import_batch_id == batch_id,
                SourceRecord.processing_status.in_(("NORMALIZED", "PENDING_INFORMATION")),
            )
        )
    )


def load_attributes_by_record(
    session: Session, organization_id: UUID, record_ids: list[UUID]
) -> dict[UUID, dict[str, str]]:
    if not record_ids:
        return {}
    rows = session.execute(
        select(
            SourceRecordAttribute.source_record_id,
            AttributeDefinition.code,
            SourceRecordAttribute.value_text,
        )
        .join(
            AttributeDefinition,
            AttributeDefinition.id == SourceRecordAttribute.attribute_definition_id,
        )
        .where(
            SourceRecordAttribute.organization_id == organization_id,
            SourceRecordAttribute.source_record_id.in_(record_ids),
        )
    )
    grouped: dict[UUID, dict[str, str]] = {}
    for record_id, code, value_text in rows:
        if value_text is None:
            continue
        grouped.setdefault(record_id, {})[code] = value_text
    return grouped


def get_latest_run(
    session: Session, organization_id: UUID, batch_id: UUID
) -> MatchingRun | None:
    return session.scalar(
        select(MatchingRun)
        .where(
            MatchingRun.organization_id == organization_id,
            MatchingRun.import_batch_id == batch_id,
            MatchingRun.status == "COMPLETED",
        )
        .order_by(MatchingRun.completed_at.desc().nullslast(), MatchingRun.created_at.desc())
        .limit(1)
    )


def get_record_by_id(
    session: Session, organization_id: UUID, record_id: UUID
) -> SourceRecord | None:
    return session.scalar(
        select(SourceRecord).where(
            SourceRecord.id == record_id,
            SourceRecord.organization_id == organization_id,
        )
    )


def list_results_for_run(
    session: Session,
    organization_id: UUID,
    run_id: UUID,
    page: int,
    page_size: int,
) -> tuple[list[MatchingResult], int]:
    from sqlalchemy import func

    filters = (
        MatchingResult.organization_id == organization_id,
        MatchingResult.matching_run_id == run_id,
    )
    total_count = (
        session.scalar(select(func.count()).select_from(MatchingResult).where(*filters)) or 0
    )
    items = list(
        session.scalars(
            select(MatchingResult)
            .where(*filters)
            .order_by(MatchingResult.created_at)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return items, total_count


def list_candidates_for_result(
    session: Session, organization_id: UUID, result_id: UUID
) -> list[MatchCandidate]:
    return list(
        session.scalars(
            select(MatchCandidate)
            .where(
                MatchCandidate.organization_id == organization_id,
                MatchCandidate.matching_result_id == result_id,
            )
            .order_by(MatchCandidate.overall_score.desc().nullslast())
        )
    )
