from datetime import UTC, datetime

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.data_source import DataFetchJob, DataSource
from app.models.spu import Spu
from app.models.spu_listing import SpuListing
from app.schemas.spu_listing import SpuListingManualCreate, SpuListingManualUpdate
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
        result = await self.db.execute(
            select(Spu)
            .where(Spu.id == spu_id)
            .options(selectinload(Spu.category))
        )
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

    async def list_brands(self) -> list[str]:
        result = await self.db.execute(
            select(Spu.brand)
            .where(Spu.brand.is_not(None), func.length(func.trim(Spu.brand)) > 0)
            .distinct()
            .order_by(Spu.brand.asc())
        )
        return list(result.scalars().all())

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
                or_(
                    Spu.name.ilike(search_term),
                    Spu.model.ilike(search_term),
                    Spu.brand.ilike(search_term),
                )
            )
            count_query = count_query.where(
                or_(
                    Spu.name.ilike(search_term),
                    Spu.model.ilike(search_term),
                    Spu.brand.ilike(search_term),
                )
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
    async def _hydrate_miniprogram_card_fields(self, spus: list[Spu]) -> None:
        """Fill card image and price from linked listings when SPU fields are empty."""
        spu_ids = [spu.id for spu in spus]
        if not spu_ids:
            return

        listings_result = await self.db.execute(
            select(SpuListing)
            .where(
                SpuListing.spu_id.in_(spu_ids),
                SpuListing.match_status == "linked",
            )
            .order_by(SpuListing.spu_id.asc(), SpuListing.is_primary.desc(), SpuListing.price.asc())
        )
        listings_by_spu: dict[int, list[SpuListing]] = {}
        for listing in listings_result.scalars().all():
            if listing.spu_id is not None:
                listings_by_spu.setdefault(listing.spu_id, []).append(listing)

        for spu in spus:
            listings = listings_by_spu.get(spu.id, [])
            if not listings:
                continue

            if not spu.image_urls:
                image_url = next((listing.image_url for listing in listings if listing.image_url), None)
                if image_url:
                    spu.image_urls = [image_url]

            prices = [listing.price for listing in listings if listing.price is not None]
            if prices:
                if spu.price_min is None:
                    spu.price_min = min(prices)
                if spu.price_max is None:
                    spu.price_max = max(prices)

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
        await self._hydrate_miniprogram_card_fields(list(spus))

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
            if not spu.image_urls:
                image_result = await self.db.execute(
                    select(SpuListing.image_url)
                    .where(
                        SpuListing.spu_id == spu_id,
                        SpuListing.match_status == "linked",
                        SpuListing.image_url.is_not(None),
                    )
                    .order_by(SpuListing.is_primary.desc(), SpuListing.price.asc())
                    .limit(1)
                )
                image_url = image_result.scalar_one_or_none()
                if image_url:
                    spu.image_urls = [image_url]
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
            query = query.order_by(desc(SpuListing.is_primary), asc(SpuListing.price))
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_spus(self, query_str: str, pet_type: str | None = None, category_id: int | None = None, page: int = 1, page_size: int = 20) -> tuple[list[Spu], int]:
        """Search SPUs by keyword across name, brand, description, and ingredients."""
        from app.models.review import Review
        
        query = select(Spu).where(Spu.status == "active").options(selectinload(Spu.category))
        count_query = select(func.count(Spu.id)).where(Spu.status == "active")
        
        keywords = [kw for kw in query_str.split() if kw]
        
        if keywords:
            keyword_conditions = []
            for kw in keywords:
                kw_term = f"%{kw}%"
                keyword_conditions.append(
                    (Spu.name.ilike(kw_term)) |
                    (Spu.brand.ilike(kw_term)) |
                    (Spu.description.ilike(kw_term)) |
                    (Spu.model.ilike(kw_term))
                )
            search_conditions = or_(*keyword_conditions)
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
        await self._hydrate_miniprogram_card_fields(list(spus))

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        return list(spus), total or 0

    async def get_listings_by_spu(self, spu_id: int, match_status: str | None = None) -> list[SpuListing]:
        query = (
            select(SpuListing)
            .options(selectinload(SpuListing.spu))
            .where(SpuListing.spu_id == spu_id)
        )
        if match_status:
            query = query.where(SpuListing.match_status == match_status)
        query = query.order_by(SpuListing.is_primary.desc(), SpuListing.price.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_listing_for_spu(self, spu_id: int, data: SpuListingManualCreate) -> SpuListing | None:
        spu_result = await self.db.execute(select(Spu).where(Spu.id == spu_id))
        spu = spu_result.scalar_one_or_none()
        if not spu:
            return None

        listing = SpuListing(
            spu_id=spu_id,
            platform=data.platform or "pdd",
            shop_name=data.shop_name or "",
            goods_id=data.goods_id,
            goods_sign=data.goods_sign,
            title=data.title,
            price=data.price or 0,
            original_price=data.original_price,
            url=data.url or "",
            image_url=data.image_url,
            sales_count=data.sales_count,
            sku_specs=data.sku_specs or [],
            service_tags=data.service_tags or [],
            is_primary=data.is_primary,
            match_confidence=1,
            match_status=data.match_status or "linked",
        )
        self.db.add(listing)
        await self.db.flush()

        if data.is_primary:
            await self._set_primary_listing(spu_id, listing.id)
        elif listing.image_url and not spu.image_urls:
            spu.image_urls = [listing.image_url]

        await self.db.commit()
        await self.db.refresh(listing)
        await update_spu_price_range(self.db, spu_id)
        return listing

    async def update_listing(self, listing_id: int, data: SpuListingManualUpdate) -> SpuListing | None:
        result = await self.db.execute(select(SpuListing).where(SpuListing.id == listing_id))
        listing = result.scalar_one_or_none()
        if not listing:
            return None

        update_data = data.model_dump(exclude_unset=True)
        is_primary = update_data.pop("is_primary", None)
        for key, value in update_data.items():
            setattr(listing, key, value)

        if is_primary is not None:
            listing.is_primary = is_primary
            if is_primary and listing.spu_id:
                await self._set_primary_listing(listing.spu_id, listing.id)

        await self.db.commit()
        await self.db.refresh(listing)
        if listing.spu_id:
            await update_spu_price_range(self.db, listing.spu_id)
        return listing

    async def delete_listing(self, listing_id: int) -> bool:
        result = await self.db.execute(select(SpuListing).where(SpuListing.id == listing_id))
        listing = result.scalar_one_or_none()
        if not listing:
            return False
        spu_id = listing.spu_id
        await self.db.delete(listing)
        await self.db.commit()
        if spu_id:
            await update_spu_price_range(self.db, spu_id)
        return True

    async def set_primary_listing(self, listing_id: int) -> SpuListing | None:
        result = await self.db.execute(select(SpuListing).where(SpuListing.id == listing_id))
        listing = result.scalar_one_or_none()
        if not listing or not listing.spu_id:
            return None
        await self._set_primary_listing(listing.spu_id, listing.id)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def _set_primary_listing(self, spu_id: int, listing_id: int) -> None:
        from sqlalchemy import update

        await self.db.execute(
            update(SpuListing)
            .where(SpuListing.spu_id == spu_id)
            .values(is_primary=False)
        )
        await self.db.execute(
            update(SpuListing)
            .where(SpuListing.id == listing_id)
            .values(is_primary=True)
        )
        listing_result = await self.db.execute(
            select(SpuListing.image_url).where(SpuListing.id == listing_id)
        )
        image_url = listing_result.scalar_one_or_none()
        if image_url:
            spu_result = await self.db.execute(select(Spu).where(Spu.id == spu_id))
            spu = spu_result.scalar_one_or_none()
            if spu:
                spu.image_urls = [image_url]

    async def _get_pdd_data_source(self) -> DataSource:
        result = await self.db.execute(select(DataSource).where(DataSource.platform == "pdd").limit(1))
        source = result.scalar_one_or_none()
        if source:
            return source
        source = DataSource(name="拼多多 DDK", platform="pdd", config={}, is_active=True)
        self.db.add(source)
        await self.db.flush()
        return source

    async def create_listing_job(self, *, job_type: str, spu_id: int | None, params: dict) -> DataFetchJob:
        source = await self._get_pdd_data_source()
        job = DataFetchJob(
            data_source_id=source.id,
            job_type=job_type,
            collection_type="incremental",
            status="pending",
            params=params,
            spu_id=spu_id,
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def refresh_listing_price(self, job_id: int, listing_id: int) -> None:
        from app.services.pdd_client import PDDClient

        job_result = await self.db.execute(select(DataFetchJob).where(DataFetchJob.id == job_id))
        job = job_result.scalar_one_or_none()
        if not job:
            return

        job.status = "running"
        job.started_at = datetime.now(UTC)
        await self.db.commit()

        listing_result = await self.db.execute(select(SpuListing).where(SpuListing.id == listing_id))
        listing = listing_result.scalar_one_or_none()
        if not listing:
            job.status = "failed"
            job.error_message = "Listing not found"
            job.completed_at = datetime.now(UTC)
            await self.db.commit()
            return

        if not listing.goods_sign:
            job.status = "failed"
            job.error_message = "Missing goods_sign; cannot refresh via PDD detail"
            listing.last_sync_error = job.error_message
            job.completed_at = datetime.now(UTC)
            await self.db.commit()
            return

        pdd = PDDClient()
        try:
            detail = await pdd.get_goods_detail(listing.goods_sign)
            if not detail:
                raise ValueError("PDD detail returned empty result")
            parsed = pdd.parse_goods(detail)
            listing.price = parsed["group_price"] or listing.price
            listing.original_price = parsed["single_price"] or listing.original_price
            listing.title = parsed["name"] or listing.title
            listing.shop_name = parsed["mall_name"] or listing.shop_name
            listing.image_url = parsed["image_urls"][0] if parsed["image_urls"] else listing.image_url
            listing.sales_count = self._parse_sales_count_for_refresh(parsed["sales_tip"]) or listing.sales_count
            listing.last_synced_at = datetime.now(UTC)
            listing.last_sync_error = None
            job.status = "completed"
            job.result = {
                "listing_id": listing.id,
                "price": float(listing.price),
                "original_price": float(listing.original_price) if listing.original_price else None,
            }
            job.completed_at = datetime.now(UTC)
            await self.db.commit()
            if listing.spu_id:
                await update_spu_price_range(self.db, listing.spu_id)
        except Exception as e:
            listing.last_sync_error = str(e)
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(UTC)
            await self.db.commit()
        finally:
            await pdd.close()

    @staticmethod
    def _parse_sales_count_for_refresh(sales_tip: str | None) -> int | None:
        if not sales_tip:
            return None
        cleaned = sales_tip.replace("+", "").strip()
        if "万" in cleaned:
            try:
                return int(float(cleaned.replace("万", "")) * 10000)
            except ValueError:
                return None
        try:
            return int(cleaned)
        except ValueError:
            return None

    async def link_listing(self, listing_id: int, spu_id: int) -> SpuListing | None:
        result = await self.db.execute(
            select(SpuListing).options(joinedload(SpuListing.spu)).where(SpuListing.id == listing_id)
        )
        listing = result.unique().scalar_one_or_none()
        if not listing:
            return None
        listing.spu_id = spu_id
        listing.match_status = "linked"
        if listing.image_url:
            spu_result = await self.db.execute(select(Spu).where(Spu.id == spu_id))
            linked_spu = spu_result.scalar_one_or_none()
            if linked_spu is not None and not linked_spu.image_urls:
                linked_spu.image_urls = [listing.image_url]
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
        from sqlalchemy.orm import joinedload, selectinload

        query = (
            select(SpuListing)
            .options(selectinload(SpuListing.spu))
            .where(SpuListing.match_status == match_status)
        )
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

    async def compare_spus(self, spu_ids: list[int]) -> list[Spu]:
        from app.models.review import Review

        review_stats = (
            select(
                Review.spu_id,
                func.count(Review.id).label("review_count"),
                func.avg(Review.rating).label("avg_rating"),
            )
            .where(Review.spu_id.in_(spu_ids), Review.status == "approved")
            .group_by(Review.spu_id)
        ).subquery()

        result = await self.db.execute(
            select(Spu, review_stats.c.review_count, review_stats.c.avg_rating)
            .outerjoin(review_stats, Spu.id == review_stats.c.spu_id)
            .where(Spu.id.in_(spu_ids), Spu.status == "active")
        )
        spus = []
        for row in result:
            spu, review_count, avg_rating = row
            spu.review_count = review_count or 0
            spu.avg_rating = round(float(avg_rating), 1) if avg_rating else 0.0
            spus.append(spu)
        return spus
