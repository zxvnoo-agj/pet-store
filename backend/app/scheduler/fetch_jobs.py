from datetime import UTC, datetime

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_source import DataFetchJob


async def run_fetch_job(db: AsyncSession, job: DataFetchJob):
    job.status = "running"
    job.started_at = datetime.now(UTC)
    await db.commit()

    try:
        logger.info(f"Running fetch job {job.id} for source {job.data_source_id}")

        # Placeholder for actual JD/Taobao API integration
        # In production, this would call the actual e-commerce APIs
        job.result = {
            "status": "success",
            "message": "Fetch completed (placeholder)",
            "items_processed": 0,
        }
        job.status = "completed"
        job.completed_at = datetime.now(UTC)

    except Exception as e:
        logger.error(f"Fetch job {job.id} failed: {e}")
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(job)
