import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


class TestImportAndMatching:
    @pytest.mark.asyncio
    async def test_import_listings_unauthorized(self, client):
        response = await client.post("/v1/admin/goods/listings/import", json={
            "keyword": "cat food",
            "max_results": 10,
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_import_listings_no_keyword(self, client):
        response = await client.post("/v1/admin/goods/listings/import", json={
            "max_results": 10,
        })
        # Should fail validation (no auth but also no keyword)
        assert response.status_code in [400, 401]


class TestMatchingQueue:
    @pytest.mark.asyncio
    async def test_get_matching_queue(self, client):
        response = await client.get("/v1/admin/goods/matching-queue")
        assert response.status_code in [200, 401]

    @pytest.mark.asyncio
    async def test_get_matching_queue_with_tier(self, client):
        response = await client.get("/v1/admin/goods/matching-queue?tier=all")
        assert response.status_code in [200, 401]

    @pytest.mark.asyncio
    async def test_confirm_candidates_unauthorized(self, client):
        response = await client.post("/v1/admin/goods/matching-queue/confirm", json={
            "listing_ids": [1, 2, 3],
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_reject_candidates_unauthorized(self, client):
        response = await client.post("/v1/admin/goods/matching-queue/reject", json={
            "listing_ids": [1, 2, 3],
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_confirm_candidates_no_ids(self, client):
        response = await client.post("/v1/admin/goods/matching-queue/confirm", json={
            "listing_ids": [],
        })
        assert response.status_code in [400, 401]


class TestJobStatus:
    @pytest.mark.asyncio
    async def test_get_job_status_not_found(self, client):
        response = await client.get("/v1/admin/goods/jobs/nonexistent_job")
        assert response.status_code in [404, 401]

    @pytest.mark.asyncio
    async def test_get_job_status_unauthorized(self, client):
        response = await client.get("/v1/admin/goods/jobs/job_12345")
        assert response.status_code == 401
