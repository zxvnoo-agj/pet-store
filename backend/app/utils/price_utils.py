from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spu import Spu
from app.models.spu_listing import SpuListing


async def update_spu_price_range(db: AsyncSession, spu_id: int) -> None:
    result = await db.execute(
        select(
            func.min(SpuListing.price).label("price_min"),
            func.max(SpuListing.price).label("price_max"),
        )
        .where(
            SpuListing.spu_id == spu_id,
            SpuListing.match_status == "linked",
        )
    )
    row = result.one_or_none()

    await db.execute(
        select(Spu).where(Spu.id == spu_id)
    )
    if row:
        await db.execute(
            Spu.__table__.update()
            .where(Spu.id == spu_id)
            .values(
                price_min=row.price_min,
                price_max=row.price_max,
            )
        )
        await db.commit()
