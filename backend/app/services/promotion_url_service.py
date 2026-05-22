from datetime import UTC, datetime, timedelta
from typing import Optional

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.collection import PromotionUrlCache
from app.services.pdd_client import PDDClient
from app.utils.cache import cache


class PromotionUrlService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pdd = PDDClient()
        self.pg_cache_ttl = timedelta(hours=12)
        self.redis_cache_ttl = 3600  # 1 hour in seconds

    async def close(self):
        await self.pdd.close()

    def _redis_key(self, goods_sign: str, pid: str) -> str:
        return f"promo:{goods_sign}:{pid}"

    async def _get_from_redis(self, goods_sign: str, pid: str) -> dict | None:
        """Try to get promotion URL from Redis cache."""
        try:
            key = self._redis_key(goods_sign, pid)
            cached = await cache.get(key)
            if cached:
                logger.info(f"[promo] Redis cache hit goods_sign={goods_sign}, pid={pid}")
                return {**cached, "cached": True, "cache_layer": "redis"}
        except Exception as e:
            logger.warning(f"[promo] Redis cache error: {e}, falling back to PostgreSQL")
        return None

    async def _get_from_postgresql(self, goods_sign: str, pid: str) -> dict | None:
        """Try to get promotion URL from PostgreSQL cache."""
        cached = await self.db.execute(
            select(PromotionUrlCache).where(
                PromotionUrlCache.goods_sign == goods_sign,
                PromotionUrlCache.pid == pid,
                PromotionUrlCache.expires_at > datetime.now(UTC),
            )
        )
        existing = cached.scalar_one_or_none()
        if existing:
            logger.info(f"[promo] PostgreSQL cache hit goods_sign={goods_sign}, pid={pid}")
            return {
                "short_url": existing.short_url,
                "mobile_url": existing.mobile_url,
                "we_app_url": existing.we_app_url,
                "cached": True,
                "cache_layer": "postgresql",
            }
        return None

    async def _save_to_redis(self, goods_sign: str, pid: str, data: dict) -> None:
        """Save promotion URL to Redis cache."""
        try:
            key = self._redis_key(goods_sign, pid)
            await cache.set(key, {
                "short_url": data["short_url"],
                "mobile_url": data["mobile_url"],
                "we_app_url": data["we_app_url"],
            }, expire=self.redis_cache_ttl)
        except Exception as e:
            logger.warning(f"[promo] Failed to save to Redis: {e}")

    async def _save_to_postgresql(self, goods_sign: str, pid: str, data: dict) -> None:
        """Save promotion URL to PostgreSQL cache."""
        cache_entry = PromotionUrlCache(
            goods_sign=goods_sign,
            pid=pid,
            short_url=data["short_url"],
            mobile_url=data["mobile_url"],
            we_app_url=data["we_app_url"],
            expires_at=datetime.now(UTC) + self.pg_cache_ttl,
        )
        self.db.add(cache_entry)
        await self.db.commit()

    async def generate(self, goods_sign: str, spu_id: int, pid: Optional[str] = None) -> dict:
        """Generate promotion URL with dual caching (Redis + PostgreSQL).
        
        Returns:
            dict with keys: short_url, mobile_url, we_app_url, cached, cache_layer
            or raises Exception if goods_sign is invalid or product delisted.
        """
        pid = pid or self.pdd.pid

        # L1: Check Redis
        redis_result = await self._get_from_redis(goods_sign, pid)
        if redis_result:
            return redis_result

        # L2: Check PostgreSQL
        pg_result = await self._get_from_postgresql(goods_sign, pid)
        if pg_result:
            # Backfill Redis
            await self._save_to_redis(goods_sign, pid, pg_result)
            return pg_result

        # L3: Call PDD API
        try:
            url_data = await self.pdd.generate_promotion_url(goods_sign, pid)
        except Exception as e:
            error_msg = str(e).lower()
            if "goods_sign" in error_msg or "invalid" in error_msg or "delisted" in error_msg:
                logger.warning(f"[promo] Invalid goods_sign or delisted product: goods_sign={goods_sign}, error={e}")
                raise Exception(f"商品暂不可用") from e
            elif "rate limit" in error_msg or "too many requests" in error_msg:
                logger.warning(f"[promo] PDD API rate limited: {e}")
                raise Exception(f"服务繁忙，请稍后重试") from e
            else:
                logger.error(f"[promo] PDD API error: {e}")
                raise

        if not url_data or not url_data.get("short_url"):
            logger.warning(f"[promo] Empty response from PDD API for goods_sign={goods_sign}")
            raise Exception("商品暂不可用")

        result = {
            "short_url": url_data.get("short_url", ""),
            "mobile_url": url_data.get("mobile_url", ""),
            "we_app_url": url_data.get("we_app_url", ""),
            "cached": False,
            "cache_layer": None,
        }

        # Save to both cache layers
        await self._save_to_redis(goods_sign, pid, result)
        await self._save_to_postgresql(goods_sign, pid, result)
        
        logger.info(f"[promo] Generated fresh URL goods_sign={goods_sign}, pid={pid}")
        return result
