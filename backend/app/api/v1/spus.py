from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse, Pagination
from app.schemas.spu import SpuFilter, SpuMiniProgramListResponse, SpuMiniProgramDetailResponse
from app.services.spu_service import SpuService
from app.services.favorite_service import FavoriteService

router = APIRouter()


@router.get("/spus", response_model=ApiResponse[dict])
async def get_spus(
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
    filters = SpuFilter(
        category_id=category_id,
        pet_type=pet_type,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    service = SpuService(db)
    spus, total = await service.get_spus_for_miniprogram(filters)

    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )

    return ApiResponse(
        data={
            "items": [SpuMiniProgramListResponse.model_validate(s) for s in spus],
            "pagination": pagination,
        }
    )


@router.get("/spus/{spu_id}", response_model=ApiResponse[dict])
async def get_spu_detail(
    spu_id: int,
    current_user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpuService(db)
    spu = await service.get_spu_for_miniprogram(spu_id)
    if not spu:
        raise HTTPException(status_code=404, detail=f"SPU with id {spu_id} not found")
    
    # Check if favorited by current user
    is_favorited = False
    if current_user:
        favorite_service = FavoriteService(db)
        is_favorited = await favorite_service.is_favorited(current_user.id, spu_id)
    
    data = SpuMiniProgramDetailResponse.model_validate(spu)
    response_data = data.model_dump()
    response_data["is_favorited"] = is_favorited
    
    return ApiResponse(data=response_data)


@router.get("/spus/{spu_id}/listings", response_model=ApiResponse[dict])
async def get_spu_listings(
    spu_id: int,
    platform: str | None = Query(None),
    sort: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = SpuService(db)
    listings = await service.get_listings_for_miniprogram(spu_id, platform, sort)
    
    from app.schemas.spu import SpuMiniProgramListingResponse
    return ApiResponse(
        data={
            "items": [SpuMiniProgramListingResponse.model_validate(l) for l in listings],
            "total": len(listings),
        }
    )


@router.get("/spus/{spu_id}/reviews", response_model=ApiResponse[dict])
async def get_spu_reviews(
    spu_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from app.services.review_service import ReviewService
    service = ReviewService(db)
    reviews, total = await service.get_reviews(spu_id, sort=sort, page=page, page_size=page_size)
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
            "pagination": pagination,
        },
    )
