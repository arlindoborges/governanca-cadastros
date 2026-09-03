from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
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
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class GovernanceProfile(Base):
    __tablename__ = "governance_profiles"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_governance_profiles_org_name"),
        UniqueConstraint("id", "organization_id", name="uq_governance_profiles_id_organization"),
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_governance_profiles_status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
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


class GovernanceProfileVersion(Base):
    __tablename__ = "governance_profile_versions"
    __table_args__ = (
        UniqueConstraint(
            "governance_profile_id",
            "version_number",
            name="uq_governance_profile_versions_profile_version",
        ),
        UniqueConstraint(
            "id", "organization_id", name="uq_governance_profile_versions_id_organization"
        ),
        ForeignKeyConstraint(
            ["governance_profile_id", "organization_id"],
            ["governance_profiles.id", "governance_profiles.organization_id"],
            name="fk_governance_profile_versions_profile_org",
        ),
        CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')", name="ck_governance_profile_versions_status"
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    governance_profile_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AttributeDefinition(Base):
    __tablename__ = "attribute_definitions"
    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_attribute_definitions_org_code"),
        UniqueConstraint("id", "organization_id", name="uq_attribute_definitions_id_organization"),
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_attribute_definitions_status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    data_type: Mapped[str] = mapped_column(String(30), nullable=False)
    unit_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
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


class NormalizationRule(Base):
    __tablename__ = "normalization_rules"
    __table_args__ = (
        ForeignKeyConstraint(
            ["governance_profile_version_id", "organization_id"],
            [
                "governance_profile_versions.id",
                "governance_profile_versions.organization_id",
            ],
            name="fk_normalization_rules_version_org",
        ),
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_normalization_rules_status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    governance_profile_version_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_pattern: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
