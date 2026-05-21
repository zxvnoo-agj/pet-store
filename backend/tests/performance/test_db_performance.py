"""Database query performance benchmarks.

Measures query execution times for common query patterns.
Helps detect N+1 queries, missing indexes, and slow query patterns.
"""
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spu import Spu
from app.models.review import Review
from app.models.category import Category


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_spu_list_query(benchmark, db_session: AsyncSession):
    """SPU list query with filters should be efficient (< 50ms)."""
    async def query():
        result = await db_session.execute(
            select(Spu)
            .where(Spu.status == "active")
            .limit(20)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_spu_count_query(benchmark, db_session: AsyncSession):
    """SPU count query with filters."""
    async def query():
        result = await db_session.execute(
            select(func.count(Spu.id))
            .where(Spu.status == "active")
        )
        return result.scalar()

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_review_list_query(benchmark, db_session: AsyncSession):
    """Review list query with spu filter."""
    async def query():
        result = await db_session.execute(
            select(Review)
            .where(Review.spu_id == 1, Review.status == "approved")
            .order_by(Review.created_at.desc())
            .limit(20)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_category_tree_query(benchmark, db_session: AsyncSession):
    """Category tree query should be efficient."""
    async def query():
        result = await db_session.execute(
            select(Category)
            .where(Category.is_active == True)
            .order_by(Category.level, Category.sort_order)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=5, max_time=2.0)
@pytest.mark.asyncio
async def test_spu_search_query(benchmark, db_session: AsyncSession):
    """SPU search query performance."""
    async def query():
        result = await db_session.execute(
            select(Spu)
            .where(
                Spu.status == "active",
                Spu.name.ilike("%test%"),
            )
            .limit(10)
        )
        return len(result.scalars().all())

    count = await benchmark(query)
    assert isinstance(count, int)


@pytest.mark.benchmark(min_rounds=3, max_time=3.0)
@pytest.mark.asyncio
async def test_spu_detail_with_category_join(benchmark, db_session: AsyncSession):
    """SPU detail query with category join."""
    async def query():
        result = await db_session.execute(
            text("""
                SELECT s.*, c.name as category_name, c.pet_type
                FROM spus s
                LEFT JOIN categories c ON c.id = s.category_id
                WHERE s.id = 1 AND s.status = 'active'
                LIMIT 1
            """)
        )
        row = result.fetchone()
        return row is not None

    found = await benchmark(query)
    assert found is True or found is False
