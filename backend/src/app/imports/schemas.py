from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ColumnMappingIn(BaseModel):
    source_code: str = Field(..., min_length=1, max_length=255)
    original_description: str = Field(..., min_length=1, max_length=255)
    original_unit: str = Field(..., min_length=1, max_length=255)


class ImportBatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_system_id: UUID
    file_name: str
    file_type: str
    file_hash: str
    column_mapping: dict[str, Any] | None
    source_reference_date: date | None
    status: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    imported_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ImportBatchPreviewData(BaseModel):
    batch: ImportBatchRead
    headers: list[str]
    sample_rows: list[dict[str, str]]


class ImportBatchPreviewResponse(BaseModel):
    data: ImportBatchPreviewData


class ImportBatchListData(BaseModel):
    items: list[ImportBatchRead]
    page: int
    page_size: int
    total: int


class ImportBatchListResponse(BaseModel):
    data: ImportBatchListData


class ImportRowError(BaseModel):
    row_number: int
    source_code: str | None
    original_description: str | None
    original_unit: str | None
    issues: list[str]


class ImportRowErrorListData(BaseModel):
    items: list[ImportRowError]
    page: int
    page_size: int
    total: int


class ImportRowErrorListResponse(BaseModel):
    data: ImportRowErrorListData


class ImportBatchDeleteStatus(BaseModel):
    status: str
    processed: int
    total: int
    percent: int
    message: str
    batch_id: UUID | None = None


class ImportBatchDeleteStatusResponse(BaseModel):
    data: ImportBatchDeleteStatus


class ImportBatchProcessingStatus(BaseModel):
    status: str
    processed: int
    total: int
    percent: int
    message: str
    batch_id: UUID | None = None
    preview: ImportBatchPreviewData | None = None


class ImportBatchProcessingStatusResponse(BaseModel):
    data: ImportBatchProcessingStatus
