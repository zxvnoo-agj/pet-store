from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryResponse
from app.schemas.common import ApiResponse, Pagination

router = APIRouter()


@router.get("/admin/categories", response_model=ApiResponse[dict])
async def admin_list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    pet_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(Category)
    count_query = select(func.count(Category.id))

    if pet_type:
        query = query.where(Category.pet_type == pet_type)
        count_query = count_query.where(Category.pet_type == pet_type)

    query = query.order_by(Category.sort_order.asc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    categories = result.scalars().all()

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
        data={"categories": [CategoryResponse.model_validate(c) for c in categories]},
        pagination=pagination,
    )


@router.post("/admin/categories", response_model=ApiResponse[dict])
async def admin_create_category(
    data: CategoryResponse,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    category = Category(**data.model_dump(exclude={"id", "children"}))
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return ApiResponse(data={"category": CategoryResponse.model_validate(category)})


@router.get("/admin/categories/{category_id}", response_model=ApiResponse[dict])
async def admin_get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return ApiResponse(data={"category": CategoryResponse.model_validate(category)})


@router.put("/admin/categories/{category_id}", response_model=ApiResponse[dict])
async def admin_update_category(
    category_id: int,
    data: CategoryResponse,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    for key, value in data.model_dump(exclude={"id", "children"}).items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)
    return ApiResponse(data={"category": CategoryResponse.model_validate(category)})


@router.delete("/admin/categories/{category_id}", response_model=ApiResponse[dict])
async def admin_delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.delete(category)
    await db.commit()
    return ApiResponse(data={"message": "Category deleted"})
