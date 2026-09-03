"""Criar governança mínima, normalização, atributos e pendências.

Revision ID: 0003_normalization_attributes
Revises: 0002_import_lineage
Create Date: 2026-09-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_normalization_attributes"
down_revision: Union[str, Sequence[str], None] = "0002_import_lineage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_source_records_processing_status", "source_records", type_="check")
    op.create_check_constraint(
        "ck_source_records_processing_status",
        "source_records",
        "processing_status IN ('IMPORTED', 'INVALID', 'NORMALIZED', 'PENDING_INFORMATION')",
    )

    op.create_table(
        "governance_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_governance_profiles_status"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_governance_profiles_org_name"),
        sa.UniqueConstraint("id", "organization_id", name="uq_governance_profiles_id_organization"),
    )
    op.create_index(
        op.f("ix_governance_profiles_organization_id"),
        "governance_profiles",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "governance_profile_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("governance_profile_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')", name="ck_governance_profile_versions_status"
        ),
        sa.ForeignKeyConstraint(
            ["governance_profile_id", "organization_id"],
            ["governance_profiles.id", "governance_profiles.organization_id"],
            name="fk_governance_profile_versions_profile_org",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "governance_profile_id",
            "version_number",
            name="uq_governance_profile_versions_profile_version",
        ),
        sa.UniqueConstraint(
            "id", "organization_id", name="uq_governance_profile_versions_id_organization"
        ),
    )
    op.create_index(
        op.f("ix_governance_profile_versions_governance_profile_id"),
        "governance_profile_versions",
        ["governance_profile_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_governance_profile_versions_organization_id"),
        "governance_profile_versions",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "uq_governance_profile_versions_one_active",
        "governance_profile_versions",
        ["governance_profile_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    op.create_table(
        "attribute_definitions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("data_type", sa.String(length=30), nullable=False),
        sa.Column("unit_type", sa.String(length=50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_attribute_definitions_status"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "code", name="uq_attribute_definitions_org_code"),
        sa.UniqueConstraint("id", "organization_id", name="uq_attribute_definitions_id_organization"),
    )
    op.create_index(
        op.f("ix_attribute_definitions_organization_id"),
        "attribute_definitions",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "normalization_rules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("governance_profile_version_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("rule_type", sa.String(length=50), nullable=False),
        sa.Column("source_pattern", sa.Text(), nullable=True),
        sa.Column("target_value", sa.Text(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_normalization_rules_status"),
        sa.ForeignKeyConstraint(
            ["governance_profile_version_id", "organization_id"],
            [
                "governance_profile_versions.id",
                "governance_profile_versions.organization_id",
            ],
            name="fk_normalization_rules_version_org",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_normalization_rules_governance_profile_version_id"),
        "normalization_rules",
        ["governance_profile_version_id"],
        unique=False,
    )

    op.create_table(
        "source_record_attributes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("source_record_id", sa.Uuid(), nullable=False),
        sa.Column("attribute_definition_id", sa.Uuid(), nullable=False),
        sa.Column("value_text", sa.Text(), nullable=True),
        sa.Column("value_number", sa.Numeric(), nullable=True),
        sa.Column("value_boolean", sa.Boolean(), nullable=True),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("extraction_method", sa.String(length=30), nullable=False),
        sa.Column("confidence", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("confirmed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["source_record_id"], ["source_records.id"]),
        sa.ForeignKeyConstraint(
            ["attribute_definition_id", "organization_id"],
            ["attribute_definitions.id", "attribute_definitions.organization_id"],
            name="fk_source_record_attributes_definition_org",
        ),
        sa.ForeignKeyConstraint(["confirmed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_record_id",
            "attribute_definition_id",
            name="uq_source_record_attributes_record_definition",
        ),
    )
    op.create_index(
        op.f("ix_source_record_attributes_organization_id"),
        "source_record_attributes",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_source_record_attributes_source_record_id"),
        "source_record_attributes",
        ["source_record_id"],
        unique=False,
    )

    op.create_table(
        "review_issues",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("source_record_id", sa.Uuid(), nullable=False),
        sa.Column("attribute_definition_id", sa.Uuid(), nullable=True),
        sa.Column("issue_type", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("resolved_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('OPEN', 'RESOLVED')", name="ck_review_issues_status"
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["source_record_id"], ["source_records.id"]),
        sa.ForeignKeyConstraint(
            ["attribute_definition_id", "organization_id"],
            ["attribute_definitions.id", "attribute_definitions.organization_id"],
            name="fk_review_issues_attribute_definition_org",
        ),
        sa.ForeignKeyConstraint(["resolved_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_review_issues_organization_id"),
        "review_issues",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_review_issues_source_record_id"),
        "review_issues",
        ["source_record_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_review_issues_status"), "review_issues", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_review_issues_status"), table_name="review_issues")
    op.drop_index(op.f("ix_review_issues_source_record_id"), table_name="review_issues")
    op.drop_index(op.f("ix_review_issues_organization_id"), table_name="review_issues")
    op.drop_table("review_issues")
    op.drop_index(
        op.f("ix_source_record_attributes_source_record_id"),
        table_name="source_record_attributes",
    )
    op.drop_index(
        op.f("ix_source_record_attributes_organization_id"),
        table_name="source_record_attributes",
    )
    op.drop_table("source_record_attributes")
    op.drop_index(
        op.f("ix_normalization_rules_governance_profile_version_id"),
        table_name="normalization_rules",
    )
    op.drop_table("normalization_rules")
    op.drop_index(
        op.f("ix_attribute_definitions_organization_id"), table_name="attribute_definitions"
    )
    op.drop_table("attribute_definitions")
    op.drop_index(
        "uq_governance_profile_versions_one_active", table_name="governance_profile_versions"
    )
    op.drop_index(
        op.f("ix_governance_profile_versions_organization_id"),
        table_name="governance_profile_versions",
    )
    op.drop_index(
        op.f("ix_governance_profile_versions_governance_profile_id"),
        table_name="governance_profile_versions",
    )
    op.drop_table("governance_profile_versions")
    op.drop_index(
        op.f("ix_governance_profiles_organization_id"), table_name="governance_profiles"
    )
    op.drop_table("governance_profiles")
    op.drop_constraint("ck_source_records_processing_status", "source_records", type_="check")
    op.create_check_constraint(
        "ck_source_records_processing_status",
        "source_records",
        "processing_status IN ('IMPORTED', 'INVALID')",
    )
