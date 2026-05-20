import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_admin_list_spus(client):
    response = await client.get("/v1/admin/goods/spus")
    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_admin_create_spu_unauthorized(client):
    data = {
        "category_id": 1,
        "brand": "Test Brand",
        "name": "Test Product",
        "model": "Test Model",
        "pet_type": "cat",
    }
    response = await client.post("/v1/admin/goods/spus", json=data)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_get_spu_not_found(client):
    response = await client.get("/v1/admin/goods/spus/99999")
    assert response.status_code in [401, 404]
