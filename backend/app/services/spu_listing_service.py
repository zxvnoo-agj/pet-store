import asyncio
import uuid
from dataclasses import dataclass

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.spu import Spu
from app.models.spu_listing import SpuListing
from app.services.spu_matching_service import SpuMatchingService


@dataclass
class ImportJob:
    """Represents an import/matching job."""

    job_id: str
    status: str  # 'started', 'running', 'completed', 'failed'
    keyword: str
    total_imported: int = 0
    auto_linked: int = 0
    candidates: int = 0
    unmatched: int = 0
    error: str | None = None
    started_at: str | None = None
    completed_at: str | None = None


class ImportJobManager:
    """In-memory job manager for import/matching tasks."""

    _jobs: dict[str, ImportJob] = {}

    @classmethod
    def create_job(cls, keyword: str) -> ImportJob:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        job = ImportJob(
            job_id=job_id,
            status="started",
            keyword=keyword,
            started_at=__import__("datetime").datetime.utcnow().isoformat(),
        )
        cls._jobs[job_id] = job
        return job

    @classmethod
    def get_job(cls, job_id: str) -> ImportJob | None:
        return cls._jobs.get(job_id)

    @classmethod
    def update_job(cls, job_id: str, **kwargs) -> None:
        job = cls._jobs.get(job_id)
        if job:
            for key, value in kwargs.items():
                setattr(job, key, value)


