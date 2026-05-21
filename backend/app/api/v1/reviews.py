from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse, Pagination
from app.services.review_service import ReviewService

router = APIRouter()


@router.get("/spus/{spu_id}/reviews", response_model=ApiResponse[dict])
async def get_spu_reviews(
    spu_id: int,
    rating: int | None = Query(None),
    sort: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    reviews, total = await service.get_reviews(spu_id, rating, sort, page, page_size)
    summary = await service.get_review_summary(spu_id)

    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )

    return ApiResponse(
        data={
            "items": reviews,
            "summary": summary,
        },
        pagination=pagination,
    )
