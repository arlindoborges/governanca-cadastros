"""product classification hierarchy

Revision ID: 0005_product_classifications
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_product_classifications"
down_revision: Union[str, Sequence[str], None] = "0004_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "product_classification_configs",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("depth_levels", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("organization_id"),
    )
    op.create_table(
        "product_classification_nodes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["product_classification_nodes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_classification_nodes_org", "product_classification_nodes", ["organization_id"])
    op.create_index("ix_product_classification_nodes_parent", "product_classification_nodes", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_product_classification_nodes_parent", table_name="product_classification_nodes")
    op.drop_index("ix_product_classification_nodes_org", table_name="product_classification_nodes")
    op.drop_table("product_classification_nodes")
    op.drop_table("product_classification_configs")
