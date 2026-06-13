"""Make spu_listings.spu_id nullable

The code supports storing unmatched listings (spu_id=None) for later re-matching,
but the original migration created spu_id as NOT NULL.

Revision ID: 009_make_spu_id_nullable
Revises: 008_xhs_review_summary
Create Date: 2026-06-06

"""
from alembic import op
import sqlalchemy as sa

revision = '009_make_spu_id_nullable'
down_revision = '008_xhs_review_summary'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('spu_listings', 'spu_id',
                    existing_type=sa.Integer(),
                    nullable=True,
                    existing_foreign_key='spus.id')


def downgrade() -> None:
    # First set any NULL spu_id to a placeholder before making NOT NULL
    op.execute("UPDATE spu_listings SET spu_id = 0 WHERE spu_id IS NULL")
    op.alter_column('spu_listings', 'spu_id',
                    existing_type=sa.Integer(),
                    nullable=False,
                    existing_foreign_key='spus.id')
