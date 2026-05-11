from typing import List, Optional
from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product
from app.models.category import Category
from app.models.review import Review


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, query: str, pet_type: Optional[str] = None) -> dict:
        # Search products
        product_query = select(Product).where(
            Product.status == "active",
            or_(
                Product.name.ilike(f"%{query}%"),
                Product.brand.ilike(f"%{query}%"),
                Product.description.ilike(f"%{query}%"),
            )
        ).limit(10)
        
        if pet_type:
            product_query = product_query.join(Category).where(Category.pet_type == pet_type)
        
        result = await self.db.execute(product_query)
        products = result.scalars().all()
        
        # Search categories
        category_query = select(Category).where(
            Category.is_active == True,
            Category.name.ilike(f"%{query}%")
        ).limit(5)
        
        category_result = await self.db.execute(category_query)
        categories = category_result.scalars().all()
        
        # Get brands
        brand_query = select(Product.brand).where(
            Product.status == "active",
            Product.brand.isnot(None),
        ).distinct().limit(5)
        
        brand_result = await self.db.execute(brand_query)
        brands = [b for b in brand_result.scalars().all() if b]
        
        # Generate suggestions
        suggestions = [
            f"{query} 推荐",
            f"{query} 测评",
            f"{query} 价格",
        ]
        
        return {
            "suggestions": suggestions,
            "products": [{
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "price_range": {
                    "min": float(p.price_min) if p.price_min else None,
                    "max": float(p.price_max) if p.price_max else None,
                },
                "image_urls": p.image_urls,
                "ratings": p.ratings,
            } for p in products],
            "categories": [{"id": c.id, "name": c.name} for c in categories],
            "brands": brands,
        }
