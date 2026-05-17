"""Add collection_type, product_id, cursor_value to data_fetch_jobs

Revision ID: d9a8f0e2b7c1
Revises: c5e1f3a7b9d2
Create Date: 2026-05-14

"""
from alembic import op
import sqlalchemy as sa


revision = 'd9a8f0e2b7c1'
down_revision = 'c5e1f3a7b9d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('data_fetch_jobs', sa.Column('collection_type', sa.String(length=16), nullable=True, server_default='full'))
    op.add_column('data_fetch_jobs', sa.Column('product_id', sa.Integer(), nullable=True))
    op.add_column('data_fetch_jobs', sa.Column('cursor_value', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('data_fetch_jobs', 'cursor_value')
    op.drop_column('data_fetch_jobs', 'product_id')
    op.drop_column('data_fetch_jobs', 'collection_type')
