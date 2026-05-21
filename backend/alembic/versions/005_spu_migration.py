"""005 SPU migration: drop products, alter favorites/reviews/chat_messages

Revision ID: 005_spu_migration
Revises: 004_refract_goods_spu, i1a2b3c4d5e6
Create Date: 2026-05-21

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '005_spu_migration'
down_revision = ('004_refract_goods_spu', 'i1a2b3c4d5e6')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Alter favorites table: product_id -> spu_id
    op.drop_constraint('favorites_product_id_fkey', 'favorites', type_='foreignkey')
    op.drop_constraint('uq_user_product_favorite', 'favorites', type_='unique')
    op.drop_index('ix_favorites_product_id', table_name='favorites')
    
    op.alter_column('favorites', 'product_id', new_column_name='spu_id')
    
    op.create_foreign_key('favorites_spu_id_fkey', 'favorites', 'spus', ['spu_id'], ['id'], ondelete='CASCADE')
    op.create_unique_constraint('uq_user_spu_favorite', 'favorites', ['user_id', 'spu_id'])
    op.create_index('ix_favorites_spu_id', 'favorites', ['spu_id'], unique=False)

    # 2. Alter reviews table: product_id -> spu_id
    op.drop_constraint('reviews_product_id_fkey', 'reviews', type_='foreignkey')
    op.drop_index('ix_reviews_product_id', table_name='reviews')
    op.drop_index('ix_reviews_product_id_status', table_name='reviews')
    
    op.alter_column('reviews', 'product_id', new_column_name='spu_id')
    
    op.create_foreign_key('reviews_spu_id_fkey', 'reviews', 'spus', ['spu_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_reviews_spu_id', 'reviews', ['spu_id'], unique=False)
    op.create_index('ix_reviews_spu_id_status', 'reviews', ['spu_id', 'status'], unique=False)

    # 3. Alter chat_messages table: referenced_products -> referenced_spus
    op.alter_column('chat_messages', 'referenced_products', new_column_name='referenced_spus')

    # 4. Drop remaining FKs to products from other tables
    op.drop_constraint('external_products_product_id_fkey', 'external_products', type_='foreignkey')
    op.drop_constraint('price_history_product_id_fkey', 'price_history', type_='foreignkey')

    # 5. Drop products table
    op.drop_table('products')


def downgrade() -> None:
    # Cannot restore products table (data loss)
    # Reverse column renames only
    
    # 3. Reverse chat_messages
    op.alter_column('chat_messages', 'referenced_spus', new_column_name='referenced_products')

    # 2. Reverse reviews
    op.drop_index('ix_reviews_spu_id_status', table_name='reviews')
    op.drop_index('ix_reviews_spu_id', table_name='reviews')
    op.drop_constraint('reviews_spu_id_fkey', 'reviews', type_='foreignkey')
    op.alter_column('reviews', 'spu_id', new_column_name='product_id')
    op.create_foreign_key('reviews_product_id_fkey', 'reviews', 'products', ['product_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_reviews_product_id', 'reviews', ['product_id'], unique=False)
    op.create_index('ix_reviews_product_id_status', 'reviews', ['product_id', 'status'], unique=False)

    # 1. Reverse favorites
    op.drop_index('ix_favorites_spu_id', table_name='favorites')
    op.drop_constraint('uq_user_spu_favorite', 'favorites', type_='unique')
    op.drop_constraint('favorites_spu_id_fkey', 'favorites', type_='foreignkey')
    op.alter_column('favorites', 'spu_id', new_column_name='product_id')
    op.create_foreign_key('favorites_product_id_fkey', 'favorites', 'products', ['product_id'], ['id'], ondelete='CASCADE')
    op.create_unique_constraint('uq_user_product_favorite', 'favorites', ['user_id', 'product_id'])
    op.create_index('ix_favorites_product_id', 'favorites', ['product_id'], unique=False)

    # Recreate dropped FKs for other tables (tables need to exist)
    op.create_foreign_key('external_products_product_id_fkey', 'external_products', 'products', ['product_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('price_history_product_id_fkey', 'price_history', 'products', ['product_id'], ['id'], ondelete='CASCADE')
