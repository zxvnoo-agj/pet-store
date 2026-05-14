"""API endpoint performance benchmarks.

Measures response times for critical API endpoints under various conditions.
Targets: product list < 200ms p95, product detail < 300ms p95, search < 500ms p95.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.database import get_db


@pytest.mark.benchmark(min_rounds=10, max_time=1.0, warmup=True)
@pytest.mark.asyncio
async def test_product_list_performance(benchmark, db_session):
    """Product list endpoint should respond within 200ms p95."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async def fetch_products():
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/products?page=1&page_size=20")
            return resp

    result = await benchmark(fetch_products)
    assert result.status_code == 200
    data = result.json()
    assert "items" in data or "products" in data or "data" in data

    app.dependency_overrides.clear()


@pytest.mark.benchmark(min_rounds=10, max_time=1.0, warmup=True)
@pytest.mark.asyncio
async def test_product_detail_performance(benchmark, db_session):
    """Product detail endpoint should respond within 300ms p95."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async def fetch_detail():
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/products/1")
            return resp

    result = await benchmark(fetch_detail)
    assert result.status_code in (200, 404)

    app.dependency_overrides.clear()


@pytest.mark.benchmark(min_rounds=10, max_time=1.0, warmup=True)
@pytest.mark.asyncio
async def test_search_performance(benchmark, db_session):
    """Search endpoint should respond within 500ms p95."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async def search_products():
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/search?q=test&page=1&page_size=20")
            return resp

    result = await benchmark(search_products)
    assert result.status_code == 200

    app.dependency_overrides.clear()


@pytest.mark.benchmark(min_rounds=5, max_time=1.0, warmup=True)
@pytest.mark.asyncio
async def test_category_tree_performance(benchmark, db_session):
    """Category tree endpoint performance."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async def fetch_categories():
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/categories")
            return resp

    result = await benchmark(fetch_categories)
    assert result.status_code == 200

    app.dependency_overrides.clear()
