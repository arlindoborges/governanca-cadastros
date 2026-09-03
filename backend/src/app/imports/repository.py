from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.imports.models import ImportBatch, SourceRecord, SourceSystem

ACTIVE_DUPLICATE_STATUSES = ("AWAITING_MAPPING", "PROCESSING", "COMPLETED")


def get_source_system(
    session: Session, organization_id: UUID, source_system_id: UUID
) -> SourceSystem | None:
    return session.scalar(
        select(SourceSystem).where(
            SourceSystem.id == source_system_id,
            SourceSystem.organization_id == organization_id,
        )
    )


def find_active_duplicate_batch(
    session: Session, organization_id: UUID, source_system_id: UUID, file_hash: str
) -> ImportBatch | None:
    return session.scalar(
        select(ImportBatch).where(
            ImportBatch.organization_id == organization_id,
            ImportBatch.source_system_id == source_system_id,
            ImportBatch.file_hash == file_hash,
            ImportBatch.status.in_(ACTIVE_DUPLICATE_STATUSES),
        )
    )


def list_batches(
    session: Session, organization_id: UUID, offset: int, limit: int
) -> tuple[list[ImportBatch], int]:
    filters = ImportBatch.organization_id == organization_id
    total = session.scalar(select(func.count()).select_from(ImportBatch).where(filters)) or 0
    items = list(
        session.scalars(
            select(ImportBatch)
            .where(filters)
            .order_by(ImportBatch.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )
    return items, total


def get_batch(session: Session, organization_id: UUID, batch_id: UUID) -> ImportBatch | None:
    return session.scalar(
        select(ImportBatch).where(
            ImportBatch.id == batch_id,
            ImportBatch.organization_id == organization_id,
        )
    )


def lock_batch(
    session: Session,
    organization_id: UUID,
    batch_id: UUID,
    *,
    nowait: bool = False,
) -> ImportBatch | None:
    return session.scalar(
        select(ImportBatch)
        .where(
            ImportBatch.id == batch_id,
            ImportBatch.organization_id == organization_id,
        )
        .with_for_update(nowait=nowait)
    )


def list_row_errors(
    session: Session, organization_id: UUID, batch_id: UUID, offset: int, limit: int
) -> tuple[list[SourceRecord], int]:
    filters = (
        SourceRecord.organization_id == organization_id,
        SourceRecord.import_batch_id == batch_id,
        SourceRecord.processing_status == "INVALID",
    )
    total = session.scalar(select(func.count()).select_from(SourceRecord).where(*filters)) or 0
    items = list(
        session.scalars(
            select(SourceRecord)
            .where(*filters)
            .order_by(SourceRecord.row_number)
            .offset(offset)
            .limit(limit)
        )
    )
    return items, total
