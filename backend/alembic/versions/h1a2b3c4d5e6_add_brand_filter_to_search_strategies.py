"""Add brand_filter to search_strategies

Revision ID: h1a2b3c4d5e6
Revises: g1a2b3c4d5e6
Create Date: 2026-05-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'h1a2b3c4d5e6'
down_revision = 'g1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('search_strategies', sa.Column('brand_filter', postgresql.JSONB(), nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('search_strategies', 'brand_filter')
