from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from app.core.database import AsyncSessionLocal
from app.models.data_source import DataFetchJob, DataSource
from app.scheduler.fetch_jobs import run_fetch_job
from app.services.collection_service import aggregate_product_tags, update_product_prices
from app.services.xhs_collector import XHSCollector

scheduler = AsyncIOScheduler()


async def sync_data_sources():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(
            select(DataSource).where(DataSource.is_active.is_(True))
        )
        sources = result.scalars().all()

        for source in sources:
            if source.last_sync_at:
                elapsed = (datetime.now(UTC) - source.last_sync_at).total_seconds() / 60
                if elapsed < source.sync_interval_minutes:
                    continue

            job = DataFetchJob(
                data_source_id=source.id,
                job_type="price",
                status="pending",
                params={"source_name": source.name},
            )
            db.add(job)
            await db.commit()
            await db.refresh(job)

            logger.info(f"Scheduled fetch job {job.id} for source {source.name}")

            try:
                await run_fetch_job(db, job)
            except Exception as e:
                logger.error(f"Fetch job {job.id} failed: {e}")


async def hourly_price_update():
    async with AsyncSessionLocal() as db:
        result = await update_product_prices(db)
        logger.info(f"Hourly price update completed: {result}")


async def daily_review_fetch():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from app.models.product import Product

        product_result = await db.execute(
            select(Product).where(
                Product.status == "active",
                Product.brand.isnot(None),
            )
        )
        products = product_result.scalars().all()
        collector = XHSCollector()
        total_new = 0

        try:
            for product in products[:20]:
                notes = await collector.collect_product_reviews(product.name, product.brand, max_notes=5)
                from app.models.review import Review
                for note in notes:
                    ext_id = note.get("external_note_id", "")
                    if not ext_id:
                        continue
                    existing = await db.execute(
                        select(Review).where(Review.external_note_id == ext_id)
                    )
                    if existing.scalar_one_or_none():
                        continue
                    review = Review(
                        product_id=product.id,
                        rating=3,
                        content=note.get("content", "")[:2000],
                        source="crawled",
                        external_note_id=ext_id,
                        author=note.get("author", ""),
                        note_published_at=note.get("note_published_at"),
                        note_likes=note.get("likes"),
                        status="approved",
                    )
                    db.add(review)
                    total_new += 1
                await db.commit()
        finally:
            await collector.close()

        logger.info(f"Daily XHS review fetch completed: {total_new} new reviews")


async def daily_tag_aggregation():
    async with AsyncSessionLocal() as db:
        await aggregate_product_tags(db)
        logger.info("Daily tag aggregation completed")


def start_scheduler():
    scheduler.add_job(
        sync_data_sources,
        trigger=IntervalTrigger(minutes=5),
        id="sync_data_sources",
        replace_existing=True,
    )
    scheduler.add_job(
        hourly_price_update,
        trigger=IntervalTrigger(minutes=60),
        id="hourly_price_update",
        replace_existing=True,
    )
    scheduler.add_job(
        daily_review_fetch,
        trigger=CronTrigger(hour=3, minute=0),
        id="daily_review_fetch",
        replace_existing=True,
    )
    scheduler.add_job(
        daily_tag_aggregation,
        trigger=CronTrigger(hour=4, minute=0),
        id="daily_tag_aggregation",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started with collection jobs")


def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("APScheduler shutdown")
