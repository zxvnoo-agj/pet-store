from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.favorite import Favorite
from app.models.product import Product
from app.schemas.product import ProductListResponse


class FavoriteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_favorite(self, user_id: int, product_id: int) -> Favorite:
        # Check if already favorited
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.product_id == product_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        favorite = Favorite(user_id=user_id, product_id=product_id)
        self.db.add(favorite)
        await self.db.commit()
        await self.db.refresh(favorite)
        return favorite

    async def remove_favorite(self, user_id: int, product_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.product_id == product_id,
            )
        )
        favorite = result.scalar_one_or_none()
        if favorite:
            await self.db.delete(favorite)
            await self.db.commit()
            return True
        return False

    async def get_user_favorites(
        self, user_id: int, page: int = 1, page_size: int = 20
    ) -> tuple[list[ProductListResponse], int]:
        query = (
            select(Product)
            .join(Favorite, Favorite.product_id == Product.id)
            .where(Favorite.user_id == user_id, Product.status == "active")
            .order_by(desc(Favorite.created_at))
        )
        count_query = select(func.count(Favorite.id)).where(Favorite.user_id == user_id)

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        products = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        return [ProductListResponse.model_validate(p) for p in products], total

    async def is_favorited(self, user_id: int, product_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.product_id == product_id,
            )
        )
        return result.scalar_one_or_none() is not None
