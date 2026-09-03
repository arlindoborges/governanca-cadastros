"""Permitir importação XLSX em vez de CSV.

Revision ID: 0005_import_xlsx
Revises: 0004_matching
Create Date: 2026-09-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_import_xlsx"
down_revision: Union[str, Sequence[str], None] = "0004_matching"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE import_batches SET file_type = 'xlsx' WHERE file_type = 'csv'")
    op.drop_constraint("ck_import_batches_file_type", "import_batches", type_="check")
    op.create_check_constraint(
        "ck_import_batches_file_type",
        "import_batches",
        "file_type IN ('xlsx')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_import_batches_file_type", "import_batches", type_="check")
    op.create_check_constraint(
        "ck_import_batches_file_type",
        "import_batches",
        "file_type IN ('csv')",
    )
