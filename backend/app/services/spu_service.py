from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.spu import Spu
from app.models.spu_listing import SpuListing
from app.schemas.spu import SpuCreate, SpuFilter, SpuUpdate
from app.utils.price_utils import update_spu_price_range


class SpuService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_spu(self, data: SpuCreate) -> Spu:
        # Check for duplicate SPU
        existing = await self.db.execute(
            select(Spu).where(
                Spu.brand == data.brand,
                Spu.category_id == data.category_id,
                Spu.name == data.name,
                Spu.model == data.model,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("SPU with same brand, category, name and model already exists")

        spu = Spu(**data.model_dump())
        self.db.add(spu)
        await self.db.commit()
        await self.db.refresh(spu)
        return spu

    async def get_spu(self, spu_id: int) -> Spu | None:
        result = await self.db.execute(
            select(Spu)
            .where(Spu.id == spu_id)
            .options(selectinload(Spu.category))
        )
        return result.scalar_one_or_none()

    async def update_spu(self, spu_id: int, data: SpuUpdate) -> Spu | None:
        result = await self.db.execute(select(Spu).where(Spu.id == spu_id))
        spu = result.scalar_one_or_none()
        if not spu:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(spu, key, value)

        await self.db.commit()
        await self.db.refresh(spu)
        return spu

    async def delete_spu(self, spu_id: int) -> bool:
        result = await self.db.execute(select(Spu).where(Spu.id == spu_id))
        spu = result.scalar_one_or_none()
        if not spu:
            return False
        await self.db.delete(spu)
        await self.db.commit()
        return True

    async def list_spus(self, filters: SpuFilter) -> tuple[list[Spu], int]:
        query = select(Spu).options(selectinload(Spu.category))
        count_query = select(func.count(Spu.id))

        if filters.category_id:
            query = query.where(Spu.category_id == filters.category_id)
            count_query = count_query.where(Spu.category_id == filters.category_id)

        if filters.pet_type:
            query = query.where(Spu.pet_type == filters.pet_type)
            count_query = count_query.where(Spu.pet_type == filters.pet_type)

        if filters.brand:
            query = query.where(Spu.brand == filters.brand)
            count_query = count_query.where(Spu.brand == filters.brand)

        if filters.status:
            query = query.where(Spu.status == filters.status)
            count_query = count_query.where(Spu.status == filters.status)

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                (Spu.name.ilike(search_term)) | (Spu.model.ilike(search_term))
            )
            count_query = count_query.where(
                (Spu.name.ilike(search_term)) | (Spu.model.ilike(search_term))
            )

        query = query.order_by(Spu.updated_at.desc())
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        spus = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        return list(spus), total or 0

    async def get_listings_by_spu(self, spu_id: int, match_status: str | None = None) -> list[SpuListing]:
        query = select(SpuListing).where(SpuListing.spu_id == spu_id)
        if match_status:
            query = query.where(SpuListing.match_status == match_status)
        query = query.order_by(SpuListing.price.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def link_listing(self, listing_id: int, spu_id: int) -> SpuListing | None:
        result = await self.db.execute(select(SpuListing).where(SpuListing.id == listing_id))
        listing = result.scalar_one_or_none()
        if not listing:
            return None
        listing.spu_id = spu_id
        listing.match_status = "linked"
        await self.db.commit()
        await self.db.refresh(listing)
        await update_spu_price_range(self.db, spu_id)
        return listing

    async def unlink_listing(self, listing_id: int) -> SpuListing | None:
        result = await self.db.execute(select(SpuListing).where(SpuListing.id == listing_id))
        listing = result.scalar_one_or_none()
        if not listing:
            return None
        spu_id = listing.spu_id
        listing.spu_id = None
        listing.match_status = "unmatched"
        await self.db.commit()
        await self.db.refresh(listing)
        if spu_id:
            await update_spu_price_range(self.db, spu_id)
        return listing

    async def get_matching_queue(
        self, match_status: str, page: int = 1, page_size: int = 50
    ) -> tuple[list[SpuListing], int]:
        query = select(SpuListing).where(SpuListing.match_status == match_status)
        count_query = select(func.count(SpuListing.id)).where(SpuListing.match_status == match_status)

        if match_status == "candidate":
            query = query.order_by(SpuListing.match_confidence.desc())
        else:
            query = query.order_by(SpuListing.created_at.desc())

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        listings = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        return list(listings), total or 0

    async def confirm_candidates(self, listing_ids: list[int]) -> int:
        result = await self.db.execute(
            select(SpuListing).where(
                SpuListing.id.in_(listing_ids),
                SpuListing.match_status == "candidate",
            )
        )
        listings = result.scalars().all()
        count = 0
        for listing in listings:
            listing.match_status = "linked"
            count += 1
            await update_spu_price_range(self.db, listing.spu_id)
        await self.db.commit()
        return count

    async def reject_candidates(self, listing_ids: list[int]) -> int:
        result = await self.db.execute(
            select(SpuListing).where(
                SpuListing.id.in_(listing_ids),
                SpuListing.match_status == "candidate",
            )
        )
        listings = result.scalars().all()
        count = 0
        for listing in listings:
            listing.match_status = "rejected"
            count += 1
        await self.db.commit()
        return count
