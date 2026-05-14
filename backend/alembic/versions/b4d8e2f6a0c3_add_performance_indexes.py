"""Add performance indexes for common queries

Revision ID: b4d8e2f6a0c3
Revises: a3b7c1d9e5f2
Create Date: 2026-05-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b4d8e2f6a0c3'
down_revision = 'a3b7c1d9e5f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Products: status index for active product queries (used in all product listing)
    op.create_index('ix_products_status', 'products', ['status'], unique=False)

    # Products: composite index for filtered product lists (status + category_id)
    op.create_index('ix_products_status_category_id', 'products', ['status', 'category_id'], unique=False)

    # Products: created_at index for sorting by newest
    op.create_index('ix_products_created_at', 'products', ['created_at'], unique=False)

    # Reviews: composite index for review listing queries (product_id + status)
    op.create_index('ix_reviews_product_id_status', 'reviews', ['product_id', 'status'], unique=False)

    # Chat messages: created_at index for session message ordering
    op.create_index('ix_chat_messages_created_at', 'chat_messages', ['created_at'], unique=False)

    # Favorites: product_id index for inverse lookup
    op.create_index('ix_favorites_product_id', 'favorites', ['product_id'], unique=False)

    # Users: pet_types GIN index for pet-type filtering queries
    op.create_index('ix_users_pet_types', 'users', ['pet_types'], postgresql_using='gin')


def downgrade() -> None:
    op.drop_index('ix_users_pet_types', table_name='users')
    op.drop_index('ix_favorites_product_id', table_name='favorites')
    op.drop_index('ix_chat_messages_created_at', table_name='chat_messages')
    op.drop_index('ix_reviews_product_id_status', table_name='reviews')
    op.drop_index('ix_products_created_at', table_name='products')
    op.drop_index('ix_products_status_category_id', table_name='products')
    op.drop_index('ix_products_status', table_name='products')
