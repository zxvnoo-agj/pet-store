from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.favorite import Favorite
from app.models.review import Review
from app.models.spu import Spu
from app.models.spu_listing import SpuListing
from app.schemas.spu import SpuMiniProgramListResponse


class FavoriteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_favorite(self, user_id: int, spu_id: int) -> Favorite:
        # Check if already favorited
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.spu_id == spu_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        favorite = Favorite(user_id=user_id, spu_id=spu_id)
        self.db.add(favorite)
        await self.db.commit()
        await self.db.refresh(favorite)
        return favorite

    async def remove_favorite(self, user_id: int, spu_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.spu_id == spu_id,
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
    ) -> tuple[list[SpuMiniProgramListResponse], int]:
        review_stats_subq = (
            select(
                Review.spu_id,
                func.count(Review.id).label("review_count"),
                func.avg(Review.rating).label("avg_rating"),
            )
            .where(Review.status == "approved")
            .group_by(Review.spu_id)
            .subquery()
        )

        query = (
            select(
                Spu,
                func.coalesce(review_stats_subq.c.review_count, 0).label("review_count"),
                func.coalesce(review_stats_subq.c.avg_rating, 0).label("avg_rating"),
            )
            .join(Favorite, Favorite.spu_id == Spu.id)
            .outerjoin(review_stats_subq, Spu.id == review_stats_subq.c.spu_id)
            .options(selectinload(Spu.category))
            .where(Favorite.user_id == user_id, Spu.status == "active")
            .order_by(desc(Favorite.created_at))
        )
        count_query = (
            select(func.count(Favorite.id))
            .join(Spu, Favorite.spu_id == Spu.id)
            .where(Favorite.user_id == user_id, Spu.status == "active")
        )

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        rows = result.all()
        spus: list[Spu] = []
        for spu, review_count, avg_rating in rows:
            spu.review_count = review_count
            spu.rating = round(float(avg_rating or 0), 1)
            spus.append(spu)

        await self._hydrate_card_images(spus)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return [SpuMiniProgramListResponse.model_validate(s) for s in spus], total

    async def _hydrate_card_images(self, spus: list[Spu]) -> None:
        spu_ids = [spu.id for spu in spus if not spu.image_urls]
        if not spu_ids:
            return

        result = await self.db.execute(
            select(SpuListing)
            .where(
                SpuListing.spu_id.in_(spu_ids),
                SpuListing.match_status == "linked",
                SpuListing.image_url.is_not(None),
            )
            .order_by(SpuListing.spu_id.asc(), SpuListing.price.asc())
        )

        first_image_by_spu: dict[int, str] = {}
        for listing in result.scalars().all():
            if listing.spu_id is None or not listing.image_url:
                continue
            first_image_by_spu.setdefault(listing.spu_id, listing.image_url)

        for spu in spus:
            image_url = first_image_by_spu.get(spu.id)
            if image_url:
                spu.image_urls = [image_url]

    async def is_favorited(self, user_id: int, spu_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id,
                Favorite.spu_id == spu_id,
            )
        )
        return result.scalar_one_or_none() is not None
