"""Add listing maintenance fields

Revision ID: j1a2b3c4d5e6
Revises: g1a2b3c4d5e6
Create Date: 2026-06-21

"""
from alembic import op
import sqlalchemy as sa


revision = 'j1a2b3c4d5e6'
down_revision = 'g1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('spu_listings', sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('spu_listings', sa.Column('last_sync_error', sa.Text(), nullable=True))
    op.alter_column('spu_listings', 'is_primary', server_default=None)


def downgrade() -> None:
    op.drop_column('spu_listings', 'last_sync_error')
    op.drop_column('spu_listings', 'is_primary')
