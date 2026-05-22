from sqlalchemy import asc, desc, func, select
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
        # Subquery for linked listing count
        listing_count_subq = (
            select(
                SpuListing.spu_id,
                func.count(SpuListing.id).label("listing_count"),
            )
            .where(SpuListing.match_status == "linked")
            .group_by(SpuListing.spu_id)
            .subquery()
        )

        query = (
            select(Spu, func.coalesce(listing_count_subq.c.listing_count, 0).label("listing_count"))
            .outerjoin(listing_count_subq, Spu.id == listing_count_subq.c.spu_id)
            .options(selectinload(Spu.category))
        )
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
        rows = result.all()

        # Attach listing_count to each SPU instance
        spus = []
        for row in rows:
            spu = row[0]
            spu.listing_count = row[1]
            spus.append(spu)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        return spus, total or 0

    # Mini-program specific methods
    async def get_spus_for_miniprogram(self, filters: SpuFilter) -> tuple[list[Spu], int]:
        """Get SPUs for mini-program with review count and rating."""
        from app.models.review import Review
        
        # Subquery for review stats
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
            select(Spu)
            .outerjoin(review_stats_subq, Spu.id == review_stats_subq.c.spu_id)
            .options(selectinload(Spu.category))
            .where(Spu.status == "active")
        )
        count_query = select(func.count(Spu.id)).where(Spu.status == "active")

        if filters.category_id:
            # Check if category has children; if so, include all child category IDs
            from app.models.category import Category
            child_ids_result = await self.db.execute(
                select(Category.id).where(Category.parent_id == filters.category_id)
            )
            child_ids = [row[0] for row in child_ids_result.all()]
            if child_ids:
                # Parent category: include all children
                all_ids = [filters.category_id] + child_ids
                query = query.where(Spu.category_id.in_(all_ids))
                count_query = count_query.where(Spu.category_id.in_(all_ids))
            else:
                # Leaf category: exact match
                query = query.where(Spu.category_id == filters.category_id)
                count_query = count_query.where(Spu.category_id == filters.category_id)

        if filters.pet_type:
            query = query.where(Spu.pet_type == filters.pet_type)
            count_query = count_query.where(Spu.pet_type == filters.pet_type)

        if filters.brand:
            query = query.where(Spu.brand == filters.brand)
            count_query = count_query.where(Spu.brand == filters.brand)

        if filters.min_price is not None:
            query = query.where(Spu.price_min >= filters.min_price)
            count_query = count_query.where(Spu.price_min >= filters.min_price)

        if filters.max_price is not None:
            query = query.where(Spu.price_max <= filters.max_price)
            count_query = count_query.where(Spu.price_max <= filters.max_price)

        # Sorting
        if filters.sort == "price_asc":
            query = query.order_by(asc(Spu.price_min))
        elif filters.sort == "price_desc":
            query = query.order_by(desc(Spu.price_min))
        elif filters.sort == "rating":
            query = query.order_by(desc(review_stats_subq.c.avg_rating))
        else:
            query = query.order_by(desc(Spu.updated_at))

        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        spus = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        return list(spus), total or 0

    async def get_spu_for_miniprogram(self, spu_id: int) -> Spu | None:
        """Get SPU detail for mini-program with category."""
        result = await self.db.execute(
            select(Spu)
            .where(Spu.id == spu_id, Spu.status == "active")
            .options(selectinload(Spu.category))
        )
        spu = result.scalar_one_or_none()
        if spu:
            # Get listing count
            listing_count_result = await self.db.execute(
                select(func.count(SpuListing.id))
                .where(SpuListing.spu_id == spu_id, SpuListing.match_status == "linked")
            )
            spu.listing_count = listing_count_result.scalar() or 0
        return spu

    async def get_listings_for_miniprogram(self, spu_id: int, platform: str | None = None, sort: str | None = None) -> list[SpuListing]:
        """Get listings for mini-program price comparison."""
        query = select(SpuListing).where(
            SpuListing.spu_id == spu_id,
            SpuListing.match_status == "linked"
        )
        
        if platform:
            query = query.where(SpuListing.platform == platform)
        
        if sort == "price_desc":
            query = query.order_by(desc(SpuListing.price))
        elif sort == "sales":
            query = query.order_by(desc(SpuListing.sales_count))
        else:
            query = query.order_by(asc(SpuListing.price))
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_spus(self, query_str: str, pet_type: str | None = None, category_id: int | None = None, page: int = 1, page_size: int = 20) -> tuple[list[Spu], int]:
        """Search SPUs by keyword across name, brand, description, and ingredients."""
        from app.models.review import Review
        
        search_term = f"%{query_str}%"
        
        query = select(Spu).where(Spu.status == "active").options(selectinload(Spu.category))
        count_query = select(func.count(Spu.id)).where(Spu.status == "active")
        
        # Search across multiple fields
        search_conditions = (
            (Spu.name.ilike(search_term)) |
            (Spu.brand.ilike(search_term)) |
            (Spu.description.ilike(search_term)) |
            (Spu.model.ilike(search_term))
        )
        
        query = query.where(search_conditions)
        count_query = count_query.where(search_conditions)
        
        if pet_type:
            query = query.where(Spu.pet_type == pet_type)
            count_query = count_query.where(Spu.pet_type == pet_type)
            
        if category_id:
            query = query.where(Spu.category_id == category_id)
            count_query = count_query.where(Spu.category_id == category_id)
        
        query = query.order_by(desc(Spu.updated_at))
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
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

    async def get_listing_by_id(self, listing_id: int) -> SpuListing | None:
        result = await self.db.execute(
            select(SpuListing).where(SpuListing.id == listing_id)
        )
        return result.scalar_one_or_none()
