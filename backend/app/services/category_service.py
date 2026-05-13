
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.category import CategoryResponse
from app.utils.cache import cache


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_category_tree(self, pet_type: str | None = None) -> list[CategoryResponse]:
        cache_key = f"categories:tree:{pet_type or 'all'}"
        cached = await cache.get(cache_key)
        if cached:
            return [CategoryResponse(**item) for item in cached]

        query = select(Category).where(Category.is_active)
        if pet_type:
            query = query.where(Category.pet_type == pet_type)

        result = await self.db.execute(query)
        categories = result.scalars().all()

        category_map = {cat.id: CategoryResponse.model_validate(cat) for cat in categories}
        root_categories = []

        for cat in categories:
            cat_response = category_map[cat.id]
            if cat.parent_id and cat.parent_id in category_map:
                parent = category_map[cat.parent_id]
                parent.children.append(cat_response)
            else:
                root_categories.append(cat_response)

        result = sorted(root_categories, key=lambda x: x.sort_order)
        await cache.set(cache_key, [item.model_dump() for item in result], expire=3600)
        return result

    async def get_category_by_id(self, category_id: int) -> Category | None:
        result = await self.db.execute(
            select(Category).where(Category.id == category_id, Category.is_active)
        )
        return result.scalar_one_or_none()
