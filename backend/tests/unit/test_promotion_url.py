import pytest


@pytest.mark.asyncio
async def test_promotion_url_service_import():
    from app.services.promotion_url_service import PromotionUrlService
    assert PromotionUrlService


@pytest.mark.asyncio
async def test_promotion_url_service_init():
    from unittest.mock import AsyncMock
    from app.services.promotion_url_service import PromotionUrlService
    mock_db = AsyncMock()
    service = PromotionUrlService(mock_db)
    assert service.cache_ttl.total_seconds() == 12 * 3600


@pytest.mark.asyncio
async def test_pdd_client_has_generate_method():
    from app.services.pdd_client import PDDClient
    client = PDDClient()
    assert hasattr(client, "generate_promotion_url")
    assert callable(client.generate_promotion_url)
    await client.close()
