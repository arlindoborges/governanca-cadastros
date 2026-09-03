from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.tenant import TenantContext
from app.governance.models import AttributeDefinition
from app.imports.models import SourceRecord
from app.matching.engine import (
    DEFAULT_CONFIGURATION,
    MATCHING_ALGORITHM_VERSION,
    build_record_matching,
)
from app.matching.models import MatchCandidate, MatchEvidence, MatchingResult, MatchingRun
from app.matching.repository import (
    get_active_profile_version,
    get_batch_for_matching,
    get_latest_run,
    list_candidates_for_result,
    list_eligible_batches,
    list_matchable_records,
    list_results_for_run,
    load_attributes_by_record,
    lock_batch,
)
from app.matching.schemas import (
    MatchCandidateRead,
    MatchingBatchSummary,
    MatchingEligibleBatch,
    MatchingEligibleBatchListData,
    MatchingRecordRead,
    MatchingResultDetail,
    MatchingResultListData,
    MatchingResultRead,
)

PROGRESS_INTERVAL = 25
COMMIT_BATCH_SIZE = 100

ProgressCallback = Callable[[int, int], None]


def list_eligible_matching_batches(
    session: Session, tenant: TenantContext
) -> MatchingEligibleBatchListData:
    items = list_eligible_batches(session, tenant.organization_id)
    return MatchingEligibleBatchListData(
        items=[
            MatchingEligibleBatch(
                id=item.id,
                file_name=item.file_name,
                status=item.status,
                valid_rows=item.valid_rows,
                imported_at=item.imported_at,
            )
            for item in items
        ]
    )


