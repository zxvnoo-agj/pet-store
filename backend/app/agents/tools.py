from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.product_service import ProductService
from app.services.review_service import ReviewService


class AgentTools:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.product_service = ProductService(db)
        self.review_service = ReviewService(db)

    async def search_products(self, pet_type: Optional[str] = None, category: Optional[str] = None, 
                             brand: Optional[str] = None, max_price: Optional[float] = None) -> List[dict]:
        from app.schemas.product import ProductFilter
        filters = ProductFilter(
            pet_type=pet_type,
            brand=brand,
            max_price=max_price,
            page=1,
            page_size=5,
        )
        products, _ = await self.product_service.get_products(filters)
        return [p.model_dump() for p in products]

    async def get_product_detail(self, product_id: int) -> Optional[dict]:
        product = await self.product_service.get_product_by_id(product_id)
        if product:
            return {
                "id": product.id,
                "name": product.name,
                "brand": product.brand,
                "price_min": float(product.price_min) if product.price_min else None,
                "price_max": float(product.price_max) if product.price_max else None,
                "description": product.description,
                "pros": product.pros,
                "cons": product.cons,
                "ratings": product.ratings,
                "ingredients": product.ingredients,
            }
        return None

    async def get_reviews_summary(self, product_id: int) -> dict:
        summary = await self.review_service.get_review_summary(product_id)
        return summary.model_dump()

    async def compare_products(self, product_ids: List[int]) -> List[dict]:
        products = await self.product_service.compare_products(product_ids)
        return [{
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "price_min": float(p.price_min) if p.price_min else None,
            "price_max": float(p.price_max) if p.price_max else None,
            "ratings": p.ratings,
            "pros": p.pros,
            "cons": p.cons,
        } for p in products]
