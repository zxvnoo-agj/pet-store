"""Add data collection tables

Revision ID: c5e1f3a7b9d2
Revises: b4d8e2f6a0c3
Create Date: 2026-05-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'c5e1f3a7b9d2'
down_revision = 'b4d8e2f6a0c3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # data_sources (model exists but no migration)
    op.create_table('data_sources',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('platform', sa.String(length=32), nullable=False),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sync_interval_minutes', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_data_sources_id'), 'data_sources', ['id'], unique=False)

    # data_fetch_jobs (model exists but no migration)
    op.create_table('data_fetch_jobs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('data_source_id', sa.Integer(), nullable=False),
        sa.Column('job_type', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=True),
        sa.Column('params', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('result', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['data_source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_data_fetch_jobs_id'), 'data_fetch_jobs', ['id'], unique=False)

    # search_strategies
    op.create_table('search_strategies',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('data_source_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('keywords', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('opt_id', sa.Integer(), nullable=True),
        sa.Column('price_min', sa.Integer(), nullable=True),
        sa.Column('price_max', sa.Integer(), nullable=True),
        sa.Column('sort_type', sa.Integer(), nullable=True),
        sa.Column('max_items', sa.Integer(), nullable=True),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_result', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['data_source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_search_strategies_ds', 'search_strategies', ['data_source_id'], unique=False)

    # external_products
    op.create_table('external_products',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(length=32), nullable=False),
        sa.Column('external_id', sa.String(length=64), nullable=False),
        sa.Column('external_url', sa.String(length=512), nullable=True),
        sa.Column('pid', sa.String(length=64), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_id', 'platform', 'external_id', name='uq_external_product')
    )
    op.create_index('ix_external_products_external_id', 'external_products', ['platform', 'external_id'], unique=False)

    # price_history
    op.create_table('price_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('group_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('single_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('coupon_discount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_price_history_product', 'price_history', ['product_id', sa.text('recorded_at DESC')], unique=False)

    # Seed data_sources with PDD and XHS entries
    from sqlalchemy.sql import text
    op.execute(text("""
        INSERT INTO data_sources (name, platform, config, is_active, sync_interval_minutes)
        VALUES
        ('拼多多多多进宝', 'pdd', '{}', true, 60),
        ('小红书', 'xiaohongshu', '{}', true, 1440)
        ON CONFLICT DO NOTHING
    """))

    # reviews: add XHS columns
    op.add_column('reviews', sa.Column('external_note_id', sa.String(length=64), nullable=True))
    op.add_column('reviews', sa.Column('author', sa.String(length=64), nullable=True))
    op.add_column('reviews', sa.Column('note_published_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('reviews', sa.Column('note_likes', sa.Integer(), nullable=True))
    op.create_index('ix_reviews_external_note_id', 'reviews', ['external_note_id'], unique=False)


def downgrade() -> None:
    # Remove added columns from reviews
    op.drop_index('ix_reviews_external_note_id', table_name='reviews')
    op.drop_column('reviews', 'note_likes')
    op.drop_column('reviews', 'note_published_at')
    op.drop_column('reviews', 'author')
    op.drop_column('reviews', 'external_note_id')

    # Drop new tables in reverse order
    op.drop_index('ix_price_history_product', table_name='price_history')
    op.drop_table('price_history')
    op.drop_index('ix_external_products_external_id', table_name='external_products')
    op.drop_table('external_products')
    op.drop_index('ix_search_strategies_ds', table_name='search_strategies')
    op.drop_table('search_strategies')
    op.drop_index(op.f('ix_data_fetch_jobs_id'), table_name='data_fetch_jobs')
    op.drop_table('data_fetch_jobs')
    op.drop_index(op.f('ix_data_sources_id'), table_name='data_sources')
    op.drop_table('data_sources')
