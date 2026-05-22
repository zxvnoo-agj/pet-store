"""006_add_listing_detail_fields

Revision ID: b11cc8dbc49a
Revises: 796d5c4567b1
Create Date: 2026-05-22 17:35:00.976478

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b11cc8dbc49a'
down_revision = '796d5c4567b1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add goods_sign, sku_specs, service_tags to spu_listings
    op.add_column('spu_listings', sa.Column('goods_sign', sa.String(128), nullable=True))
    op.add_column('spu_listings', sa.Column('sku_specs', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('spu_listings', sa.Column('service_tags', sa.dialects.postgresql.JSONB(), nullable=True))
    
    # Create index on goods_sign for promotion URL lookups
    op.create_index('ix_spu_listings_goods_sign', 'spu_listings', ['goods_sign'])


def downgrade() -> None:
    op.drop_index('ix_spu_listings_goods_sign', table_name='spu_listings')
    op.drop_column('spu_listings', 'service_tags')
    op.drop_column('spu_listings', 'sku_specs')
    op.drop_column('spu_listings', 'goods_sign')
