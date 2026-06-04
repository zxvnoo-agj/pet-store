"""Add ai_review_summary to spus table

Revision ID: 008_xhs_review_summary
Revises: 007_pet_profiles
Create Date: 2026-06-02

"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = '008_xhs_review_summary'
down_revision = '007_pet_profiles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('spus', sa.Column(
        'ai_review_summary',
        postgresql.JSONB,
        nullable=True,
        server_default=None
    ))


def downgrade() -> None:
    op.drop_column('spus', 'ai_review_summary')
