from datetime import UTC, datetime, timedelta
from typing import Optional

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.collection import PromotionUrlCache
from app.services.pdd_client import PDDClient


class PromotionUrlService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pdd = PDDClient()
        self.cache_ttl = timedelta(hours=12)

    async def close(self):
        await self.pdd.close()

    async def generate(self, goods_sign: str, product_id: int, pid: Optional[str] = None) -> dict:
        pid = pid or self.pdd.pid

        cached = await self.db.execute(
            select(PromotionUrlCache).where(
                PromotionUrlCache.goods_sign == goods_sign,
                PromotionUrlCache.pid == pid,
                PromotionUrlCache.expires_at > datetime.now(UTC),
            )
        )
        existing = cached.scalar_one_or_none()
        if existing:
            logger.info(f"[promo] Cache hit goods_sign={goods_sign}, pid={pid}")
            return {
                "short_url": existing.short_url,
                "mobile_url": existing.mobile_url,
                "we_app_url": existing.we_app_url,
                "cached": True,
            }

        url_data = await self.pdd.generate_promotion_url(goods_sign, pid)
        result = {
            "short_url": url_data.get("short_url", ""),
            "mobile_url": url_data.get("mobile_url", ""),
            "we_app_url": url_data.get("we_app_url", ""),
            "cached": False,
        }

        cache = PromotionUrlCache(
            goods_sign=goods_sign,
            pid=pid,
            short_url=result["short_url"],
            mobile_url=result["mobile_url"],
            we_app_url=result["we_app_url"],
            expires_at=datetime.now(UTC) + self.cache_ttl,
        )
        self.db.add(cache)
        await self.db.commit()
        logger.info(f"[promo] Generated fresh URL goods_sign={goods_sign}, pid={pid}")

        return result
