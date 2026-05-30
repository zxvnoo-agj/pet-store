from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse, Pagination
from app.schemas.spu import SpuFilter, SpuMiniProgramListResponse, SpuMiniProgramDetailResponse, PromotionUrlRequest, PromotionUrlResponse
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


@router.get("/spus/compare", response_model=ApiResponse[dict])
async def compare_spus(
    ids: str = Query(..., description="Comma-separated SPU IDs"),
    db: AsyncSession = Depends(get_db),
):
    spu_ids = [int(i) for i in ids.split(",")]
    if len(spu_ids) < 2:
        raise HTTPException(status_code=400, detail="Must compare at least 2 SPUs")
    if len(spu_ids) > 4:
        raise HTTPException(status_code=400, detail="Can compare at most 4 SPUs")

    service = SpuService(db)
    spus = await service.compare_spus(spu_ids)

    return ApiResponse(
        data={
            "products": [
                {
                    "id": s.id,
                    "name": s.name,
                    "brand": s.brand,
                    "pet_type": s.pet_type,
                    "description": s.description,
                    "ingredients": s.ingredients or [],
                    "nutrition": s.nutrition or {},
                    "price_range": {"min": float(s.price_min) if s.price_min else 0, "max": float(s.price_max) if s.price_max else 0},
                    "image_urls": s.image_urls or [],
                    "rating": getattr(s, "avg_rating", 0),
                    "pros": s.pros or [],
                    "cons": s.cons or [],
                    "review_count": getattr(s, "review_count", 0),
                }
                for s in spus
            ],
            "comparison": {
                "dimensions": ["品牌", "适用宠物", "价格区间", "主要成分", "营养分析", "优点", "缺点"],
            },
        }
    )


@router.get("/spus/search", response_model=ApiResponse[dict])
async def search_spus(
    keywords: str = Query(..., description="Comma-separated search keywords"),
    pet_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search SPUs by keywords."""
    service = SpuService(db)
    # Use the first keyword or combined keywords for search
    query_str = keywords.replace(",", " ")
    spus, total = await service.search_spus(
        query_str=query_str,
        pet_type=pet_type,
        page=page,
        page_size=page_size,
    )

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
            "total": total,
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


@router.get("/spus/{spu_id}/links", response_model=ApiResponse[dict])
async def get_spu_links(
    spu_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get product links for an SPU with detailed SKU and service tag info."""
    from app.services.spu_service import SpuService
    service = SpuService(db)
    listings = await service.get_listings_for_miniprogram(spu_id, platform=None, sort=None)
    
    from app.schemas.spu import SpuMiniProgramListingResponse
    return ApiResponse(
        data={
            "items": [SpuMiniProgramListingResponse.model_validate(l) for l in listings],
            "total": len(listings),
        }
    )


@router.post("/spus/{spu_id}/promotion-url", response_model=ApiResponse[dict])
async def generate_promotion_url(
    spu_id: int,
    request: PromotionUrlRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate on-demand promotion URL for a listing with dual caching."""
    from app.services.spu_service import SpuService
    from app.services.promotion_url_service import PromotionUrlService
    
    # Verify listing exists and belongs to this SPU
    spu_service = SpuService(db)
    listing = await spu_service.get_listing_by_id(request.listing_id)
    if not listing or listing.spu_id != spu_id:
        raise HTTPException(status_code=404, detail="Listing not found for this SPU")
    
    if not listing.goods_sign:
        raise HTTPException(status_code=400, detail="商品暂不可用")
    
    promo_service = PromotionUrlService(db)
    try:
        result = await promo_service.generate(
            goods_sign=listing.goods_sign,
            spu_id=spu_id,
        )
        return ApiResponse(data=result)
    except Exception as e:
        error_msg = str(e)
        if "暂不可用" in error_msg:
            raise HTTPException(status_code=400, detail=error_msg)
        elif "繁忙" in error_msg:
            raise HTTPException(status_code=429, detail=error_msg)
        else:
            raise HTTPException(status_code=500, detail="生成推广链接失败，请稍后重试")
