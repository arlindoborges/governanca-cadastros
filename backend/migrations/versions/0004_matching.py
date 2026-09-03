"""Criar matching runs, resultados, candidatos e evidências.

Revision ID: 0004_matching
Revises: 0003_normalization_attributes
Create Date: 2026-09-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_matching"
down_revision: Union[str, Sequence[str], None] = "0003_normalization_attributes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "matching_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("import_batch_id", sa.Uuid(), nullable=True),
        sa.Column("governance_profile_version_id", sa.Uuid(), nullable=False),
        sa.Column("algorithm_version", sa.String(length=100), nullable=False),
        sa.Column("trigger_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("configuration", sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('RUNNING', 'COMPLETED', 'FAILED')", name="ck_matching_runs_status"
        ),
        sa.ForeignKeyConstraint(
            ["import_batch_id", "organization_id"],
            ["import_batches.id", "import_batches.organization_id"],
            name="fk_matching_runs_batch_org",
        ),
        sa.ForeignKeyConstraint(
            ["governance_profile_version_id", "organization_id"],
            [
                "governance_profile_versions.id",
                "governance_profile_versions.organization_id",
            ],
            name="fk_matching_runs_profile_version_org",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "organization_id", name="uq_matching_runs_id_organization"),
    )
    op.create_index(
        op.f("ix_matching_runs_organization_id"),
        "matching_runs",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_matching_runs_import_batch_id"),
        "matching_runs",
        ["import_batch_id"],
        unique=False,
    )

    op.create_table(
        "matching_results",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("matching_run_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("source_record_id", sa.Uuid(), nullable=False),
        sa.Column("result", sa.String(length=40), nullable=False),
        sa.Column("confidence_level", sa.String(length=30), nullable=True),
        sa.Column("candidate_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("has_blocker", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("requires_review", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "result IN ('EQUIVALENT', 'SIMILAR', 'DIFFERENT', 'PENDING_INFORMATION')",
            name="ck_matching_results_result",
        ),
        sa.CheckConstraint("candidate_count >= 0", name="ck_matching_results_candidate_count"),
        sa.ForeignKeyConstraint(
            ["matching_run_id", "organization_id"],
            ["matching_runs.id", "matching_runs.organization_id"],
            name="fk_matching_results_run_org",
        ),
        sa.ForeignKeyConstraint(["source_record_id"], ["source_records.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "matching_run_id",
            "source_record_id",
            name="uq_matching_results_run_record",
        ),
        sa.UniqueConstraint("id", "organization_id", name="uq_matching_results_id_organization"),
    )
    op.create_index(
        op.f("ix_matching_results_matching_run_id"),
        "matching_results",
        ["matching_run_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_matching_results_source_record_id"),
        "matching_results",
        ["source_record_id"],
        unique=False,
    )

    op.create_table(
        "match_candidates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("matching_result_id", sa.Uuid(), nullable=False),
        sa.Column("source_record_id", sa.Uuid(), nullable=False),
        sa.Column("candidate_source_record_id", sa.Uuid(), nullable=True),
        sa.Column("candidate_master_product_id", sa.Uuid(), nullable=True),
        sa.Column("governance_profile_version_id", sa.Uuid(), nullable=False),
        sa.Column("lexical_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("semantic_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("attribute_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("overall_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("relationship_class", sa.String(length=40), nullable=False),
        sa.Column("confidence_level", sa.String(length=30), nullable=True),
        sa.Column("has_blocker", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "relationship_class IN ('EQUIVALENT', 'SIMILAR', 'DIFFERENT', 'INDETERMINATE')",
            name="ck_match_candidates_relationship_class",
        ),
        sa.CheckConstraint(
            "(candidate_source_record_id IS NOT NULL AND candidate_master_product_id IS NULL) "
            "OR (candidate_source_record_id IS NULL AND candidate_master_product_id IS NOT NULL)",
            name="ck_match_candidates_single_target",
        ),
        sa.ForeignKeyConstraint(["candidate_source_record_id"], ["source_records.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["source_record_id"], ["source_records.id"]),
        sa.ForeignKeyConstraint(
            ["matching_result_id", "organization_id"],
            ["matching_results.id", "matching_results.organization_id"],
            name="fk_match_candidates_result_org",
        ),
        sa.ForeignKeyConstraint(
            ["governance_profile_version_id", "organization_id"],
            [
                "governance_profile_versions.id",
                "governance_profile_versions.organization_id",
            ],
            name="fk_match_candidates_profile_version_org",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_match_candidates_matching_result_id"),
        "match_candidates",
        ["matching_result_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_match_candidates_organization_id"),
        "match_candidates",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "match_evidences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("match_candidate_id", sa.Uuid(), nullable=False),
        sa.Column("attribute_definition_id", sa.Uuid(), nullable=True),
        sa.Column("evidence_type", sa.String(length=50), nullable=False),
        sa.Column("evidence_source", sa.String(length=50), nullable=False),
        sa.Column("source_value", sa.Text(), nullable=True),
        sa.Column("candidate_value", sa.Text(), nullable=True),
        sa.Column("result", sa.String(length=30), nullable=False),
        sa.Column("is_blocker", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["match_candidate_id"], ["match_candidates.id"]),
        sa.ForeignKeyConstraint(
            ["attribute_definition_id", "organization_id"],
            ["attribute_definitions.id", "attribute_definitions.organization_id"],
            name="fk_match_evidences_attribute_definition_org",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_match_evidences_match_candidate_id"),
        "match_evidences",
        ["match_candidate_id"],
        unique=False,
    )

    op.add_column("review_issues", sa.Column("match_candidate_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_review_issues_match_candidate",
        "review_issues",
        "match_candidates",
        ["match_candidate_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_review_issues_match_candidate_id"),
        "review_issues",
        ["match_candidate_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_review_issues_match_candidate_id"), table_name="review_issues")
    op.drop_constraint("fk_review_issues_match_candidate", "review_issues", type_="foreignkey")
    op.drop_column("review_issues", "match_candidate_id")
    op.drop_index(op.f("ix_match_evidences_match_candidate_id"), table_name="match_evidences")
    op.drop_table("match_evidences")
    op.drop_index(op.f("ix_match_candidates_organization_id"), table_name="match_candidates")
    op.drop_index(op.f("ix_match_candidates_matching_result_id"), table_name="match_candidates")
    op.drop_table("match_candidates")
    op.drop_index(op.f("ix_matching_results_source_record_id"), table_name="matching_results")
    op.drop_index(op.f("ix_matching_results_matching_run_id"), table_name="matching_results")
    op.drop_table("matching_results")
    op.drop_index(op.f("ix_matching_runs_import_batch_id"), table_name="matching_runs")
    op.drop_index(op.f("ix_matching_runs_organization_id"), table_name="matching_runs")
    op.drop_table("matching_runs")
