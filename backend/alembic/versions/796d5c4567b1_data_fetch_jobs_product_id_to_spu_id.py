"""data_fetch_jobs product_id to spu_id

Revision ID: 796d5c4567b1
Revises: 005_spu_migration
Create Date: 2026-05-21 22:54:15.944442

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '796d5c4567b1'
down_revision = '005_spu_migration'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # data_fetch_jobs: product_id -> spu_id
    op.add_column('data_fetch_jobs', sa.Column('spu_id', sa.Integer(), nullable=True))
    op.create_foreign_key('data_fetch_jobs_spu_id_fkey', 'data_fetch_jobs', 'spus', ['spu_id'], ['id'])
    op.drop_column('data_fetch_jobs', 'product_id')


def downgrade() -> None:
    op.add_column('data_fetch_jobs', sa.Column('product_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.drop_constraint('data_fetch_jobs_spu_id_fkey', 'data_fetch_jobs', type_='foreignkey')
    op.drop_column('data_fetch_jobs', 'spu_id')
