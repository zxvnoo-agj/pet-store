"""Add crawled_products table

Revision ID: i1a2b3c4d5e6
Revises: h1a2b3c4d5e6
Create Date: 2026-05-17

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "i1a2b3c4d5e6"
down_revision = "h1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "crawled_products",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("goods_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(512), nullable=True),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("raw_html", sa.Text(), nullable=True),
        sa.Column("images", postgresql.JSONB(), server_default="[]", nullable=True),
        sa.Column("crawl_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("file_source", sa.String(512), nullable=True),
        sa.Column("import_status", sa.String(16), server_default="active", nullable=True),
        sa.Column("import_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("goods_id", name="uq_crawled_products_goods_id"),
    )
    op.create_index("ix_crawled_products_import_status", "crawled_products", ["import_status"])
    op.create_index("ix_crawled_products_created_at", "crawled_products", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_crawled_products_created_at", table_name="crawled_products")
    op.drop_index("ix_crawled_products_import_status", table_name="crawled_products")
    op.drop_table("crawled_products")
