from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.spu import Spu
from app.utils.cache import cache


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, query: str, pet_type: str | None = None) -> dict:
        cache_key = f"search:{query}:{pet_type or 'all'}"
        cached = await cache.get(cache_key)
        if cached:
            return cached

        # Search SPUs
        search_term = f"%{query}%"
        spu_query = select(Spu).where(
            Spu.status == "active",
            or_(
                Spu.name.ilike(search_term),
                Spu.brand.ilike(search_term),
                Spu.description.ilike(search_term),
                Spu.model.ilike(search_term),
            )
        ).limit(10)

        if pet_type:
            spu_query = spu_query.where(Spu.pet_type == pet_type)

        result = await self.db.execute(spu_query)
        spus = result.scalars().all()

        # Search categories
        category_query = select(Category).where(
            Category.is_active == True,
            Category.name.ilike(search_term)
        ).limit(5)

        category_result = await self.db.execute(category_query)
        categories = category_result.scalars().all()

        # Get brands matching the query
        brand_query = select(Spu.brand).where(
            Spu.status == "active",
            Spu.brand.isnot(None),
            Spu.brand.ilike(search_term),
        ).distinct().limit(5)

        brand_result = await self.db.execute(brand_query)
        brands = [b for b in brand_result.scalars().all() if b]

        # Generate contextual suggestions based on query and results
        suggestions = await self._generate_suggestions(query, categories, brands)

        results = {
            "suggestions": suggestions,
            "spus": [{
                "id": s.id,
                "name": s.name,
                "brand": s.brand,
                "model": s.model,
                "price_range": {
                    "min": float(s.price_min) if s.price_min else None,
                    "max": float(s.price_max) if s.price_max else None,
                },
                "image_urls": s.image_urls,
                "pet_type": s.pet_type,
            } for s in spus],
            "categories": [{"id": c.id, "name": c.name, "pet_type": c.pet_type} for c in categories],
            "brands": brands,
        }

        # Cache for 5 minutes
        await cache.set(cache_key, results, expire=300)
        return results

    async def get_suggestions(self, query: str, limit: int = 8) -> list[dict]:
        """Get real-time search suggestions based on SPU names, brands, and categories."""
        if len(query) < 1:
            return []

        cache_key = f"search:suggestions:{query}"
        cached = await cache.get(cache_key)
        if cached:
            return cached

        suggestions = []
        search_term = f"%{query}%"
        
        # 1. SPU name suggestions
        spu_query = select(Spu.name).where(
            Spu.status == "active",
            Spu.name.ilike(search_term),
        ).distinct().limit(limit)
        
        result = await self.db.execute(spu_query)
        spu_names = result.scalars().all()
        for name in spu_names:
            suggestions.append({
                "type": "product",
                "text": name,
                "highlight": self._highlight_match(name, query),
            })

        # 2. Brand suggestions
        brand_query = select(Spu.brand).where(
            Spu.status == "active",
            Spu.brand.isnot(None),
            Spu.brand.ilike(search_term),
        ).distinct().limit(3)
        
        result = await self.db.execute(brand_query)
        brands = result.scalars().all()
        for brand in brands:
            suggestions.append({
                "type": "brand",
                "text": brand,
                "highlight": self._highlight_match(brand, query),
            })

        # 3. Category suggestions
        category_query = select(Category).where(
            Category.is_active == True,
            Category.name.ilike(search_term),
        ).limit(3)
        
        result = await self.db.execute(category_query)
        categories = result.scalars().all()
        for cat in categories:
            suggestions.append({
                "type": "category",
                "text": cat.name,
                "highlight": self._highlight_match(cat.name, query),
                "pet_type": cat.pet_type,
            })

        # Deduplicate and limit
        seen = set()
        unique_suggestions = []
        for s in suggestions:
            if s["text"] not in seen and len(unique_suggestions) < limit:
                seen.add(s["text"])
                unique_suggestions.append(s)

        await cache.set(cache_key, unique_suggestions, expire=120)
        return unique_suggestions

    async def _generate_suggestions(self, query: str, categories: list, brands: list) -> list[str]:
        """Generate contextual search suggestions."""
        suggestions = []
        
        # Base suggestions
        suggestions.append(f"{query} 推荐")
        suggestions.append(f"{query} 测评")
        suggestions.append(f"{query} 价格")
        
        # Category-based suggestions
        for cat in categories[:2]:
            suggestions.append(f"{cat.name} {query}")
        
        # Brand-based suggestions
        for brand in brands[:2]:
            suggestions.append(f"{brand} {query}")
        
        return suggestions[:6]

    def _highlight_match(self, text: str, query: str) -> str:
        """Highlight matching portion of text."""
        import re
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        return pattern.sub(f"<mark>{query}</mark>", text)
