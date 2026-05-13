from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse, Pagination
from app.schemas.product import ProductDetailResponse, ProductFilter, ProductListResponse
from app.services.product_service import ProductService

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
