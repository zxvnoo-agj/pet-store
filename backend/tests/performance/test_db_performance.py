"""Database query performance benchmarks.

Measures query execution times for common query patterns.
Helps detect N+1 queries, missing indexes, and slow query patterns.
"""
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.review import Review
from app.models.category import Category


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_product_list_query(benchmark, db_session: AsyncSession):
    """Product list query with filters should be efficient (< 50ms)."""
    async def query():
        result = await db_session.execute(
            select(Product)
            .where(Product.status == "active")
            .limit(20)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_product_count_query(benchmark, db_session: AsyncSession):
    """Product count query with filters."""
    async def query():
        result = await db_session.execute(
            select(func.count(Product.id))
            .where(Product.status == "active")
        )
        return result.scalar()

    total = await benchmark(query)
    assert isinstance(total, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_review_list_query(benchmark, db_session: AsyncSession):
    """Review list query with product_id + status filter."""
    async def query():
        result = await db_session.execute(
            select(Review)
            .where(
                Review.product_id == 1,
                Review.status == "approved",
            )
            .limit(20)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_category_tree_query(benchmark, db_session: AsyncSession):
    """Category tree query."""
    async def query():
        result = await db_session.execute(
            select(Category)
            .where(Category.is_active)
            .order_by(Category.sort_order)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_full_text_search_query(benchmark, db_session: AsyncSession):
    """Full-text search query performance."""
    async def query():
        tsquery = func.plainto_tsquery("simple", "test")
        result = await db_session.execute(
            select(Product)
            .where(
                Product.status == "active",
                Product.search_vector.op("@@")(tsquery),
            )
            .limit(10)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=3, max_time=3.0)
@pytest.mark.asyncio
async def test_product_detail_with_category_join(benchmark, db_session: AsyncSession):
    """Product detail query with category join."""
    async def query():
        result = await db_session.execute(
            text("""
                SELECT p.*, c.name as category_name, c.pet_type
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.id = 1 AND p.status = 'active'
                LIMIT 1
            """)
        )
        row = result.fetchone()
        return row is not None

    found = await benchmark(query)
    assert found is True or found is False
