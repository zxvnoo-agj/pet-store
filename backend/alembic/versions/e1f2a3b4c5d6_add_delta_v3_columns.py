"""Add delta v3 columns for Playwright + Vision LLM + Promotion URL

Revision ID: e1f2a3b4c5d6
Revises: d9a8f0e2b7c1
Create Date: 2026-05-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import text

revision = 'e1f2a3b4c5d6'
down_revision = 'd9a8f0e2b7c1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tier 1: Top-level columns on products
    op.add_column('products', sa.Column('goods_name', sa.String(length=255), nullable=True))
    op.add_column('products', sa.Column('spec_form', sa.String(length=16), nullable=True))
    op.add_column('products', sa.Column('age_range', sa.String(length=32), nullable=True))
    op.add_column('products', sa.Column('mall_name', sa.String(length=128), nullable=True))
    op.add_column('products', sa.Column('pet_type', sa.String(length=16), nullable=False, server_default='cat'))
    op.add_column('products', sa.Column('promotion_rate', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('products', sa.Column('min_group_price', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('products', sa.Column('min_normal_price', sa.Integer(), nullable=True, server_default='0'))

    # Tier 2: JSONB columns
    op.add_column('products', sa.Column('gallery_urls', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'))
    op.add_column('products', sa.Column('detail_img_urls', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'))
    op.add_column('products', sa.Column('service_tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'))
    op.add_column('products', sa.Column('nutrition', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'))

    # Indexes
    op.create_index(op.f('ix_products_goods_name'), 'products', ['goods_name'], unique=False)
    op.create_index(op.f('ix_products_spec_form'), 'products', ['spec_form'], unique=False)
    op.create_index(op.f('ix_products_age_range'), 'products', ['age_range'], unique=False)
    op.create_index(op.f('ix_products_mall_name'), 'products', ['mall_name'], unique=False)
    op.create_index(op.f('ix_products_pet_type'), 'products', ['pet_type'], unique=False)

    # Data migration: extract brand/spec_form/age_range from existing specifications JSONB
    conn = op.get_bind()
    for col in ('brand', 'spec_form', 'age_range'):
        conn.execute(
            text(f"UPDATE products SET {col} = specifications->>'{col}' WHERE specifications->>'{col}' IS NOT NULL")
        )

    # Promotion URL cache table
    op.create_table('promotion_url_cache',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('goods_sign', sa.String(length=64), nullable=False),
        sa.Column('pid', sa.String(length=64), nullable=False),
        sa.Column('short_url', sa.String(length=256), nullable=False),
        sa.Column('mobile_url', sa.String(length=512), nullable=True),
        sa.Column('we_app_url', sa.String(length=512), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('goods_sign', 'pid', name='uq_promotion_cache_goods_pid')
    )
    op.create_index(op.f('ix_promotion_url_cache_id'), 'promotion_url_cache', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('promotion_url_cache')
    op.drop_index(op.f('ix_products_pet_type'), table_name='products')
    op.drop_index(op.f('ix_products_mall_name'), table_name='products')
    op.drop_index(op.f('ix_products_age_range'), table_name='products')
    op.drop_index(op.f('ix_products_spec_form'), table_name='products')
    op.drop_index(op.f('ix_products_goods_name'), table_name='products')
    op.drop_column('products', 'nutrition')
    op.drop_column('products', 'service_tags')
    op.drop_column('products', 'detail_img_urls')
    op.drop_column('products', 'gallery_urls')
    op.drop_column('products', 'min_normal_price')
    op.drop_column('products', 'min_group_price')
    op.drop_column('products', 'promotion_rate')
    op.drop_column('products', 'pet_type')
    op.drop_column('products', 'mall_name')
    op.drop_column('products', 'age_range')
    op.drop_column('products', 'spec_form')
    op.drop_column('products', 'goods_name')
