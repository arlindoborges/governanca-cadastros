from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NormalizationBatchSummary(BaseModel):
    batch_id: UUID
    file_name: str
    governance_profile_version_id: UUID
    processed_records: int
    normalized_records: int
    pending_information_records: int
    attributes_created: int
    issues_created: int


class NormalizationBatchSummaryResponse(BaseModel):
    data: NormalizationBatchSummary


class NormalizationRunStatus(BaseModel):
    status: str
    processed: int
    total: int
    percent: int
    message: str
    summary: NormalizationBatchSummary | None = None


class NormalizationRunStatusResponse(BaseModel):
    data: NormalizationRunStatus


class NormalizationRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    row_number: int
    source_code: str | None
    original_description: str | None
    original_unit: str | None
    normalized_description: str | None
    processing_status: str


class NormalizationRecordAttributeRead(BaseModel):
    attribute_code: str
    attribute_name: str
    value_text: str | None
    extraction_method: str
    confirmed: bool


class NormalizationRecordDetail(BaseModel):
    record: NormalizationRecordRead
    attributes: list[NormalizationRecordAttributeRead]


class NormalizationRecordListData(BaseModel):
    items: list[NormalizationRecordDetail]
    page: int
    page_size: int
    total: int


class NormalizationRecordListResponse(BaseModel):
    data: NormalizationRecordListData


class ReviewIssueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_record_id: UUID
    issue_type: str
    description: str
    status: str
    attribute_code: str | None = None
    created_at: datetime


class ReviewIssueListData(BaseModel):
    items: list[ReviewIssueRead]
    page: int
    page_size: int
    total: int


class ReviewIssueListResponse(BaseModel):
    data: ReviewIssueListData


class NormalizationEligibleBatch(BaseModel):
    id: UUID
    file_name: str
    status: str
    valid_rows: int
    imported_at: datetime | None


class NormalizationEligibleBatchListData(BaseModel):
    items: list[NormalizationEligibleBatch]


class NormalizationEligibleBatchListResponse(BaseModel):
    data: NormalizationEligibleBatchListData
