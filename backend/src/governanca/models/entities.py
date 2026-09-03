from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from governanca.core.db import Base
from governanca.core.tenant import LOCAL_ORG_ID


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=lambda: LOCAL_ORG_ID)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SanitizationConfigProfile(Base):
    __tablename__ = "sanitization_config_profiles"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True, unique=True)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SanitizationProject(Base):
    __tablename__ = "sanitization_projects"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    batches: Mapped[list["ImportBatch"]] = relationship(back_populates="project")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("sanitization_projects.id"), index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="AWAITING_MAPPING")
    column_mapping: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped[SanitizationProject] = relationship(back_populates="batches")
    records: Mapped[list["SourceRecord"]] = relationship(back_populates="batch")


class SourceRecord(Base):
    __tablename__ = "source_records"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    batch_id: Mapped[UUID] = mapped_column(ForeignKey("import_batches.id"), index=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    source_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_unit: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sanitized_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_status: Mapped[str] = mapped_column(String(30), default="IMPORTED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch: Mapped[ImportBatch] = relationship(back_populates="records")


class MatchGroup(Base):
    __tablename__ = "match_groups"
    __table_args__ = (UniqueConstraint("organization_id", "code", name="uq_match_groups_org_code"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    batch_id: Mapped[UUID] = mapped_column(ForeignKey("import_batches.id"), index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    group_type: Mapped[str] = mapped_column(String(40), nullable=False)
    size: Mapped[int] = mapped_column(Integer, default=0)


class MatchCandidate(Base):
    __tablename__ = "match_candidates"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    batch_id: Mapped[UUID] = mapped_column(ForeignKey("import_batches.id"), index=True)
    source_record_id: Mapped[UUID] = mapped_column(ForeignKey("source_records.id"), index=True)
    candidate_record_id: Mapped[UUID] = mapped_column(ForeignKey("source_records.id"), index=True)
    relationship_class: Mapped[str] = mapped_column(String(20), nullable=False)
    score: Mapped[float] = mapped_column(nullable=False)
    group_id: Mapped[UUID | None] = mapped_column(ForeignKey("match_groups.id"), nullable=True)


class SanitizationDecision(Base):
    __tablename__ = "sanitization_decisions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    source_record_id: Mapped[UUID] = mapped_column(ForeignKey("source_records.id"), index=True)
    candidate_id: Mapped[UUID | None] = mapped_column(ForeignKey("match_candidates.id"), nullable=True)
    decision: Mapped[str] = mapped_column(String(40), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class MasterProduct(Base):
    __tablename__ = "master_products"
    __table_args__ = (UniqueConstraint("organization_id", "master_code", name="uq_master_products_org_code"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    master_code: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProductMapping(Base):
    __tablename__ = "product_mappings"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    source_record_id: Mapped[UUID] = mapped_column(ForeignKey("source_records.id"), index=True)
    master_product_id: Mapped[UUID] = mapped_column(ForeignKey("master_products.id"), index=True)
    mapping_type: Mapped[str] = mapped_column(String(30), nullable=False)
    conversion_factor: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=Decimal("1"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
