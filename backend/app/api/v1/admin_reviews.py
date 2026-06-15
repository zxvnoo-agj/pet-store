from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.models.review import Review
from app.models.spu import Spu
from app.schemas.common import ApiResponse, Pagination
from app.schemas.review import (
    AdminReviewCreate,
    AdminReviewReject,
    ReviewSource,
    ReviewStatus,
    serialize_admin_review,
)

router = APIRouter()


@router.get("/admin/reviews", response_model=ApiResponse[dict])
async def admin_list_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    spu_id: int | None = Query(None),
    source: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(Review).options(selectinload(Review.user), selectinload(Review.spu))
    count_query = select(func.count(Review.id))

    if status:
        if status not in {item.value for item in ReviewStatus}:
            raise HTTPException(status_code=400, detail="Invalid review status")
        query = query.where(Review.status == status)
        count_query = count_query.where(Review.status == status)

    if spu_id:
        query = query.where(Review.spu_id == spu_id)
        count_query = count_query.where(Review.spu_id == spu_id)

    if source:
        if source not in {item.value for item in ReviewSource}:
            raise HTTPException(status_code=400, detail="Invalid review source")
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
        data={"reviews": [serialize_admin_review(r) for r in reviews]},
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
        .options(selectinload(Review.user), selectinload(Review.spu))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = ReviewStatus.APPROVED
    review.reject_reason = None
    await db.commit()
    await db.refresh(review)
    logger.info("review_approved", review_id=review.id, spu_id=review.spu_id, admin_id=current_admin.id)
    return ApiResponse(data={"review": serialize_admin_review(review)})


@router.post("/admin/reviews/{review_id}/reject", response_model=ApiResponse[dict])
async def admin_reject_review(
    review_id: int,
    body: AdminReviewReject,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user), selectinload(Review.spu))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.status = ReviewStatus.REJECTED
    review.reject_reason = body.reason
    await db.commit()
    await db.refresh(review)
    logger.info("review_rejected", review_id=review.id, spu_id=review.spu_id, admin_id=current_admin.id)
    return ApiResponse(data={"review": serialize_admin_review(review)})


@router.post("/admin/reviews", response_model=ApiResponse[dict])
async def admin_create_review(
    body: AdminReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    spu = await db.get(Spu, body.spu_id)
    if not spu:
        raise HTTPException(status_code=404, detail="SPU not found")

    review = Review(
        spu_id=body.spu_id,
        rating=body.rating,
        content=body.content,
        images=[],
        tags=[],
        is_recommended=body.is_recommended,
        source=body.source,
        source_url=body.source_url,
        external_note_id=body.external_note_id,
        author=body.author,
        status=ReviewStatus.APPROVED,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    review.spu = spu
    logger.info("review_admin_created", review_id=review.id, spu_id=review.spu_id, source=review.source, admin_id=current_admin.id)
    return ApiResponse(data={"review": serialize_admin_review(review)})


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
