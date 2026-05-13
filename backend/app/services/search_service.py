from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.product import Product
from app.utils.cache import cache


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, query: str, pet_type: str | None = None) -> dict:
        cache_key = f"search:{query}:{pet_type or 'all'}"
        cached = await cache.get(cache_key)
        if cached:
            return cached

        # PostgreSQL full-text search with ranking
        # Use plainto_tsquery for user input and ts_rank for relevance scoring
        tsquery = func.plainto_tsquery("simple", query)
        
        product_query = (
            select(Product, func.ts_rank(Product.search_vector, tsquery).label("rank"))
            .where(
                Product.status == "active",
                Product.search_vector.op("@@")(tsquery),
            )
            .order_by(text("rank DESC"))
            .limit(10)
        )

        if pet_type:
            product_query = product_query.join(Category).where(Category.pet_type == pet_type)

        result = await self.db.execute(product_query)
        products_with_rank = result.all()

        # Fallback to ilike if no full-text results found
        if not products_with_rank:
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
        else:
            products = [p for p, _ in products_with_rank]

        # Search categories
        category_query = select(Category).where(
            Category.is_active,
            Category.name.ilike(f"%{query}%")
        ).limit(5)

        category_result = await self.db.execute(category_query)
        categories = category_result.scalars().all()

        # Get brands matching the query
        brand_query = select(Product.brand).where(
            Product.status == "active",
            Product.brand.isnot(None),
            Product.brand.ilike(f"%{query}%"),
        ).distinct().limit(5)

        brand_result = await self.db.execute(brand_query)
        brands = [b for b in brand_result.scalars().all() if b]

        # Generate contextual suggestions based on query and results
        suggestions = await self._generate_suggestions(query, categories, brands)

        results = {
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
            "categories": [{"id": c.id, "name": c.name, "pet_type": c.pet_type} for c in categories],
            "brands": brands,
        }

        # Cache for 5 minutes
        await cache.set(cache_key, results, expire=300)
        return results

    async def get_suggestions(self, query: str, limit: int = 8) -> list[dict]:
        """Get real-time search suggestions based on product names, brands, and categories."""
        if len(query) < 1:
            return []

        cache_key = f"search:suggestions:{query}"
        cached = await cache.get(cache_key)
        if cached:
            return cached

        suggestions = []
        
        # 1. Product name suggestions
        product_query = select(Product.name).where(
            Product.status == "active",
            Product.name.ilike(f"%{query}%"),
        ).distinct().limit(limit)
        
        result = await self.db.execute(product_query)
        product_names = result.scalars().all()
        for name in product_names:
            suggestions.append({
                "type": "product",
                "text": name,
                "highlight": self._highlight_match(name, query),
            })

        # 2. Brand suggestions
        brand_query = select(Product.brand).where(
            Product.status == "active",
            Product.brand.isnot(None),
            Product.brand.ilike(f"%{query}%"),
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
            Category.is_active,
            Category.name.ilike(f"%{query}%"),
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
        return pattern.sub(f"\u003cmark\u003e{query}\u003c/mark\u003e", text)
