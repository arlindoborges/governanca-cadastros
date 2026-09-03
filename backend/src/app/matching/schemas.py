from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MatchingEligibleBatch(BaseModel):
    id: UUID
    file_name: str
    status: str
    valid_rows: int
    imported_at: datetime | None


class MatchingEligibleBatchListData(BaseModel):
    items: list[MatchingEligibleBatch]


class MatchingEligibleBatchListResponse(BaseModel):
    data: MatchingEligibleBatchListData


class MatchingBatchSummary(BaseModel):
    batch_id: UUID
    file_name: str
    matching_run_id: UUID | None
    governance_profile_version_id: UUID
    algorithm_version: str
    processed_records: int
    equivalent_records: int
    similar_records: int
    different_records: int
    pending_information_records: int
    requires_review_records: int
    candidates_created: int
    evidences_created: int


class MatchingBatchSummaryResponse(BaseModel):
    data: MatchingBatchSummary


class MatchingRunStatus(BaseModel):
    status: str
    processed: int
    total: int
    percent: int
    message: str
    summary: MatchingBatchSummary | None = None


class MatchingRunStatusResponse(BaseModel):
    data: MatchingRunStatus


class MatchingRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    row_number: int
    source_code: str | None
    normalized_description: str | None
    processing_status: str


class MatchCandidateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_source_record_id: UUID | None
    candidate_source_code: str | None
    candidate_description: str | None
    lexical_score: float | None
    attribute_score: float | None
    overall_score: float | None
    relationship_class: str
    confidence_level: str | None
    has_blocker: bool


class MatchingResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_record_id: UUID
    result: str
    confidence_level: str | None
    candidate_count: int
    has_blocker: bool
    requires_review: bool


class MatchingResultDetail(BaseModel):
    record: MatchingRecordRead
    result: MatchingResultRead
    top_candidates: list[MatchCandidateRead]


class MatchingResultListData(BaseModel):
    items: list[MatchingResultDetail]
    page: int
    page_size: int
    total: int


class MatchingResultListResponse(BaseModel):
    data: MatchingResultListData
