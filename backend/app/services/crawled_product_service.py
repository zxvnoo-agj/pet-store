from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crawled_product import CrawledProduct
from app.schemas.crawled_product import CrawledProductListResponse, CrawledProductResponse


async def get_crawled_product_by_goods_id(
    db: AsyncSession, goods_id: str
) -> CrawledProduct | None:
    result = await db.execute(
        select(CrawledProduct).where(CrawledProduct.goods_id == goods_id)
    )
    return result.scalar_one_or_none()


async def get_crawled_product_by_id(
    db: AsyncSession, crawled_id: int
) -> CrawledProduct | None:
    result = await db.execute(
        select(CrawledProduct).where(CrawledProduct.id == crawled_id)
    )
    return result.scalar_one_or_none()


async def list_crawled_products(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    goods_id: str | None = None,
    import_status: str | None = None,
    file_source: str | None = None,
) -> CrawledProductListResponse:
    query = select(CrawledProduct).order_by(CrawledProduct.created_at.desc())
    count_query = select(func.count(CrawledProduct.id))

    if goods_id:
        query = query.where(CrawledProduct.goods_id == goods_id)
        count_query = count_query.where(CrawledProduct.goods_id == goods_id)
    if import_status:
        query = query.where(CrawledProduct.import_status == import_status)
        count_query = count_query.where(CrawledProduct.import_status == import_status)
    if file_source:
        query = query.where(CrawledProduct.file_source.ilike(f"%{file_source}%"))
        count_query = count_query.where(CrawledProduct.file_source.ilike(f"%{file_source}%"))

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    items = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    return CrawledProductListResponse(
        items=[CrawledProductResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


async def match_goods_ids(
    db: AsyncSession, goods_ids: list[str]
) -> dict[str, CrawledProduct]:
    if not goods_ids:
        return {}

    result = await db.execute(
        select(CrawledProduct).where(
            CrawledProduct.goods_id.in_(goods_ids),
            CrawledProduct.import_status == "active",
        )
    )
    matched = result.scalars().all()
    return {cp.goods_id: cp for cp in matched}
