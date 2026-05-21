from sqlalchemy.ext.asyncio import AsyncSession

from app.services.spu_service import SpuService
from app.services.review_service import ReviewService


class AgentTools:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.spu_service = SpuService(db)
        self.review_service = ReviewService(db)

    async def search_products(self, pet_type: str | None = None, category: str | None = None,
                             brand: str | None = None, max_price: float | None = None) -> list[dict]:
        from app.schemas.spu import SpuFilter
        filters = SpuFilter(
            pet_type=pet_type,
            brand=brand,
            max_price=max_price,
            page=1,
            page_size=5,
        )
        spus, _ = await self.spu_service.get_spus_for_miniprogram(filters)
        return [{
            "id": s.id,
            "name": s.name,
            "brand": s.brand,
            "model": s.model,
            "price_min": float(s.price_min) if s.price_min else None,
            "price_max": float(s.price_max) if s.price_max else None,
            "description": s.description,
            "pros": s.pros or [],
            "cons": s.cons or [],
            "ingredients": s.ingredients or [],
            "image_urls": s.image_urls or [],
        } for s in spus]

    async def get_product_detail(self, product_id: int) -> dict | None:
        spu = await self.spu_service.get_spu_for_miniprogram(product_id)
        if spu:
            return {
                "id": spu.id,
                "name": spu.name,
                "brand": spu.brand,
                "model": spu.model,
                "price_min": float(spu.price_min) if spu.price_min else None,
                "price_max": float(spu.price_max) if spu.price_max else None,
                "description": spu.description,
                "pros": spu.pros or [],
                "cons": spu.cons or [],
                "ingredients": spu.ingredients or [],
                "nutrition": spu.nutrition or {},
                "image_urls": spu.image_urls or [],
            }
        return None

    async def get_reviews_summary(self, product_id: int) -> dict:
        summary = await self.review_service.get_review_summary(product_id)
        return summary.model_dump()

    async def compare_products(self, product_ids: list[int]) -> list[dict]:
        spus = []
        for pid in product_ids:
            spu = await self.spu_service.get_spu_for_miniprogram(pid)
            if spu:
                spus.append(spu)
        return [{
            "id": s.id,
            "name": s.name,
            "brand": s.brand,
            "model": s.model,
            "price_min": float(s.price_min) if s.price_min else None,
            "price_max": float(s.price_max) if s.price_max else None,
            "pros": s.pros or [],
            "cons": s.cons or [],
            "ingredients": s.ingredients or [],
        } for s in spus]
