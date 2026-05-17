from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.collection import ExternalProduct
from app.models.product import Product
from app.schemas.collection import PromotionUrlResponse
from app.schemas.common import ApiResponse, Pagination
from app.schemas.product import ProductDetailResponse, ProductFilter, ProductListResponse
from app.services.product_service import ProductService
from app.services.promotion_url_service import PromotionUrlService

router = APIRouter()


@router.get("/products", response_model=ApiResponse[dict])
async def get_products(
    category_id: int | None = Query(None),
    pet_type: str | None = Query(None),
    brand: str | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    sort: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = ProductFilter(
        category_id=category_id,
        pet_type=pet_type,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    service = ProductService(db)
    products, total = await service.get_products(filters)

    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )

    return ApiResponse(
        data={"products": products},
        pagination=pagination,
    )


@router.get("/products/compare", response_model=ApiResponse[dict])
async def compare_products(
    ids: str = Query(..., description="Comma-separated product IDs"),
    db: AsyncSession = Depends(get_db),
):
    product_ids = [int(id) for id in ids.split(",")]
    if len(product_ids) < 2 or len(product_ids) > 4:
        raise HTTPException(status_code=400, detail="Must compare 2-4 products")

    service = ProductService(db)
    products = await service.compare_products(product_ids)
    return ApiResponse(
        data={
            "products": [ProductListResponse.model_validate(p) for p in products],
            "comparison": {
                "dimensions": ["品牌", "价格区间", "适口性", "营养均衡", "性价比"]
            },
        }
    )


@router.get("/products/{product_id}/promotion-url", response_model=ApiResponse[dict])
async def get_promotion_url(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    from loguru import logger

    service = ProductService(db)
    product = await service.get_product_by_id(product_id)
    if not product:
        # Debug: check if product exists at all and what status it has
        raw = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        raw_p = raw.scalar_one_or_none()
        if raw_p:
            logger.warning(f"[promo-url] product_id={product_id} exists but status='{raw_p.status}' not 'active', get_product_by_id returned None")
            specs_preview = dict(list((raw_p.specifications or {}).items())[:5])
            logger.warning(f"[promo-url] product_id={product_id} specifications (first 5 keys): {specs_preview}")
        else:
            logger.warning(f"[promo-url] product_id={product_id} not found in database at all")
        raise HTTPException(status_code=404, detail="Product not found")

    ext_result = await db.execute(
        select(ExternalProduct).where(
            ExternalProduct.product_id == product_id,
            ExternalProduct.platform == "pdd",
        ).limit(1)
    )
    ext = ext_result.scalar_one_or_none()
    if not ext:
        raise HTTPException(status_code=404, detail="No PDD external mapping found")

    goods_sign = (product.specifications or {}).get("pdd_goods_sign", "")
    if not goods_sign:
        raise HTTPException(status_code=400, detail="No goods_sign available for this product")

    pid = ext.pid or settings.PDD_PID
    if not pid:
        raise HTTPException(status_code=400, detail="No PID configured for PDD promotion")
    logger.info(f"[promo-url] product_id={product_id}: using pid={pid!r} (ext.pid={ext.pid!r})")

    promo_service = PromotionUrlService(db)
    try:
        url_data = await promo_service.generate(goods_sign, product_id, pid=pid)
        return ApiResponse(data=PromotionUrlResponse(**url_data).model_dump())
    finally:
        await promo_service.close()


@router.get("/products/{product_id}", response_model=ApiResponse[dict])
async def get_product_detail(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = ProductService(db)
    product = await service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ApiResponse(data={"product": product})
