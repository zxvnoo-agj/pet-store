from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.models.review import Review
from app.schemas.common import ApiResponse, Pagination
from app.schemas.review import AdminReviewResponse, ReviewResponse

router = APIRouter()


@router.get("/admin/reviews", response_model=ApiResponse[dict])
async def admin_list_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    product_id: int | None = Query(None),
    source: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(Review).options(selectinload(Review.user), selectinload(Review.product))
    count_query = select(func.count(Review.id))

    if status:
        query = query.where(Review.status == status)
        count_query = count_query.where(Review.status == status)

    if product_id:
        query = query.where(Review.product_id == product_id)
        count_query = count_query.where(Review.product_id == product_id)

    if source:
        query = query.where(Review.source == source)
        count_query = count_query.where(Review.source == source)

    query = query.order_by(Review.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    reviews = result.scalars().all()

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
        data={"reviews": [AdminReviewResponse.model_validate(r) for r in reviews]},
        pagination=pagination,
    )


@router.post("/admin/reviews/{review_id}/approve", response_model=ApiResponse[dict])
async def admin_approve_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user), selectinload(Review.product))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = "approved"
    await db.commit()
    await db.refresh(review, ["id", "product_id", "user_id", "rating", "content", "images", "tags", "is_recommended", "source", "source_url", "helpful_count", "status", "llm_review_result", "created_at", "updated_at"])
    return ApiResponse(data={"review": ReviewResponse.model_validate(review)})


@router.post("/admin/reviews/{review_id}/reject", response_model=ApiResponse[dict])
async def admin_reject_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user), selectinload(Review.product))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = "rejected"
    await db.commit()
    await db.refresh(review, ["id", "product_id", "user_id", "rating", "content", "images", "tags", "is_recommended", "source", "source_url", "helpful_count", "status", "llm_review_result", "created_at", "updated_at"])
    return ApiResponse(data={"review": ReviewResponse.model_validate(review)})


@router.delete("/admin/reviews/{review_id}", response_model=ApiResponse[dict])
async def admin_delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.delete(review)
    await db.commit()
    return ApiResponse(data={"message": "Review deleted"})
