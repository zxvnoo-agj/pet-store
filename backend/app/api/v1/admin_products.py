from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.models.collection import ExternalProduct, PriceHistory
from app.models.product import Product
from app.models.review import Review
from app.schemas.common import ApiResponse, Pagination
from app.schemas.product import ProductCreate, ProductUpdate, ProductDetailResponse
from app.services.pdd_client import PDDClient

router = APIRouter()


@router.get("/admin/products", response_model=ApiResponse[dict])
async def admin_list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(Product).options(selectinload(Product.category))
    count_query = select(func.count(Product.id))

    if status:
        query = query.where(Product.status == status)
        count_query = count_query.where(Product.status == status)

    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
        count_query = count_query.where(Product.name.ilike(f"%{search}%"))

    query = query.order_by(Product.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    products = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )

    return ApiResponse(
        data={"products": [ProductDetailResponse.model_validate(p) for p in products]},
        pagination=pagination,
    )


@router.post("/admin/products", response_model=ApiResponse[dict])
async def admin_create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    product = Product(**data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return ApiResponse(data={"product": ProductDetailResponse.model_validate(product)})


@router.get("/admin/products/{product_id}", response_model=ApiResponse[dict])
async def admin_get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ApiResponse(data={"product": ProductDetailResponse.model_validate(product)})


@router.put("/admin/products/{product_id}", response_model=ApiResponse[dict])
async def admin_update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return ApiResponse(data={"product": ProductDetailResponse.model_validate(product)})


@router.post("/admin/products/{product_id}/refresh-ddk", response_model=ApiResponse[dict])
async def admin_refresh_ddk(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(Product).options(selectinload(Product.category)).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    goods_sign = (product.specifications or {}).get("pdd_goods_sign", "")
    if not goods_sign:
        specs_preview = dict(list((product.specifications or {}).items())[:5])
        logger.warning(f"[refresh-ddk] product_id={product_id}: no pdd_goods_sign in specifications (first 5 keys: {specs_preview}, status={product.status})")
        raise HTTPException(status_code=400, detail="No goods_sign available for this product")

    pdd = PDDClient()
    try:
        detail = await pdd.get_goods_detail(goods_sign)
        if not detail:
            raise HTTPException(status_code=502, detail="DDK API returned empty response")

        parsed = pdd.parse_goods(detail)
        specs = product.specifications or {}
        for key in ("group_price", "single_price", "coupon_discount", "coupon_start_time", "coupon_end_time", "sales_tip", "goods_eval_score", "goods_eval_count", "promotion_rate", "mall_name", "mall_cps", "category_id", "category_name"):
            if parsed.get(key) is not None:
                specs[key] = parsed[key]
        product.specifications = specs
        product.price_min = parsed.get("group_price") or product.price_min
        product.price_max = parsed.get("single_price") or product.price_max
        product.min_group_price = int((parsed.get("group_price") or 0) * 100)
        product.min_normal_price = int((parsed.get("single_price") or 0) * 100)
        if parsed.get("promotion_rate") is not None:
            product.promotion_rate = int(parsed["promotion_rate"])
        if parsed.get("name"):
            product.goods_name = parsed["name"][:255]
            product.name = parsed["name"][:128]
        if parsed.get("brand"):
            product.brand = parsed["brand"][:64]
        if parsed.get("mall_name"):
            product.mall_name = parsed["mall_name"][:128]

        if product.status == "pending":
            product.status = "active"
            logger.info(f"[admin] DDK refresh set product_id={product.id} status to active")

        await db.commit()
        await db.refresh(product)
        logger.info(f"[admin] DDK refreshed product_id={product.id}: promotion_rate={product.promotion_rate}, price_min={product.price_min}")
        return ApiResponse(data={"product": ProductDetailResponse.model_validate(product).model_dump(), "updated": True})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] DDK refresh failed for product_id={product_id}: {e}")
        raise HTTPException(status_code=502, detail=f"DDK API error: {e}")
    finally:
        await pdd.close()


@router.delete("/admin/products/{product_id}", response_model=ApiResponse[dict])
async def admin_delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.execute(select(ExternalProduct).where(ExternalProduct.product_id == product_id))
    for ext in (await db.execute(select(ExternalProduct).where(ExternalProduct.product_id == product_id))).scalars().all():
        await db.delete(ext)
    for ph in (await db.execute(select(PriceHistory).where(PriceHistory.product_id == product_id))).scalars().all():
        await db.delete(ph)
    for r in (await db.execute(select(Review).where(Review.product_id == product_id))).scalars().all():
        await db.delete(r)
    await db.delete(product)
    await db.commit()
    return ApiResponse(data={"message": "Product deleted"})


@router.post("/admin/products/batch-delete", response_model=ApiResponse[dict])
async def admin_batch_delete_products(
    product_ids: list[int],
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    if not product_ids:
        raise HTTPException(status_code=400, detail="No product IDs provided")

    # Fetch all target products
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = result.scalars().all()
    found_ids = {p.id for p in products}
    missing_ids = set(product_ids) - found_ids

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Products not found: {sorted(missing_ids)}"
        )

    # Delete related records for all products
    for product in products:
        for ext in (await db.execute(select(ExternalProduct).where(ExternalProduct.product_id == product.id))).scalars().all():
            await db.delete(ext)
        for ph in (await db.execute(select(PriceHistory).where(PriceHistory.product_id == product.id))).scalars().all():
            await db.delete(ph)
        for r in (await db.execute(select(Review).where(Review.product_id == product.id))).scalars().all():
            await db.delete(r)
        await db.delete(product)

    await db.commit()
    return ApiResponse(data={
        "message": f"Deleted {len(products)} products",
        "deleted_ids": sorted(found_ids)
    })
