"""Criar source_systems, import_batches e source_records.

Revision ID: 0002_import_lineage
Revises: 0001_foundation_tenant
Create Date: 2026-09-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_import_lineage"
down_revision: Union[str, Sequence[str], None] = "0001_foundation_tenant"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_systems",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
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
        sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_source_systems_status"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_source_systems_org_name"),
        sa.UniqueConstraint("id", "organization_id", name="uq_source_systems_id_organization"),
    )
    op.create_index(
        op.f("ix_source_systems_organization_id"),
        "source_systems",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "import_batches",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("source_system_id", sa.Uuid(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_type", sa.String(length=20), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=False),
        sa.Column("column_mapping", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("source_reference_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("total_rows", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("valid_rows", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("invalid_rows", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=True),
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
            "status IN ('AWAITING_MAPPING', 'PROCESSING', 'COMPLETED', 'FAILED')",
            name="ck_import_batches_status",
        ),
        sa.CheckConstraint("file_type IN ('csv')", name="ck_import_batches_file_type"),
        sa.CheckConstraint("total_rows >= 0", name="ck_import_batches_total_rows"),
        sa.CheckConstraint("valid_rows >= 0", name="ck_import_batches_valid_rows"),
        sa.CheckConstraint("invalid_rows >= 0", name="ck_import_batches_invalid_rows"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(
            ["source_system_id", "organization_id"],
            ["source_systems.id", "source_systems.organization_id"],
            name="fk_import_batches_source_system_org",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "organization_id", name="uq_import_batches_id_organization"),
    )
    op.create_index(
        op.f("ix_import_batches_organization_id"),
        "import_batches",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_import_batches_source_system_id"),
        "import_batches",
        ["source_system_id"],
        unique=False,
    )
    op.create_index(op.f("ix_import_batches_status"), "import_batches", ["status"], unique=False)
    op.create_index(
        op.f("ix_import_batches_file_hash"), "import_batches", ["file_hash"], unique=False
    )
    op.create_index(
        "uq_import_batches_org_system_hash_active",
        "import_batches",
        ["organization_id", "source_system_id", "file_hash"],
        unique=True,
        postgresql_where=sa.text("status IN ('AWAITING_MAPPING', 'PROCESSING', 'COMPLETED')"),
    )

    op.create_table(
        "source_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("source_system_id", sa.Uuid(), nullable=False),
        sa.Column("import_batch_id", sa.Uuid(), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("source_code", sa.String(length=255), nullable=True),
        sa.Column("original_description", sa.Text(), nullable=True),
        sa.Column("original_unit", sa.String(length=100), nullable=True),
        sa.Column("normalized_description", sa.Text(), nullable=True),
        sa.Column(
            "raw_data",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("processing_status", sa.String(length=30), nullable=False),
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
            "processing_status IN ('IMPORTED', 'INVALID')",
            name="ck_source_records_processing_status",
        ),
        sa.CheckConstraint("row_number >= 1", name="ck_source_records_row_number"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(
            ["import_batch_id", "organization_id"],
            ["import_batches.id", "import_batches.organization_id"],
            name="fk_source_records_batch_org",
        ),
        sa.ForeignKeyConstraint(
            ["source_system_id", "organization_id"],
            ["source_systems.id", "source_systems.organization_id"],
            name="fk_source_records_source_system_org",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_source_records_organization_id"),
        "source_records",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_source_records_import_batch_id"),
        "source_records",
        ["import_batch_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_source_records_source_system_id"),
        "source_records",
        ["source_system_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_source_records_source_code"), "source_records", ["source_code"], unique=False
    )
    op.create_index(
        op.f("ix_source_records_processing_status"),
        "source_records",
        ["processing_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_source_records_processing_status"), table_name="source_records")
    op.drop_index(op.f("ix_source_records_source_code"), table_name="source_records")
    op.drop_index(op.f("ix_source_records_source_system_id"), table_name="source_records")
    op.drop_index(op.f("ix_source_records_import_batch_id"), table_name="source_records")
    op.drop_index(op.f("ix_source_records_organization_id"), table_name="source_records")
    op.drop_table("source_records")
    op.drop_index("uq_import_batches_org_system_hash_active", table_name="import_batches")
    op.drop_index(op.f("ix_import_batches_file_hash"), table_name="import_batches")
    op.drop_index(op.f("ix_import_batches_status"), table_name="import_batches")
    op.drop_index(op.f("ix_import_batches_source_system_id"), table_name="import_batches")
    op.drop_index(op.f("ix_import_batches_organization_id"), table_name="import_batches")
    op.drop_table("import_batches")
    op.drop_index(op.f("ix_source_systems_organization_id"), table_name="source_systems")
    op.drop_table("source_systems")
