"""Backfill price_min/price_max for all SPUs from their linked listings."""
import asyncio
import sys

sys.path.insert(0, "/home/zxv/code/pet-store/backend")

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.spu import Spu
from app.utils.price_utils import update_spu_price_range


async def backfill_spu_prices():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Spu.id))
        spu_ids = [row[0] for row in result.all()]
        print(f"Found {len(spu_ids)} SPUs to backfill")

    for i, spu_id in enumerate(spu_ids, 1):
        async with AsyncSessionLocal() as db:
            await update_spu_price_range(db, spu_id)
        if i % 50 == 0:
            print(f"Progress: {i}/{len(spu_ids)}")

    print(f"Done. Backfilled prices for {len(spu_ids)} SPUs.")


if __name__ == "__main__":
    asyncio.run(backfill_spu_prices())
