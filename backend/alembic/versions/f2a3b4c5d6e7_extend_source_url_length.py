"""Extend source_url length to 2048

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-05-15

"""
from alembic import op
import sqlalchemy as sa


revision = 'f2a3b4c5d6e7'
down_revision = 'e1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('products', 'source_url',
                    existing_type=sa.String(256),
                    type_=sa.String(2048),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('products', 'source_url',
                    existing_type=sa.String(2048),
                    type_=sa.String(256),
                    existing_nullable=True)
