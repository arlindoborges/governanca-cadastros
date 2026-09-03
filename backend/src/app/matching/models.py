from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class MatchingRun(Base):
    __tablename__ = "matching_runs"
    __table_args__ = (
        UniqueConstraint("id", "organization_id", name="uq_matching_runs_id_organization"),
        ForeignKeyConstraint(
            ["import_batch_id", "organization_id"],
            ["import_batches.id", "import_batches.organization_id"],
            name="fk_matching_runs_batch_org",
        ),
        ForeignKeyConstraint(
            ["governance_profile_version_id", "organization_id"],
            [
                "governance_profile_versions.id",
                "governance_profile_versions.organization_id",
            ],
            name="fk_matching_runs_profile_version_org",
        ),
        CheckConstraint(
            "status IN ('RUNNING', 'COMPLETED', 'FAILED')", name="ck_matching_runs_status"
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    import_batch_id: Mapped[UUID | None] = mapped_column(nullable=True, index=True)
    governance_profile_version_id: Mapped[UUID] = mapped_column(nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String(100), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    configuration: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class MatchingResult(Base):
    __tablename__ = "matching_results"
    __table_args__ = (
        UniqueConstraint(
            "matching_run_id",
            "source_record_id",
            name="uq_matching_results_run_record",
        ),
        UniqueConstraint("id", "organization_id", name="uq_matching_results_id_organization"),
        ForeignKeyConstraint(
            ["matching_run_id", "organization_id"],
            ["matching_runs.id", "matching_runs.organization_id"],
            name="fk_matching_results_run_org",
        ),
        CheckConstraint(
            "result IN ('EQUIVALENT', 'SIMILAR', 'DIFFERENT', 'PENDING_INFORMATION')",
            name="ck_matching_results_result",
        ),
        CheckConstraint("candidate_count >= 0", name="ck_matching_results_candidate_count"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    matching_run_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    source_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("source_records.id"), nullable=False, index=True
    )
    result: Mapped[str] = mapped_column(String(40), nullable=False)
    confidence_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    candidate_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    has_blocker: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    requires_review: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class MatchCandidate(Base):
    __tablename__ = "match_candidates"
    __table_args__ = (
        ForeignKeyConstraint(
            ["matching_result_id", "organization_id"],
            ["matching_results.id", "matching_results.organization_id"],
            name="fk_match_candidates_result_org",
        ),
        ForeignKeyConstraint(
            ["governance_profile_version_id", "organization_id"],
            [
                "governance_profile_versions.id",
                "governance_profile_versions.organization_id",
            ],
            name="fk_match_candidates_profile_version_org",
        ),
        CheckConstraint(
            "relationship_class IN ('EQUIVALENT', 'SIMILAR', 'DIFFERENT', 'INDETERMINATE')",
            name="ck_match_candidates_relationship_class",
        ),
        CheckConstraint(
            "(candidate_source_record_id IS NOT NULL AND candidate_master_product_id IS NULL) "
            "OR (candidate_source_record_id IS NULL AND candidate_master_product_id IS NOT NULL)",
            name="ck_match_candidates_single_target",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    matching_result_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    source_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("source_records.id"), nullable=False, index=True
    )
    candidate_source_record_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("source_records.id"), nullable=True, index=True
    )
    candidate_master_product_id: Mapped[UUID | None] = mapped_column(nullable=True)
    governance_profile_version_id: Mapped[UUID] = mapped_column(nullable=False)
    lexical_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    semantic_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    attribute_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    overall_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    relationship_class: Mapped[str] = mapped_column(String(40), nullable=False)
    confidence_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    has_blocker: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class MatchEvidence(Base):
    __tablename__ = "match_evidences"
    __table_args__ = (
        ForeignKeyConstraint(
            ["attribute_definition_id", "organization_id"],
            ["attribute_definitions.id", "attribute_definitions.organization_id"],
            name="fk_match_evidences_attribute_definition_org",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    match_candidate_id: Mapped[UUID] = mapped_column(
        ForeignKey("match_candidates.id"), nullable=False, index=True
    )
    attribute_definition_id: Mapped[UUID | None] = mapped_column(nullable=True)
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False)
    evidence_source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    candidate_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[str] = mapped_column(String(30), nullable=False)
    is_blocker: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
