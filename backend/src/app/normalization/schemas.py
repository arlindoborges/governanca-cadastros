from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

DescriptionSanitizeMode = Literal["fase1", "basica", "original", "custom"]
DescriptionSanitizeStep = Literal[
    "grafia",
    "identifiers",
    "units",
    "technical_specs",
    "dimensions",
    "packaging",
    "abbreviations",
    "uniform_sizes",
    "punctuation",
    "special_chars",
    "colors",
    "brands",
    "structure",
    "semantics",
]


class Fase1RunOptions(BaseModel):
    spaces: Literal["padrao", "manter"] = "padrao"
    uppercase: bool = True
    accents: bool = True
    identifiers: bool = True
    unit_aliases: bool = True
    unit_split: bool = True
    unit_l_to_lt: bool = True
    unit_m_to_mt: bool = True
    unit_percent_join: bool = True
    spec_mt_s: bool = True
    spec_join_thousands: bool = True
    spec_join_sigla: bool = True
    spec_thousand_dots: bool = True
    dimensions_x: bool = True
    dimensions_order: bool = True
    dimensions_decimals: bool = True
    packaging_dash: bool = True
    packaging_c_slash: bool = True
    abbr_c: bool = True
    abbr_s: bool = True
    abbr_p: bool = True
    size_tam_n: bool = True
    size_n_ordinal: bool = True
    size_strip_tam: bool = True
    size_unico: bool = True
    punct_before: bool = True
    punct_after: bool = True
    punct_repeat: bool = True
    punct_decorative_hyphens: bool = True
    special_n_ordinal: bool = True
    special_ordinal_symbols: bool = True
    special_quotes: bool = True
    special_control: bool = True
    special_slash_preserve: bool = True
    colors_simple: bool = True
    colors_compound: bool = True
    colors_reposition: bool = True
    brand_marca: bool = True
    brand_linha: bool = True
    brand_interna: bool = True
    brand_legado: bool = True
    structure_parens: bool = True
    structure_complements: bool = True
    structure_no_invent: bool = True
    structure_priority_meaning: bool = True
    semantics_aco: bool = True
    semantics_cola: bool = True
    semantics_concentrado: bool = True
    semantics_corrente: bool = True
    semantics_balde: bool = True
    semantics_limit: bool = True


class NormalizationRunIn(BaseModel):
    description_mode: DescriptionSanitizeMode = "fase1"
    description_steps: list[DescriptionSanitizeStep] | None = None
    fase1: Fase1RunOptions | None = None


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
