from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SourceRecordAttribute(Base):
    __tablename__ = "source_record_attributes"
    __table_args__ = (
        UniqueConstraint(
            "source_record_id",
            "attribute_definition_id",
            name="uq_source_record_attributes_record_definition",
        ),
        ForeignKeyConstraint(
            ["attribute_definition_id", "organization_id"],
            ["attribute_definitions.id", "attribute_definitions.organization_id"],
            name="fk_source_record_attributes_definition_org",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    source_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("source_records.id"), nullable=False, index=True
    )
    attribute_definition_id: Mapped[UUID] = mapped_column(nullable=False)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_number: Mapped[Decimal | None] = mapped_column(Numeric(), nullable=True)
    value_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    extraction_method: Mapped[str] = mapped_column(String(30), nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    confirmed_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ReviewIssue(Base):
    __tablename__ = "review_issues"
    __table_args__ = (
        CheckConstraint("status IN ('OPEN', 'RESOLVED')", name="ck_review_issues_status"),
        ForeignKeyConstraint(
            ["attribute_definition_id", "organization_id"],
            ["attribute_definitions.id", "attribute_definitions.organization_id"],
            name="fk_review_issues_attribute_definition_org",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    source_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("source_records.id"), nullable=False, index=True
    )
    attribute_definition_id: Mapped[UUID | None] = mapped_column(nullable=True)
    issue_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
