from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.models.product import Product
from app.schemas.common import ApiResponse, Pagination
from app.schemas.product import ProductCreate, ProductDetailResponse

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
    query = select(Product)
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
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ApiResponse(data={"product": ProductDetailResponse.model_validate(product)})


@router.put("/admin/products/{product_id}", response_model=ApiResponse[dict])
async def admin_update_product(
    product_id: int,
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in data.model_dump().items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return ApiResponse(data={"product": ProductDetailResponse.model_validate(product)})


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

    await db.delete(product)
    await db.commit()
    return ApiResponse(data={"message": "Product deleted"})
