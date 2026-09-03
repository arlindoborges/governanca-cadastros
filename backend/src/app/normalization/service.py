from __future__ import annotations

from collections.abc import Callable
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.tenant import TenantContext
from app.governance.models import AttributeDefinition
from app.imports.models import ImportBatch, SourceRecord
from app.normalization.engine import apply_rule, extract_raw_column, extraction_confidence
from app.normalization.fase1 import extract_brand_term, sanitize_description
from app.normalization.models import ReviewIssue, SourceRecordAttribute
from app.normalization.repository import (
    clear_normalization_artifacts,
    count_imported_records,
    get_active_profile_version,
    get_attribute_definition,
    get_batch_for_normalization,
    iter_imported_record_chunks,
    list_active_normalization_rules,
    lock_batch,
)
from app.normalization.schemas import (
    NormalizationBatchSummary,
    NormalizationEligibleBatch,
    NormalizationEligibleBatchListData,
    NormalizationRecordAttributeRead,
    NormalizationRecordDetail,
    NormalizationRecordListData,
    NormalizationRecordRead,
    ReviewIssueListData,
    ReviewIssueRead,
)

BRAND_REQUIRED = True
BRAND_RAW_KEYS = ("MARCA", "marca", "brand")
PROGRESS_INTERVAL = 25
COMMIT_BATCH_SIZE = 100

ProgressCallback = Callable[[int, int], None]


def list_eligible_batches(
    session: Session, tenant: TenantContext
) -> NormalizationEligibleBatchListData:
    items = list(
        session.scalars(
            select(ImportBatch)
            .where(
                ImportBatch.organization_id == tenant.organization_id,
                ImportBatch.status == "COMPLETED",
                ImportBatch.valid_rows > 0,
            )
            .order_by(ImportBatch.imported_at.desc().nullslast(), ImportBatch.created_at.desc())
        )
    )
    return NormalizationEligibleBatchListData(
        items=[
            NormalizationEligibleBatch(
                id=item.id,
                file_name=item.file_name,
                status=item.status,
                valid_rows=item.valid_rows,
                imported_at=item.imported_at,
            )
            for item in items
        ]
    )


