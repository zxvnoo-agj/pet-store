"""Extend external_products.external_url length to 2048

Revision ID: g1a2b3c4d5e6
Revises: f2a3b4c5d6e7
Create Date: 2026-05-15

"""
from alembic import op
import sqlalchemy as sa


revision = 'g1a2b3c4d5e6'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('external_products', 'external_url',
                    existing_type=sa.String(512),
                    type_=sa.String(2048),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('external_products', 'external_url',
                    existing_type=sa.String(2048),
                    type_=sa.String(512),
                    existing_nullable=True)
