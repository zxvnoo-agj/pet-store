from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.common import ApiResponse, Pagination
from app.schemas.review import ReviewListResponse, ReviewCreate
from app.services.review_service import ReviewService

router = APIRouter()


@router.get("/products/{product_id}/reviews", response_model=ApiResponse[dict])
async def get_product_reviews(
    product_id: int,
    rating: Optional[int] = Query(None),
    sort: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = ReviewService(db)
    reviews, total = await service.get_reviews(product_id, rating, sort, page, page_size)
    summary = await service.get_review_summary(product_id)
    
    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )
    
    return ApiResponse(
        data={
            "reviews": reviews,
            "summary": summary,
        },
        pagination=pagination,
    )