def run_batch_normalization(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    *,
    on_progress: ProgressCallback | None = None,
) -> NormalizationBatchSummary:
    batch = lock_batch(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    if batch.status != "COMPLETED":
        raise AppError(
            "NORMALIZATION_BATCH_NOT_READY",
            "Somente lotes concluídos podem ser normalizados.",
            status_code=409,
            details={"status": batch.status},
        )

    profile_version = get_active_profile_version(session, tenant.organization_id)
    if profile_version is None:
        raise AppError(
            "GOVERNANCE_PROFILE_NOT_CONFIGURED",
            "Nenhum perfil de governança ativo está configurado.",
            status_code=404,
        )

    rules = list_active_normalization_rules(session, tenant.organization_id, profile_version.id)
    brand_definition = get_attribute_definition(session, tenant.organization_id, "BRAND")
    unit_definition = get_attribute_definition(session, tenant.organization_id, "CADASTRE_UNIT")
    if brand_definition is None or unit_definition is None:
        raise AppError(
            "GOVERNANCE_PROFILE_NOT_CONFIGURED",
            "Definições de atributos do perfil local não estão disponíveis.",
            status_code=404,
        )

    total_records = count_imported_records(session, tenant.organization_id, batch.id)
    clear_normalization_artifacts(session, tenant.organization_id, batch.id)
    session.flush()

    if on_progress:
        on_progress(0, total_records)

    normalized_count = 0
    pending_count = 0
    attributes_created = 0
    issues_created = 0
    processed = 0

    for chunk in iter_imported_record_chunks(
        session, tenant.organization_id, batch.id, COMMIT_BATCH_SIZE
    ):
        for record in chunk:
            processed += 1
            description = record.original_description
            unit = record.original_unit
            for rule in rules:
                if rule.rule_type == "UNIT_UPPERCASE":
                    unit = apply_rule(rule.rule_type, unit)

            description = sanitize_description(description) or None
            record.normalized_description = description
            has_open_issue = False

            if unit:
                session.add(
                    SourceRecordAttribute(
                        id=uuid4(),
                        organization_id=tenant.organization_id,
                        source_record_id=record.id,
                        attribute_definition_id=unit_definition.id,
                        value_text=unit,
                        extraction_method="RULE_DERIVED",
                        confidence=extraction_confidence("RULE_DERIVED"),
                        confirmed=False,
                    )
                )
                attributes_created += 1

            brand_value = extract_raw_column(record.raw_data, *BRAND_RAW_KEYS)
            brand_method = "COLUMN_MAPPING"
            if not brand_value and description:
                brand_value = extract_brand_term(description)
                if brand_value:
                    brand_method = "RULE_DERIVED"
            if brand_value:
                session.add(
                    SourceRecordAttribute(
                        id=uuid4(),
                        organization_id=tenant.organization_id,
                        source_record_id=record.id,
                        attribute_definition_id=brand_definition.id,
                        value_text=brand_value,
                        extraction_method=brand_method,
                        confidence=extraction_confidence(brand_method),
                        confirmed=False,
                    )
                )
                attributes_created += 1
            elif BRAND_REQUIRED:
                session.add(
                    ReviewIssue(
                        id=uuid4(),
                        organization_id=tenant.organization_id,
                        source_record_id=record.id,
                        attribute_definition_id=brand_definition.id,
                        issue_type="MISSING_INFORMATION",
                        description="Marca ausente no registro de origem.",
                        status="OPEN",
                    )
                )
                issues_created += 1
                has_open_issue = True

            if has_open_issue:
                record.processing_status = "PENDING_INFORMATION"
                pending_count += 1
            else:
                record.processing_status = "NORMALIZED"
                normalized_count += 1

            if on_progress and (processed % PROGRESS_INTERVAL == 0 or processed == total_records):
                on_progress(processed, total_records)

        session.commit()
        for obj in list(session.identity_map.values()):
            if isinstance(obj, (SourceRecord, SourceRecordAttribute, ReviewIssue)):
                session.expunge(obj)

    session.commit()

    return NormalizationBatchSummary(
        batch_id=batch.id,
        file_name=batch.file_name,
        governance_profile_version_id=profile_version.id,
        processed_records=processed,
        normalized_records=normalized_count,
        pending_information_records=pending_count,
        attributes_created=attributes_created,
        issues_created=issues_created,
    )


def get_batch_normalization_summary(
    session: Session, tenant: TenantContext, batch_id: UUID
) -> NormalizationBatchSummary:
    batch = get_batch_for_normalization(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)

    profile_version = get_active_profile_version(session, tenant.organization_id)
    if profile_version is None:
        raise AppError(
            "GOVERNANCE_PROFILE_NOT_CONFIGURED",
            "Nenhum perfil de governança ativo está configurado.",
            status_code=404,
        )

    normalized_count = (
        session.scalar(
            select(func.count())
            .select_from(SourceRecord)
            .where(
                SourceRecord.import_batch_id == batch.id,
                SourceRecord.organization_id == tenant.organization_id,
                SourceRecord.processing_status == "NORMALIZED",
            )
        )
        or 0
    )
    pending_count = (
        session.scalar(
            select(func.count())
            .select_from(SourceRecord)
            .where(
                SourceRecord.import_batch_id == batch.id,
                SourceRecord.organization_id == tenant.organization_id,
                SourceRecord.processing_status == "PENDING_INFORMATION",
            )
        )
        or 0
    )
    attributes_created = (
        session.scalar(
            select(func.count())
            .select_from(SourceRecordAttribute)
            .join(SourceRecord, SourceRecord.id == SourceRecordAttribute.source_record_id)
            .where(
                SourceRecord.import_batch_id == batch.id,
                SourceRecordAttribute.organization_id == tenant.organization_id,
            )
        )
        or 0
    )
    issues_created = (
        session.scalar(
            select(func.count())
            .select_from(ReviewIssue)
            .join(SourceRecord, SourceRecord.id == ReviewIssue.source_record_id)
            .where(
                SourceRecord.import_batch_id == batch.id,
                ReviewIssue.organization_id == tenant.organization_id,
            )
        )
        or 0
    )

    return NormalizationBatchSummary(
        batch_id=batch.id,
        file_name=batch.file_name,
        governance_profile_version_id=profile_version.id,
        processed_records=normalized_count + pending_count,
        normalized_records=normalized_count,
        pending_information_records=pending_count,
        attributes_created=attributes_created,
        issues_created=issues_created,
    )


def list_normalized_records(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    page: int,
    page_size: int,
) -> NormalizationRecordListData:
    batch = get_batch_for_normalization(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    _validate_pagination(page, page_size)

    filters = (
        SourceRecord.organization_id == tenant.organization_id,
        SourceRecord.import_batch_id == batch.id,
        SourceRecord.processing_status.in_(("NORMALIZED", "PENDING_INFORMATION")),
    )
    total = session.scalar(select(func.count()).select_from(SourceRecord).where(*filters)) or 0
    records = list(
        session.scalars(
            select(SourceRecord)
            .where(*filters)
            .order_by(SourceRecord.row_number)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )

    items: list[NormalizationRecordDetail] = []
    for record in records:
        attrs = list(
            session.scalars(
                select(SourceRecordAttribute).where(
                    SourceRecordAttribute.source_record_id == record.id,
                    SourceRecordAttribute.organization_id == tenant.organization_id,
                )
            )
        )
        attribute_reads: list[NormalizationRecordAttributeRead] = []
        for attr in attrs:
            definition = session.get(AttributeDefinition, attr.attribute_definition_id)
            if definition is None:
                continue
            attribute_reads.append(
                NormalizationRecordAttributeRead(
                    attribute_code=definition.code,
                    attribute_name=definition.name,
                    value_text=attr.value_text,
                    extraction_method=attr.extraction_method,
                    confirmed=attr.confirmed,
                )
            )
        items.append(
            NormalizationRecordDetail(
                record=NormalizationRecordRead.model_validate(record),
                attributes=attribute_reads,
            )
        )

    return NormalizationRecordListData(items=items, page=page, page_size=page_size, total=total)


def list_batch_review_issues(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    page: int,
    page_size: int,
) -> ReviewIssueListData:
    batch = get_batch_for_normalization(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    _validate_pagination(page, page_size)

    filters = (
        ReviewIssue.organization_id == tenant.organization_id,
        ReviewIssue.source_record_id == SourceRecord.id,
        SourceRecord.import_batch_id == batch.id,
    )
    total = (
        session.scalar(
            select(func.count())
            .select_from(ReviewIssue)
            .join(SourceRecord, SourceRecord.id == ReviewIssue.source_record_id)
            .where(*filters)
        )
        or 0
    )
    rows = list(
        session.scalars(
            select(ReviewIssue)
            .join(SourceRecord, SourceRecord.id == ReviewIssue.source_record_id)
            .where(*filters)
            .order_by(ReviewIssue.created_at)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )

    items: list[ReviewIssueRead] = []
    for issue in rows:
        attribute_code = None
        if issue.attribute_definition_id is not None:
            definition = session.get(AttributeDefinition, issue.attribute_definition_id)
            attribute_code = definition.code if definition else None
        items.append(
            ReviewIssueRead(
                id=issue.id,
                source_record_id=issue.source_record_id,
                issue_type=issue.issue_type,
                description=issue.description,
                status=issue.status,
                attribute_code=attribute_code,
                created_at=issue.created_at,
            )
        )

    return ReviewIssueListData(items=items, page=page, page_size=page_size, total=total)


def _validate_pagination(page: int, page_size: int) -> None:
    if page < 1 or page_size < 1 or page_size > 100:
        raise AppError(
            "VALIDATION_ERROR",
            "Paginação inválida.",
            status_code=422,
            details={"page": page, "page_size": page_size},
        )
