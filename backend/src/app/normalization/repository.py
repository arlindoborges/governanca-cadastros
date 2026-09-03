from collections.abc import Iterator
from uuid import UUID

from sqlalchemy import Select, delete, func, select
from sqlalchemy.orm import Session

from app.governance.models import (
    AttributeDefinition,
    GovernanceProfileVersion,
    NormalizationRule,
)
from app.imports.models import ImportBatch, SourceRecord
from app.normalization.models import ReviewIssue, SourceRecordAttribute


def get_active_profile_version(
    session: Session, organization_id: UUID
) -> GovernanceProfileVersion | None:
    return session.scalar(
        select(GovernanceProfileVersion).where(
            GovernanceProfileVersion.organization_id == organization_id,
            GovernanceProfileVersion.status == "ACTIVE",
        )
    )


def list_active_normalization_rules(
    session: Session, organization_id: UUID, profile_version_id: UUID
) -> list[NormalizationRule]:
    statement: Select[tuple[NormalizationRule]] = (
        select(NormalizationRule)
        .where(
            NormalizationRule.organization_id == organization_id,
            NormalizationRule.governance_profile_version_id == profile_version_id,
            NormalizationRule.status == "ACTIVE",
        )
        .order_by(NormalizationRule.priority, NormalizationRule.created_at)
    )
    return list(session.scalars(statement))


def get_attribute_definition(
    session: Session, organization_id: UUID, code: str
) -> AttributeDefinition | None:
    return session.scalar(
        select(AttributeDefinition).where(
            AttributeDefinition.organization_id == organization_id,
            AttributeDefinition.code == code,
            AttributeDefinition.status == "ACTIVE",
        )
    )


def get_batch_for_normalization(
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


def count_imported_records(session: Session, organization_id: UUID, batch_id: UUID) -> int:
    return (
        session.scalar(
            select(func.count())
            .select_from(SourceRecord)
            .where(
                SourceRecord.organization_id == organization_id,
                SourceRecord.import_batch_id == batch_id,
                SourceRecord.processing_status.in_(
                    ("IMPORTED", "NORMALIZED", "PENDING_INFORMATION")
                ),
            )
        )
        or 0
    )


def iter_imported_record_chunks(
    session: Session,
    organization_id: UUID,
    batch_id: UUID,
    chunk_size: int,
) -> Iterator[list[SourceRecord]]:
    last_id: UUID | None = None
    while True:
        statement: Select[tuple[SourceRecord]] = (
            select(SourceRecord)
            .where(
                SourceRecord.organization_id == organization_id,
                SourceRecord.import_batch_id == batch_id,
                SourceRecord.processing_status.in_(
                    ("IMPORTED", "NORMALIZED", "PENDING_INFORMATION")
                ),
            )
            .order_by(SourceRecord.id)
            .limit(chunk_size)
        )
        if last_id is not None:
            statement = statement.where(SourceRecord.id > last_id)
        chunk = list(session.scalars(statement))
        if not chunk:
            return
        yield chunk
        last_id = chunk[-1].id


def clear_normalization_artifacts(session: Session, organization_id: UUID, batch_id: UUID) -> None:
    record_ids = select(SourceRecord.id).where(
        SourceRecord.organization_id == organization_id,
        SourceRecord.import_batch_id == batch_id,
    )
    session.execute(
        delete(SourceRecordAttribute).where(
            SourceRecordAttribute.organization_id == organization_id,
            SourceRecordAttribute.source_record_id.in_(record_ids),
        )
    )
    session.execute(
        delete(ReviewIssue).where(
            ReviewIssue.organization_id == organization_id,
            ReviewIssue.source_record_id.in_(record_ids),
        )
    )
