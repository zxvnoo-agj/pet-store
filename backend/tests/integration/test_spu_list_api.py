import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_admin_list_spus_with_filters(client):
    response = await client.get("/v1/admin/goods/spus?brand=Royal%20Canin&pet_type=cat")
    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_admin_list_spus_with_search(client):
    response = await client.get("/v1/admin/goods/spus?search=cat%20food")
    assert response.status_code in [200, 401]


@pytest.mark.asyncio
async def test_admin_get_spu_listings_unauthorized(client):
    response = await client.get("/v1/admin/goods/spus/1/listings")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_link_listing_unauthorized(client):
    response = await client.post("/v1/admin/goods/listings/1/link", json={"spu_id": 1})
    assert response.status_code == 401
