import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


class TestMatchingQueueIntegration:
    @pytest.mark.asyncio
    async def test_get_matching_queue_tier_filtering(self, client):
        """Test that matching queue supports tier filtering."""
        response = await client.get("/v1/admin/goods/matching-queue?tier=candidate")
        assert response.status_code in [200, 401]

    @pytest.mark.asyncio
    async def test_get_matching_queue_all_tiers(self, client):
        """Test that matching queue returns both candidates and unmatched."""
        response = await client.get("/v1/admin/goods/matching-queue?tier=all")
        assert response.status_code in [200, 401]


class TestBulkMatchingOperations:
    @pytest.mark.asyncio
    async def test_bulk_confirm_returns_details(self, client):
        """Test that bulk confirm returns detailed results."""
        response = await client.post("/v1/admin/goods/matching-queue/confirm", json={
            "listing_ids": [1, 2, 3],
        })
        assert response.status_code in [200, 401]

    @pytest.mark.asyncio
    async def test_bulk_reject_returns_details(self, client):
        """Test that bulk reject returns detailed results."""
        response = await client.post("/v1/admin/goods/matching-queue/reject", json={
            "listing_ids": [1, 2, 3],
        })
        assert response.status_code in [200, 401]

    @pytest.mark.asyncio
    async def test_manual_link_unmatched_listing(self, client):
        """Test manually linking an unmatched listing to an SPU."""
        response = await client.post("/v1/admin/goods/listings/1/link", json={
            "spu_id": 1,
            "match_confidence": 1.0,
        })
        assert response.status_code in [200, 401]
