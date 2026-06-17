from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.category import Category
from app.services.spu_service import SpuService
from app.services.review_service import ReviewService


PET_TYPE_ALIASES = {
    "cat": "cat",
    "cats": "cat",
    "猫": "cat",
    "猫咪": "cat",
    "幼猫": "cat",
    "成猫": "cat",
    "dog": "dog",
    "dogs": "dog",
    "狗": "dog",
    "狗狗": "dog",
    "幼犬": "dog",
    "成犬": "dog",
}


class AgentTools:
    def __init__(self, *_args, **_kwargs):
        pass

    def _normalize_pet_type(self, pet_type: str | None, text: str | None = None) -> str | None:
        candidates = [pet_type, text]
        for candidate in candidates:
            if not candidate:
                continue
            lowered = candidate.strip().lower()
            if lowered in PET_TYPE_ALIASES:
                return PET_TYPE_ALIASES[lowered]
            for key, value in PET_TYPE_ALIASES.items():
                if key in lowered:
                    return value
        return None

    async def _resolve_category_id(self, db, category: str | None, pet_type: str | None) -> int | None:
        if not category:
            return None
        category_text = category.strip()
        if not category_text:
            return None

        query = select(Category).where(Category.is_active.is_(True))
        if pet_type:
            query = query.where(Category.pet_type == pet_type)
        query = query.where(Category.name.ilike(f"%{category_text}%")).order_by(Category.level.desc())
        result = await db.execute(query.limit(1))
        matched = result.scalar_one_or_none()
        return matched.id if matched else None

    def _category_name(self, spu) -> str | None:
        category = getattr(spu, "category", None)
        return getattr(category, "name", None) if category else None

    def _price_confidence_note(self, spu) -> str:
        if getattr(spu, "price_min", None) is None and getattr(spu, "price_max", None) is None:
            return "当前暂无价格数据"
        return "价格来自已关联商品清单"

    def _spu_payload(self, spu) -> dict:
        review_count = getattr(spu, "review_count", None)
        rating = getattr(spu, "avg_rating", None) or getattr(spu, "rating", None)
        return {
            "id": spu.id,
            "name": spu.name,
            "brand": spu.brand,
            "model": spu.model,
            "pet_type": spu.pet_type,
            "category": self._category_name(spu),
            "price_min": float(spu.price_min) if spu.price_min is not None else None,
            "price_max": float(spu.price_max) if spu.price_max is not None else None,
            "currency": spu.currency,
            "description": spu.description,
            "pros": spu.pros or [],
            "cons": spu.cons or [],
            "ingredients": spu.ingredients or [],
            "nutrition": spu.nutrition or {},
            "image_urls": spu.image_urls or [],
            "review_count": review_count or 0,
            "rating": float(rating) if rating else 0.0,
            "data_notes": [self._price_confidence_note(spu)],
        }

    async def search_products(self, pet_type: str | None = None, category: str | None = None,
                             brand: str | None = None, max_price: float | None = None) -> list[dict]:
        from app.schemas.spu import SpuFilter

        normalized_pet_type = self._normalize_pet_type(pet_type, category)
        async with AsyncSessionLocal() as db:
            category_id = await self._resolve_category_id(db, category, normalized_pet_type)
            filters = SpuFilter(
                pet_type=normalized_pet_type,
                category_id=category_id,
                brand=brand.strip() if brand else None,
                search=category if category_id is None else None,
                max_price=max_price,
                page=1,
                page_size=5,
            )
            spus, _ = await SpuService(db).get_spus_for_miniprogram(filters)
        return [self._spu_payload(s) for s in spus]

    async def get_spu_detail(self, spu_id: int) -> dict | None:
        async with AsyncSessionLocal() as db:
            spu = await SpuService(db).get_spu_for_miniprogram(spu_id)
        if spu:
            return self._spu_payload(spu)
        return None

    async def get_reviews_summary(self, spu_id: int) -> dict:
        async with AsyncSessionLocal() as db:
            summary = await ReviewService(db).get_review_summary(spu_id)
        return summary.model_dump()

    async def compare_products(self, spu_ids: list[int]) -> list[dict]:
        spus = []
        async with AsyncSessionLocal() as db:
            service = SpuService(db)
            for sid in spu_ids:
                spu = await service.get_spu_for_miniprogram(sid)
                if spu:
                    spus.append(spu)
        return [self._spu_payload(s) for s in spus]
