"""product mapping conversion factor

Revision ID: 0003_mapping_conversion_factor
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_mapping_conversion_factor"
down_revision: Union[str, Sequence[str], None] = "0002_sanitization_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "product_mappings",
        sa.Column("conversion_factor", sa.Numeric(18, 6), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("product_mappings", "conversion_factor")
