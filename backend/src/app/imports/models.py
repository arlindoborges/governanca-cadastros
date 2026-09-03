from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SourceSystem(Base):
    __tablename__ = "source_systems"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_source_systems_org_name"),
        UniqueConstraint("id", "organization_id", name="uq_source_systems_id_organization"),
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_source_systems_status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ImportBatch(Base):
    __tablename__ = "import_batches"
    __table_args__ = (
        UniqueConstraint("id", "organization_id", name="uq_import_batches_id_organization"),
        ForeignKeyConstraint(
            ["source_system_id", "organization_id"],
            ["source_systems.id", "source_systems.organization_id"],
            name="fk_import_batches_source_system_org",
        ),
        CheckConstraint(
            "status IN ('AWAITING_MAPPING', 'PROCESSING', 'COMPLETED', 'FAILED')",
            name="ck_import_batches_status",
        ),
        CheckConstraint("file_type IN ('xlsx')", name="ck_import_batches_file_type"),
        CheckConstraint("total_rows >= 0", name="ck_import_batches_total_rows"),
        CheckConstraint("valid_rows >= 0", name="ck_import_batches_valid_rows"),
        CheckConstraint("invalid_rows >= 0", name="ck_import_batches_invalid_rows"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    source_system_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    column_mapping: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    source_reference_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    total_rows: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    valid_rows: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    invalid_rows: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SourceRecord(Base):
    __tablename__ = "source_records"
    __table_args__ = (
        ForeignKeyConstraint(
            ["import_batch_id", "organization_id"],
            ["import_batches.id", "import_batches.organization_id"],
            name="fk_source_records_batch_org",
        ),
        ForeignKeyConstraint(
            ["source_system_id", "organization_id"],
            ["source_systems.id", "source_systems.organization_id"],
            name="fk_source_records_source_system_org",
        ),
        CheckConstraint(
            "processing_status IN ('IMPORTED', 'INVALID', 'NORMALIZED', 'PENDING_INFORMATION')",
            name="ck_source_records_processing_status",
        ),
        CheckConstraint("row_number >= 1", name="ck_source_records_row_number"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    source_system_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    import_batch_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    source_code: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    original_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_unit: Mapped[str | None] = mapped_column(String(100), nullable=True)
    normalized_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_data: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    processing_status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
