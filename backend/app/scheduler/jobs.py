from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from app.core.database import AsyncSessionLocal
from app.models.data_source import DataFetchJob, DataSource
from app.scheduler.fetch_jobs import run_fetch_job

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


def start_scheduler():
    scheduler.add_job(
        sync_data_sources,
        trigger=IntervalTrigger(minutes=5),
        id="sync_data_sources",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started")


def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("APScheduler shutdown")
