import asyncio
import json
import uuid
from dataclasses import dataclass
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.spu import Spu
from app.models.spu_listing import SpuListing
from app.services.spu_matching_service import MatchingResult, SpuMatchingService


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

    async def import_and_match(
        self,
        keyword: str,
        max_results: int = 100,
        platform: str = "pdd",
    ) -> ImportJob:
        """Import listings from DDK API and run auto-matching.

        Steps:
            1. Create job record
            2. Fetch listings from DDK API
            3. Save new listings to database
            4. Run LLM matching against all SPUs
            5. Classify into auto-linked/candidate/unmatched
            6. Update job status
        """
        job = ImportJobManager.create_job(keyword)
        ImportJobManager.update_job(job.job_id, status="running")

        try:
            # Step 1: Fetch listings from DDK API
            listings_data = await self._fetch_listings(keyword, max_results, platform)
            logger.info(f"Import job {job.job_id}: fetched {len(listings_data)} listings")

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
                    spu_id=0,  # Will be updated after matching
                    platform=platform,
                    shop_name=item.get("shop_name", ""),
                    goods_id=item.get("goods_id"),
                    title=item.get("title", ""),
                    price=item.get("price", 0),
                    original_price=item.get("original_price"),
                    url=item.get("url", ""),
                    image_url=item.get("image_url"),
                    sales_count=item.get("sales_count"),
                    match_status="unmatched",
                )
                self.db.add(listing)
                imported_count += 1

            await self.db.commit()
            logger.info(f"Import job {job.job_id}: saved {imported_count} new listings")

            # Step 3: Run matching for new unmatched listings
            await self._run_matching_for_unmatched()

            # Step 4: Count results by tier
            stats = await self._get_matching_stats()
            ImportJobManager.update_job(
                job.job_id,
                status="completed",
                total_imported=imported_count,
                auto_linked=stats["auto_linked"],
                candidates=stats["candidates"],
                unmatched=stats["unmatched"],
                completed_at=__import__("datetime").datetime.utcnow().isoformat(),
            )

        except Exception as e:
            logger.error(f"Import job {job.job_id} failed: {e}")
            ImportJobManager.update_job(
                job.job_id,
                status="failed",
                error=str(e),
                completed_at=__import__("datetime").datetime.utcnow().isoformat(),
            )

        return job

    async def _fetch_listings(
        self, keyword: str, max_results: int, platform: str
    ) -> list[dict]:
        """Fetch listings from DDK API."""
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
                    all_goods.append({
                        "goods_id": parsed["external_id"],
                        "title": parsed["name"],
                        "shop_name": parsed["mall_name"],
                        "price": parsed["group_price"] or 0,
                        "original_price": parsed["single_price"],
                        "url": parsed["external_url"],
                        "image_url": parsed["image_urls"][0] if parsed["image_urls"] else None,
                        "sales_count": int(parsed["sales_tip"].replace("+", "").replace("万", "0000")) if parsed["sales_tip"] else None,
                    })

                if len(goods_list) < page_size:
                    break
                page += 1

            return all_goods[:max_results]
        finally:
            await client.close()

    async def _run_matching_for_unmatched(self) -> None:
        """Run LLM matching for all unmatched listings."""
        result = await self.db.execute(
            select(SpuListing).where(SpuListing.match_status == "unmatched")
        )
        unmatched_listings = result.scalars().all()

        if not unmatched_listings:
            return

        # Fetch all active SPUs for matching
        spu_result = await self.db.execute(
            select(Spu).where(Spu.status == "active")
        )
        spus = spu_result.scalars().all()

        if not spus:
            logger.warning("No active SPUs found for matching")
            return

        logger.info(f"Running matching for {len(unmatched_listings)} listings against {len(spus)} SPUs")

        for listing in unmatched_listings:
            try:
                match_result = await self.matching_service.match_listing_to_spu(
                    listing_title=listing.title,
                    spus=spus,
                )

                if match_result.confidence >= 0.85:
                    # Auto-link
                    listing.spu_id = match_result.spu_id
                    listing.match_confidence = match_result.confidence
                    listing.match_status = "linked"
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

        details = []
        for listing in listings:
            listing.match_status = "linked"
            await update_spu_price_range(self.db, listing.spu_id)
            details.append({
                "listing_id": listing.id,
                "status": "linked",
                "spu_id": listing.spu_id,
            })

        await self.db.commit()
        return details

    async def reject_listings(self, listing_ids: list[int]) -> list[dict]:
        """Reject candidate listings."""
        result = await self.db.execute(
            select(SpuListing).where(
                SpuListing.id.in_(listing_ids),
                SpuListing.match_status == "candidate",
            )
        )
        listings = result.scalars().all()

        details = []
        for listing in listings:
            listing.match_status = "rejected"
            details.append({
                "listing_id": listing.id,
                "status": "rejected",
                "spu_id": listing.spu_id,
            })

        await self.db.commit()
        return details