class SpuListingService:
    """Service for managing SPU listings: import, match, and lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.matching_service = SpuMatchingService()

    @staticmethod
    def _parse_sales_count(sales_tip: str | None) -> int | None:
        """Parse sales count from PDD sales_tip string.
        
        Handles formats like:
        - '6400' -> 6400
        - '6.4万' -> 64000
        - '6.4万+' -> 64000
        - '1.2万' -> 12000
        - '' -> None
        """
        if not sales_tip:
            return None

        # Remove '+' suffix
        cleaned = sales_tip.replace('+', '').strip()

        # Handle '万' (ten thousand)
        if '万' in cleaned:
            num_str = cleaned.replace('万', '').strip()
            try:
                return int(float(num_str) * 10000)
            except ValueError:
                return None

        # Plain number
        try:
            return int(cleaned)
        except ValueError:
            return None

    async def import_and_match(
        self,
        job_id: str,
        keyword: str,
        max_results: int = 100,
        platform: str = "pdd",
    ) -> None:
        """Import listings from DDK API and run auto-matching.

        Steps:
            1. Fetch listings from DDK API
            2. Save new listings to database
            3. Run LLM matching against all SPUs
            4. Classify into auto-linked/candidate/unmatched
            5. Update job status
        """
        ImportJobManager.update_job(job_id, status="running")

        try:
            # Step 1: Fetch listings from DDK API
            listings_data = await self._fetch_listings(keyword, max_results, platform)
            logger.info(f"Import job {job_id}: fetched {len(listings_data)} listings")

            # Step 2: Save listings and deduplicate
            imported_count = 0
            for item in listings_data:
                existing = await self.db.execute(
                    select(SpuListing).where(
                        SpuListing.platform == platform,
                        SpuListing.goods_id == item["goods_id"],
                    )
                )
                if existing.scalar_one_or_none():
                    continue  # Skip duplicates

                listing = SpuListing(
                    spu_id=None,  # Will be updated after matching
                    platform=platform,
                    shop_name=item.get("shop_name", ""),
                    goods_id=item.get("goods_id"),
                    goods_sign=item.get("goods_sign"),
                    title=item.get("title", ""),
                    price=item.get("price", 0),
                    original_price=item.get("original_price"),
                    url=item.get("url", ""),
                    image_url=item.get("image_url"),
                    sales_count=item.get("sales_count"),
                    sku_specs=item.get("sku_specs"),
                    service_tags=item.get("service_tags"),
                    match_status="unmatched",
                )
                self.db.add(listing)
                imported_count += 1

            await self.db.commit()
            logger.info(f"Import job {job_id}: saved {imported_count} new listings")

            # Step 3: Run matching for new unmatched listings
            await self._run_matching_for_unmatched()

            # Step 4: Count results by tier
            stats = await self._get_matching_stats()
            ImportJobManager.update_job(
                job_id,
                status="completed",
                total_imported=imported_count,
                auto_linked=stats["auto_linked"],
                candidates=stats["candidates"],
                unmatched=stats["unmatched"],
                completed_at=__import__("datetime").datetime.utcnow().isoformat(),
            )

        except Exception as e:
            logger.error(f"Import job {job_id} failed: {e}")
            ImportJobManager.update_job(
                job_id,
                status="failed",
                error=str(e),
                completed_at=__import__("datetime").datetime.utcnow().isoformat(),
            )

    async def import_and_match_for_spu(
        self,
        job_id: str,
        spu_id: int,
        keyword: str | None = None,
        max_results: int = 100,
        platform: str = "pdd",
    ) -> None:
        """Import listings for a specific SPU from DDK API.

        Uses SPU's brand+name+model as search keyword if not provided.
        Only checks if listings match this specific SPU.
        """
        ImportJobManager.update_job(job_id, status="running")

        try:
            # Step 1: Fetch the target SPU
            spu_result = await self.db.execute(
                select(Spu)
                .options(selectinload(Spu.category))
                .where(Spu.id == spu_id)
            )
            spu = spu_result.scalar_one_or_none()
            if not spu:
                raise ValueError(f"SPU {spu_id} not found")

            # Step 2: Build search keyword
            search_keyword = keyword or f"{spu.brand} {spu.name} {spu.model}".strip()
            logger.info(
                f"Import job {job_id}: searching for SPU {spu_id} with keyword '{search_keyword}'"
            )

            # Step 3: Fetch listings
            listings_data = await self._fetch_listings(
                search_keyword, max_results, platform
            )
            logger.info(
                f"Import job {job_id}: fetched {len(listings_data)} listings"
            )

            # Step 4: Save and match against single SPU
            imported_count = 0
            linked_count = 0

            for item in listings_data:
                # Check duplicate
                existing = await self.db.execute(
                    select(SpuListing).where(
                        SpuListing.platform == platform,
                        SpuListing.goods_id == item["goods_id"],
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                # Check if matches this specific SPU
                match_result = await asyncio.to_thread(
                    self.matching_service.match_listing_to_spu_sync,
                    item["title"],
                    [spu],  # Only check against this one SPU
                )

                if match_result.confidence >= 0.75:
                    # Link to this SPU
                    listing = SpuListing(
                        spu_id=spu_id,
                        platform=platform,
                        shop_name=item.get("shop_name", ""),
                        goods_id=item.get("goods_id"),
                        goods_sign=item.get("goods_sign"),
                        title=item.get("title", ""),
                        price=item.get("price", 0),
                        original_price=item.get("original_price"),
                        url=item.get("url", ""),
                        image_url=item.get("image_url"),
                        sales_count=item.get("sales_count"),
                        sku_specs=item.get("sku_specs"),
                        service_tags=item.get("service_tags"),
                        match_confidence=match_result.confidence,
                        match_status="linked",
                    )
                    linked_count += 1
                else:
                    # Unmatched
                    listing = SpuListing(
                        spu_id=None,
                        platform=platform,
                        shop_name=item.get("shop_name", ""),
                        goods_id=item.get("goods_id"),
                        goods_sign=item.get("goods_sign"),
                        title=item.get("title", ""),
                        price=item.get("price", 0),
                        original_price=item.get("original_price"),
                        url=item.get("url", ""),
                        image_url=item.get("image_url"),
                        sales_count=item.get("sales_count"),
                        sku_specs=item.get("sku_specs"),
                        service_tags=item.get("service_tags"),
                        match_confidence=match_result.confidence,
                        match_status="unmatched",
                    )

                self.db.add(listing)
                imported_count += 1

            await self.db.commit()
            logger.info(
                f"Import job {job_id}: saved {imported_count} listings ({linked_count} linked to SPU {spu_id})"
            )

            # Update price range for the SPU
            if linked_count > 0:
                from app.utils.price_utils import update_spu_price_range

                await update_spu_price_range(self.db, spu_id)

            # Update job status
            ImportJobManager.update_job(
                job_id,
                status="completed",
                total_imported=imported_count,
                auto_linked=linked_count,
                candidates=0,
                unmatched=imported_count - linked_count,
                completed_at=__import__("datetime").datetime.utcnow().isoformat(),
            )

        except Exception as e:
            logger.error(f"Import job {job_id} failed: {e}")
            ImportJobManager.update_job(
                job_id,
                status="failed",
                error=str(e),
                completed_at=__import__("datetime").datetime.utcnow().isoformat(),
            )

    async def _fetch_listings(
        self, keyword: str, max_results: int, platform: str
    ) -> list[dict]:
        """Fetch listings from DDK API and enrich with detail data."""
        from app.services.pdd_client import PDDClient

        client = PDDClient()
        try:
            all_goods = []
            page = 1
            page_size = min(20, max_results)

            while len(all_goods) < max_results:
                goods_list = await client.search_goods(
                    keyword=keyword,
                    page=page,
                    page_size=page_size,
                )
                if not goods_list:
                    break

                for goods in goods_list:
                    parsed = client.parse_goods(goods)
                    goods_id = parsed["external_id"]

                    # Fetch detail to get goods_sign, sku_specs, service_tags
                    goods_sign = goods.get("goods_sign", "")
                    sku_specs = None
                    service_tags = None

                    if goods_sign:
                        try:
                            detail = await client.get_goods_detail(goods_sign)
                            if detail:
                                sku_list = detail.get("sku_list", [])
                                sku_specs = [
                                    {
                                        "spec": sku.get("spec", ""),
                                        "price": float(sku.get("group_price", 0)) / 100 if sku.get("group_price") else None,
                                        "stock": sku.get("stock", 0),
                                    }
                                    for sku in sku_list
                                ]
                                service_tags = detail.get("service_tags", [])
                                logger.debug(f"Fetched detail for goods_sign={goods_sign}: {len(sku_specs)} SKUs, {len(service_tags)} tags")
                        except Exception as e:
                            logger.warning(f"Failed to fetch detail for goods_sign={goods_sign}: {e}")

                    all_goods.append({
                        "goods_id": goods_id,
                        "goods_sign": goods_sign,
                        "title": parsed["name"],
                        "shop_name": parsed["mall_name"],
                        "price": parsed["group_price"] or 0,
                        "original_price": parsed["single_price"],
                        "url": parsed["external_url"],
                        "image_url": parsed["image_urls"][0] if parsed["image_urls"] else None,
                        "sales_count": self._parse_sales_count(parsed["sales_tip"]),
                        "sku_specs": sku_specs,
                        "service_tags": service_tags,
                    })

                if len(goods_list) < page_size:
                    break
                page += 1

            return all_goods[:max_results]
        finally:
            await client.close()

    async def _run_matching_for_unmatched(self) -> None:
        """Run LLM matching for all unmatched listings."""
        import asyncio

        result = await self.db.execute(
            select(SpuListing).where(SpuListing.match_status == "unmatched")
        )
        unmatched_listings = result.scalars().all()

        if not unmatched_listings:
            return

        # Fetch all active SPUs with categories eagerly loaded
        spu_result = await self.db.execute(
            select(Spu)
            .where(Spu.status == "active")
            .options(selectinload(Spu.category))
        )
        spus = spu_result.scalars().all()

        if not spus:
            logger.warning("No active SPUs found for matching")
            return

        logger.info(f"Running matching for {len(unmatched_listings)} listings against {len(spus)} SPUs")

        auto_linked_spu_ids: set[int] = set()

        for listing in unmatched_listings:
            try:
                # Use asyncio.to_thread to avoid greenlet conflicts with SQLAlchemy async session
                match_result = await asyncio.to_thread(
                    self.matching_service.match_listing_to_spu_sync,
                    listing.title,
                    spus,
                )

                if match_result.confidence >= 0.85:
                    # Auto-link
                    listing.spu_id = match_result.spu_id
                    listing.match_confidence = match_result.confidence
                    listing.match_status = "linked"
                    auto_linked_spu_ids.add(match_result.spu_id)
                    # If SPU has no images, copy from listing
                    matched_spu = next((s for s in spus if s.id == match_result.spu_id), None)
                    if matched_spu is not None and not matched_spu.image_urls and listing.image_url:
                        matched_spu.image_urls = [listing.image_url]
                    logger.debug(f"Auto-linked listing {listing.id} to SPU {match_result.spu_id} (confidence={match_result.confidence:.2f})")
                elif match_result.confidence >= 0.60:
                    # Candidate for review
                    listing.spu_id = match_result.spu_id
                    listing.match_confidence = match_result.confidence
                    listing.match_status = "candidate"
                    logger.debug(f"Candidate listing {listing.id} -> SPU {match_result.spu_id} (confidence={match_result.confidence:.2f})")
                else:
                    # Unmatched
                    listing.match_confidence = match_result.confidence
                    listing.match_status = "unmatched"

            except Exception as e:
                logger.warning(f"Matching failed for listing {listing.id}: {e}")
                listing.match_status = "unmatched"

        await self.db.commit()

        # Update price ranges for auto-linked SPUs
        for spu_id in auto_linked_spu_ids:
            from app.utils.price_utils import update_spu_price_range
            await update_spu_price_range(self.db, spu_id)

    async def _get_matching_stats(self) -> dict[str, int]:
        """Get counts of listings by match status."""
        from sqlalchemy import func

        result = await self.db.execute(
            select(SpuListing.match_status, func.count(SpuListing.id))
            .group_by(SpuListing.match_status)
        )
        counts = {status: count for status, count in result.all()}
        return {
            "auto_linked": counts.get("linked", 0),
            "candidates": counts.get("candidate", 0),
            "unmatched": counts.get("unmatched", 0),
        }

    async def confirm_listings(self, listing_ids: list[int]) -> list[dict]:
        """Confirm candidate listings and link them to their suggested SPUs."""
        from app.utils.price_utils import update_spu_price_range

        result = await self.db.execute(
            select(SpuListing).where(
                SpuListing.id.in_(listing_ids),
                SpuListing.match_status == "candidate",
            )
        )
        listings = result.scalars().all()

        # Collect data before any async DB operations to avoid greenlet conflicts
        listing_data = []
        spu_ids_to_update = set()
        for listing in listings:
            listing_data.append({
                "id": listing.id,
                "spu_id": listing.spu_id,
                "image_url": listing.image_url,
            })
            if listing.spu_id:
                spu_ids_to_update.add(listing.spu_id)

        # Batch update via SQL to avoid ORM flush issues
        if listing_data:
            from sqlalchemy import update
            await self.db.execute(
                update(SpuListing)
                .where(SpuListing.id.in_([d["id"] for d in listing_data]))
                .values(match_status="linked")
            )
            await self.db.commit()

        # Sync image URLs to SPUs that lack images
        for d in listing_data:
            if d["image_url"] and d["spu_id"]:
                spu_result = await self.db.execute(
                    select(Spu).where(Spu.id == d["spu_id"])
                )
                spu = spu_result.scalar_one_or_none()
                if spu and not spu.image_urls:
                    spu.image_urls = [d["image_url"]]
        await self.db.commit()

        # Update price ranges for affected SPUs (outside of ORM object iteration)
        for spu_id in spu_ids_to_update:
            await update_spu_price_range(self.db, spu_id)

        return [
            {"listing_id": d["id"], "status": "linked", "spu_id": d["spu_id"]}
            for d in listing_data
        ]

    async def reject_listings(self, listing_ids: list[int]) -> list[dict]:
        """Reject candidate listings."""
        result = await self.db.execute(
            select(SpuListing).where(
                SpuListing.id.in_(listing_ids),
                SpuListing.match_status == "candidate",
            )
        )
        listings = result.scalars().all()

        listing_data = []
        for listing in listings:
            listing_data.append({
                "id": listing.id,
                "spu_id": listing.spu_id,
            })

        if listing_data:
            from sqlalchemy import update
            await self.db.execute(
                update(SpuListing)
                .where(SpuListing.id.in_([d["id"] for d in listing_data]))
                .values(match_status="rejected")
            )
            await self.db.commit()

        return [
            {"listing_id": d["id"], "status": "rejected", "spu_id": d["spu_id"]}
            for d in listing_data
        ]