def run_batch_matching(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    *,
    on_progress: ProgressCallback | None = None,
) -> MatchingBatchSummary:
    batch = lock_batch(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)
    if batch.status != "COMPLETED":
        raise AppError(
            "MATCHING_BATCH_NOT_READY",
            "Somente lotes concluídos podem ser analisados.",
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

    records = list_matchable_records(session, tenant.organization_id, batch.id)
    if not records:
        raise AppError(
            "MATCHING_NO_RECORDS",
            "Nenhum registro normalizado disponível para matching.",
            status_code=409,
        )

    attribute_definitions = {
        item.code: item.id
        for item in session.scalars(
            select(AttributeDefinition).where(
                AttributeDefinition.organization_id == tenant.organization_id,
                AttributeDefinition.status == "ACTIVE",
            )
        )
    }

    record_ids = [record.id for record in records]
    attributes_by_record = load_attributes_by_record(session, tenant.organization_id, record_ids)
    candidate_pool = [
        (
            str(record.id),
            record.normalized_description,
            attributes_by_record.get(record.id, {}),
        )
        for record in records
    ]

    started_at = datetime.now(UTC)
    run = MatchingRun(
        id=uuid4(),
        organization_id=tenant.organization_id,
        import_batch_id=batch.id,
        governance_profile_version_id=profile_version.id,
        algorithm_version=MATCHING_ALGORITHM_VERSION,
        trigger_type="INITIAL_ANALYSIS",
        status="RUNNING",
        started_at=started_at,
        configuration=DEFAULT_CONFIGURATION,
    )
    session.add(run)
    session.flush()

    equivalent_count = 0
    similar_count = 0
    different_count = 0
    pending_count = 0
    requires_review_count = 0
    candidates_created = 0
    evidences_created = 0

    total_records = len(records)
    if on_progress:
        on_progress(0, total_records)

    for index, record in enumerate(records, start=1):
        draft = build_record_matching(
            source_record_id=str(record.id),
            source_description=record.normalized_description,
            source_status=record.processing_status,
            source_attributes=attributes_by_record.get(record.id, {}),
            candidate_records=candidate_pool,
            configuration=DEFAULT_CONFIGURATION,
        )

        result = MatchingResult(
            id=uuid4(),
            matching_run_id=run.id,
            organization_id=tenant.organization_id,
            source_record_id=record.id,
            result=draft.result,
            confidence_level=draft.confidence_level,
            candidate_count=draft.candidate_count,
            has_blocker=draft.has_blocker,
            requires_review=draft.requires_review,
        )
        session.add(result)
        session.flush()

        if draft.result == "EQUIVALENT":
            equivalent_count += 1
        elif draft.result == "SIMILAR":
            similar_count += 1
        elif draft.result == "PENDING_INFORMATION":
            pending_count += 1
        else:
            different_count += 1
        if draft.requires_review:
            requires_review_count += 1

        for candidate_draft in draft.candidates:
            candidate_record_id = UUID(candidate_draft.candidate_source_record_id)
            candidate = MatchCandidate(
                id=uuid4(),
                organization_id=tenant.organization_id,
                matching_result_id=result.id,
                source_record_id=record.id,
                candidate_source_record_id=candidate_record_id,
                candidate_master_product_id=None,
                governance_profile_version_id=profile_version.id,
                lexical_score=candidate_draft.lexical_score,
                semantic_score=None,
                attribute_score=candidate_draft.attribute_score,
                overall_score=candidate_draft.overall_score,
                relationship_class=candidate_draft.relationship_class,
                confidence_level=candidate_draft.confidence_level,
                has_blocker=candidate_draft.has_blocker,
            )
            session.add(candidate)
            candidates_created += 1

            for evidence_draft in candidate_draft.evidences:
                attribute_definition_id = None
                if evidence_draft.attribute_code is not None:
                    attribute_definition_id = attribute_definitions.get(
                        evidence_draft.attribute_code
                    )
                session.add(
                    MatchEvidence(
                        id=uuid4(),
                        organization_id=tenant.organization_id,
                        match_candidate_id=candidate.id,
                        attribute_definition_id=attribute_definition_id,
                        evidence_type=evidence_draft.evidence_type,
                        evidence_source=evidence_draft.evidence_source,
                        source_value=evidence_draft.source_value,
                        candidate_value=evidence_draft.candidate_value,
                        result=evidence_draft.result,
                        is_blocker=evidence_draft.is_blocker,
                        score=evidence_draft.score,
                        description=evidence_draft.description,
                    )
                )
                evidences_created += 1

        if on_progress and (index % PROGRESS_INTERVAL == 0 or index == total_records):
            on_progress(index, total_records)
        if index % COMMIT_BATCH_SIZE == 0:
            session.commit()

    run.status = "COMPLETED"
    run.completed_at = datetime.now(UTC)
    session.commit()

    return MatchingBatchSummary(
        batch_id=batch.id,
        file_name=batch.file_name,
        matching_run_id=run.id,
        governance_profile_version_id=profile_version.id,
        algorithm_version=MATCHING_ALGORITHM_VERSION,
        processed_records=len(records),
        equivalent_records=equivalent_count,
        similar_records=similar_count,
        different_records=different_count,
        pending_information_records=pending_count,
        requires_review_records=requires_review_count,
        candidates_created=candidates_created,
        evidences_created=evidences_created,
    )


def get_batch_matching_summary(
    session: Session, tenant: TenantContext, batch_id: UUID
) -> MatchingBatchSummary:
    batch = get_batch_for_matching(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)

    profile_version = get_active_profile_version(session, tenant.organization_id)
    if profile_version is None:
        raise AppError(
            "GOVERNANCE_PROFILE_NOT_CONFIGURED",
            "Nenhum perfil de governança ativo está configurado.",
            status_code=404,
        )

    run = get_latest_run(session, tenant.organization_id, batch_id)
    if run is None:
        return MatchingBatchSummary(
            batch_id=batch.id,
            file_name=batch.file_name,
            matching_run_id=None,
            governance_profile_version_id=profile_version.id,
            algorithm_version=MATCHING_ALGORITHM_VERSION,
            processed_records=0,
            equivalent_records=0,
            similar_records=0,
            different_records=0,
            pending_information_records=0,
            requires_review_records=0,
            candidates_created=0,
            evidences_created=0,
        )

    processed_records = (
        session.scalar(
            select(func.count())
            .select_from(MatchingResult)
            .where(MatchingResult.matching_run_id == run.id)
        )
        or 0
    )
    equivalent_records = (
        session.scalar(
            select(func.count())
            .select_from(MatchingResult)
            .where(
                MatchingResult.matching_run_id == run.id,
                MatchingResult.result == "EQUIVALENT",
            )
        )
        or 0
    )
    similar_records = (
        session.scalar(
            select(func.count())
            .select_from(MatchingResult)
            .where(
                MatchingResult.matching_run_id == run.id,
                MatchingResult.result == "SIMILAR",
            )
        )
        or 0
    )
    different_records = (
        session.scalar(
            select(func.count())
            .select_from(MatchingResult)
            .where(
                MatchingResult.matching_run_id == run.id,
                MatchingResult.result == "DIFFERENT",
            )
        )
        or 0
    )
    pending_information_records = (
        session.scalar(
            select(func.count())
            .select_from(MatchingResult)
            .where(
                MatchingResult.matching_run_id == run.id,
                MatchingResult.result == "PENDING_INFORMATION",
            )
        )
        or 0
    )
    requires_review_records = (
        session.scalar(
            select(func.count())
            .select_from(MatchingResult)
            .where(
                MatchingResult.matching_run_id == run.id,
                MatchingResult.requires_review.is_(True),
            )
        )
        or 0
    )
    candidates_created = (
        session.scalar(
            select(func.count())
            .select_from(MatchCandidate)
            .join(MatchingResult, MatchingResult.id == MatchCandidate.matching_result_id)
            .where(MatchingResult.matching_run_id == run.id)
        )
        or 0
    )
    evidences_created = (
        session.scalar(
            select(func.count())
            .select_from(MatchEvidence)
            .join(MatchCandidate, MatchCandidate.id == MatchEvidence.match_candidate_id)
            .join(MatchingResult, MatchingResult.id == MatchCandidate.matching_result_id)
            .where(MatchingResult.matching_run_id == run.id)
        )
        or 0
    )

    return MatchingBatchSummary(
        batch_id=batch.id,
        file_name=batch.file_name,
        matching_run_id=run.id,
        governance_profile_version_id=profile_version.id,
        algorithm_version=run.algorithm_version,
        processed_records=processed_records,
        equivalent_records=equivalent_records,
        similar_records=similar_records,
        different_records=different_records,
        pending_information_records=pending_information_records,
        requires_review_records=requires_review_records,
        candidates_created=candidates_created,
        evidences_created=evidences_created,
    )


def list_matching_results(
    session: Session,
    tenant: TenantContext,
    batch_id: UUID,
    page: int,
    page_size: int,
) -> MatchingResultListData:
    batch = get_batch_for_matching(session, tenant.organization_id, batch_id)
    if batch is None:
        raise AppError("NOT_FOUND", "Recurso não encontrado.", status_code=404)

    run = get_latest_run(session, tenant.organization_id, batch_id)
    if run is None:
        return MatchingResultListData(items=[], page=page, page_size=page_size, total=0)

    _validate_pagination(page, page_size)
    results, total = list_results_for_run(session, tenant.organization_id, run.id, page, page_size)

    items: list[MatchingResultDetail] = []
    for result in results:
        record = session.get(SourceRecord, result.source_record_id)
        if record is None or record.organization_id != tenant.organization_id:
            continue
        candidates = list_candidates_for_result(session, tenant.organization_id, result.id)
        top_candidates: list[MatchCandidateRead] = []
        for candidate in candidates[:3]:
            candidate_record = (
                session.get(SourceRecord, candidate.candidate_source_record_id)
                if candidate.candidate_source_record_id
                else None
            )
            top_candidates.append(
                MatchCandidateRead(
                    id=candidate.id,
                    candidate_source_record_id=candidate.candidate_source_record_id,
                    candidate_source_code=(
                        candidate_record.source_code if candidate_record else None
                    ),
                    candidate_description=(
                        candidate_record.normalized_description if candidate_record else None
                    ),
                    lexical_score=float(candidate.lexical_score)
                    if candidate.lexical_score is not None
                    else None,
                    attribute_score=float(candidate.attribute_score)
                    if candidate.attribute_score is not None
                    else None,
                    overall_score=float(candidate.overall_score)
                    if candidate.overall_score is not None
                    else None,
                    relationship_class=candidate.relationship_class,
                    confidence_level=candidate.confidence_level,
                    has_blocker=candidate.has_blocker,
                )
            )
        items.append(
            MatchingResultDetail(
                record=MatchingRecordRead.model_validate(record),
                result=MatchingResultRead.model_validate(result),
                top_candidates=top_candidates,
            )
        )

    return MatchingResultListData(items=items, page=page, page_size=page_size, total=total)


def _validate_pagination(page: int, page_size: int) -> None:
    if page < 1 or page_size < 1 or page_size > 100:
        raise AppError(
            "VALIDATION_ERROR",
            "Paginação inválida.",
            status_code=422,
            details={"page": page, "page_size": page_size},
        )
