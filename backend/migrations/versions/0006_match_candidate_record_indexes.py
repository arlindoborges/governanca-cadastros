"""Índices de FK em match_candidates para exclusão de lote.

Revision ID: 0006_match_cand_idx
Revises: 0005_import_xlsx
Create Date: 2026-09-02
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0006_match_cand_idx"
down_revision: Union[str, Sequence[str], None] = "0005_import_xlsx"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        op.f("ix_match_candidates_source_record_id"),
        "match_candidates",
        ["source_record_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_match_candidates_candidate_source_record_id"),
        "match_candidates",
        ["candidate_source_record_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_match_candidates_candidate_source_record_id"),
        table_name="match_candidates",
    )
    op.drop_index(
        op.f("ix_match_candidates_source_record_id"),
        table_name="match_candidates",
    )
