import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_promotion_url_service_import():
    from app.services.promotion_url_service import PromotionUrlService
    assert PromotionUrlService


@pytest.mark.asyncio
async def test_promotion_url_service_init():
    from app.services.promotion_url_service import PromotionUrlService
    mock_db = AsyncMock()
    service = PromotionUrlService(mock_db)
    assert service.pg_cache_ttl.total_seconds() == 12 * 3600
    assert service.redis_cache_ttl == 3600


@pytest.mark.asyncio
async def test_pdd_client_has_generate_method():
    from app.services.pdd_client import PDDClient
    client = PDDClient()
    assert hasattr(client, "generate_promotion_url")
    assert callable(client.generate_promotion_url)
    await client.close()


@pytest.mark.asyncio
async def test_promotion_url_redis_cache_hit():
    """T049: Test Redis cache hit returns cached data without calling PDD API."""
    from app.services.promotion_url_service import PromotionUrlService
    mock_db = AsyncMock()
    service = PromotionUrlService(mock_db)
    
    cached_data = {
        "short_url": "https://pdd.test/short",
        "mobile_url": "https://pdd.test/mobile",
        "we_app_url": "https://pdd.test/weapp",
    }
    
    with patch("app.services.promotion_url_service.cache.get", return_value=cached_data):
        result = await service._get_from_redis("test_sign", "test_pid")
        assert result is not None
        assert result["short_url"] == "https://pdd.test/short"
        assert result["cached"] is True
        assert result["cache_layer"] == "redis"


@pytest.mark.asyncio
async def test_promotion_url_postgresql_fallback():
    """T075: Test fallback to PostgreSQL when Redis is unavailable."""
    from app.services.promotion_url_service import PromotionUrlService
    from app.models.collection import PromotionUrlCache
    
    mock_db = AsyncMock()
    service = PromotionUrlService(mock_db)
    
    # Mock Redis failure
    with patch("app.services.promotion_url_service.cache.get", side_effect=Exception("Redis down")):
        # Mock PostgreSQL cache hit
        mock_cache = MagicMock()
        mock_cache.short_url = "https://pdd.test/pg"
        mock_cache.mobile_url = "https://pdd.test/pg_mobile"
        mock_cache.we_app_url = "https://pdd.test/pg_weapp"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_cache
        mock_db.execute.return_value = mock_result
        
        result = await service.generate("test_sign", 1, "test_pid")
        assert result["short_url"] == "https://pdd.test/pg"
        assert result["cache_layer"] == "postgresql"


@pytest.mark.asyncio
async def test_promotion_url_invalid_goods_sign():
    """T077: Test error handling for invalid goods_sign or delisted products."""
    from app.services.promotion_url_service import PromotionUrlService
    
    mock_db = AsyncMock()
    service = PromotionUrlService(mock_db)
    
    # Mock empty caches
    with patch("app.services.promotion_url_service.cache.get", return_value=None):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Mock PDD API error for invalid goods_sign
        with patch.object(service.pdd, "generate_promotion_url", side_effect=Exception("goods_sign invalid")):
            with pytest.raises(Exception) as exc_info:
                await service.generate("invalid_sign", 1, "test_pid")
            assert "暂不可用" in str(exc_info.value)


@pytest.mark.asyncio
async def test_promotion_url_rate_limit():
    """T076: Test PDD API rate limiting handling."""
    from app.services.promotion_url_service import PromotionUrlService
    
    mock_db = AsyncMock()
    service = PromotionUrlService(mock_db)
    
    # Mock empty caches
    with patch("app.services.promotion_url_service.cache.get", return_value=None):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Mock PDD API rate limit
        with patch.object(service.pdd, "generate_promotion_url", side_effect=Exception("rate limit exceeded")):
            with pytest.raises(Exception) as exc_info:
                await service.generate("test_sign", 1, "test_pid")
            assert "繁忙" in str(exc_info.value)


@pytest.mark.asyncio
async def test_promotion_url_backfill_redis_from_postgresql():
    """Test that PostgreSQL cache hit backfills Redis."""
    from app.services.promotion_url_service import PromotionUrlService
    from app.models.collection import PromotionUrlCache
    
    mock_db = AsyncMock()
    service = PromotionUrlService(mock_db)
    
    # Mock empty Redis
    with patch("app.services.promotion_url_service.cache.get", return_value=None):
        # Mock PostgreSQL hit
        mock_cache = MagicMock()
        mock_cache.short_url = "https://pdd.test/pg"
        mock_cache.mobile_url = "https://pdd.test/pg_mobile"
        mock_cache.we_app_url = "https://pdd.test/pg_weapp"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_cache
        mock_db.execute.return_value = mock_result
        
        # Mock saving to Redis
        with patch("app.services.promotion_url_service.cache.set") as mock_redis_set:
            result = await service.generate("test_sign", 1, "test_pid")
            assert result["cache_layer"] == "postgresql"
            # Verify Redis backfill was called
            mock_redis_set.assert_called_once()
