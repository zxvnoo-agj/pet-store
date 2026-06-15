"""Formalize in-app reviews

Revision ID: 010_in_app_reviews
Revises: 009_make_spu_id_nullable
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa

revision = "010_in_app_reviews"
down_revision = "009_make_spu_id_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("reject_reason", sa.Text(), nullable=True))
    op.execute("UPDATE reviews SET source = 'xhs_auto' WHERE source = 'crawled'")

    op.create_check_constraint(
        "ck_reviews_source",
        "reviews",
        "source IN ('user', 'xhs_manual', 'xhs_auto', 'admin_seed')",
    )
    op.create_check_constraint(
        "ck_reviews_status",
        "reviews",
        "status IN ('pending', 'approved', 'rejected')",
    )
    op.create_check_constraint(
        "ck_reviews_rating_range",
        "reviews",
        "rating >= 1 AND rating <= 5",
    )
    op.create_index(
        "uq_reviews_user_spu",
        "reviews",
        ["spu_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("source = 'user' AND user_id IS NOT NULL"),
    )
    op.create_index(
        "ix_reviews_spu_status_created",
        "reviews",
        ["spu_id", "status", sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_reviews_source_status",
        "reviews",
        ["source", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_reviews_source_status", table_name="reviews")
    op.drop_index("ix_reviews_spu_status_created", table_name="reviews")
    op.drop_index("uq_reviews_user_spu", table_name="reviews")
    op.drop_constraint("ck_reviews_rating_range", "reviews", type_="check")
    op.drop_constraint("ck_reviews_status", "reviews", type_="check")
    op.drop_constraint("ck_reviews_source", "reviews", type_="check")
    op.execute("UPDATE reviews SET source = 'crawled' WHERE source = 'xhs_auto'")
    op.drop_column("reviews", "reject_reason")
