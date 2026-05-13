"""Add full-text search to products

Revision ID: a3b7c1d9e5f2
Revises: 7a2f3e8b9c4d
Create Date: 2026-05-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a3b7c1d9e5f2'
down_revision = '7a2f3e8b9c4d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add search_vector column for full-text search
    op.add_column('products', sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True))
    
    # Create GIN index for fast full-text search
    op.create_index('ix_products_search_vector', 'products', ['search_vector'], 
                    postgresql_using='gin')
    
    # Create function to automatically update search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION products_search_vector_update()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := 
                setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.brand, '')), 'B') ||
                setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Create trigger to auto-update search_vector on insert/update
    op.execute("""
        CREATE TRIGGER products_search_vector_trigger
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION products_search_vector_update();
    """)
    
    # Update existing rows
    op.execute("""
        UPDATE products SET search_vector = 
            setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(brand, '')), 'B') ||
            setweight(to_tsvector('simple', COALESCE(description, '')), 'C');
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS products_search_vector_trigger ON products")
    op.execute("DROP FUNCTION IF EXISTS products_search_vector_update()")
    op.drop_index('ix_products_search_vector', table_name='products')
    op.drop_column('products', 'search_vector')
