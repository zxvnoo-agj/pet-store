"""Add SPU tables for goods module refactor

Revision ID: 004_refract_goods_spu
Revises: d9a8f0e2b7c1
Create Date: 2026-05-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004_refract_goods_spu'
down_revision = 'd9a8f0e2b7c1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('spus',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('brand', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('model', sa.String(length=128), nullable=False),
        sa.Column('pet_type', sa.String(length=16), nullable=False, server_default='cat'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ingredients', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
        sa.Column('nutrition', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('pros', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
        sa.Column('cons', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
        sa.Column('extra_attrs', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('price_min', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('price_max', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=8), nullable=True, server_default='CNY'),
        sa.Column('image_urls', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
        sa.Column('status', sa.String(length=16), nullable=True, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('brand', 'category_id', 'name', 'model', name='uq_spus_brand_category_name_model'),
        sa.CheckConstraint("pet_type IN ('cat', 'dog')", name='ck_spus_pet_type')
    )
    op.create_index('ix_spus_brand', 'spus', ['brand'], unique=False)
    op.create_index('ix_spus_category_id', 'spus', ['category_id'], unique=False)
    op.create_index('ix_spus_pet_type', 'spus', ['pet_type'], unique=False)
    op.create_index('ix_spus_status', 'spus', ['status'], unique=False)
    op.create_index('ix_spus_created_at', 'spus', ['created_at'], unique=False)

    op.create_table('spu_listings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('spu_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(length=32), nullable=False),
        sa.Column('shop_name', sa.String(length=128), nullable=False),
        sa.Column('goods_id', sa.String(length=64), nullable=True),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('original_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('url', sa.String(length=2048), nullable=False),
        sa.Column('image_url', sa.String(length=2048), nullable=True),
        sa.Column('sales_count', sa.Integer(), nullable=True),
        sa.Column('match_confidence', sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column('match_status', sa.String(length=16), nullable=True, server_default='linked'),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['spu_id'], ['spus.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('platform', 'goods_id', name='uq_spu_listings_platform_goods_id'),
        sa.CheckConstraint('price >= 0', name='ck_spu_listings_price'),
        sa.CheckConstraint('match_confidence >= 0 AND match_confidence <= 1', name='ck_spu_listings_confidence')
    )
    op.create_index('ix_spu_listings_spu_id', 'spu_listings', ['spu_id'], unique=False)
    op.create_index('ix_spu_listings_platform', 'spu_listings', ['platform'], unique=False)
    op.create_index('ix_spu_listings_goods_id', 'spu_listings', ['goods_id'], unique=False)
    op.create_index('ix_spu_listings_match_status', 'spu_listings', ['match_status'], unique=False)
    op.create_index('ix_spu_listings_created_at', 'spu_listings', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_spu_listings_created_at', table_name='spu_listings')
    op.drop_index('ix_spu_listings_match_status', table_name='spu_listings')
    op.drop_index('ix_spu_listings_goods_id', table_name='spu_listings')
    op.drop_index('ix_spu_listings_platform', table_name='spu_listings')
    op.drop_index('ix_spu_listings_spu_id', table_name='spu_listings')
    op.drop_table('spu_listings')
    op.drop_index('ix_spus_created_at', table_name='spus')
    op.drop_index('ix_spus_status', table_name='spus')
    op.drop_index('ix_spus_pet_type', table_name='spus')
    op.drop_index('ix_spus_category_id', table_name='spus')
    op.drop_index('ix_spus_brand', table_name='spus')
    op.drop_table('spus')
