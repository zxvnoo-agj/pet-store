from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.schemas.common import ApiResponse, Pagination
from app.schemas.spu import SpuCreate, SpuFilter, SpuResponse, SpuUpdate
from app.schemas.spu_listing import SpuListingResponse, LinkListingRequest
from app.services.spu_service import SpuService

router = APIRouter()


@router.get("/admin/goods/spus", response_model=ApiResponse[dict])
async def admin_list_spus(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: int | None = Query(None),
    pet_type: str | None = Query(None),
    brand: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    filters = SpuFilter(
        page=page,
        page_size=page_size,
        category_id=category_id,
        pet_type=pet_type,
        brand=brand,
        status=status,
        search=search,
    )
    service = SpuService(db)
    spus, total = await service.list_spus(filters)

    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )

    return ApiResponse(
        data={
            "items": [SpuResponse.model_validate(s) for s in spus],
            "total": total,
        },
        pagination=pagination,
    )


@router.post("/admin/goods/spus", response_model=ApiResponse[dict])
async def admin_create_spu(
    data: SpuCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    try:
        spu = await service.create_spu(data)
        return ApiResponse(data={"spu": SpuResponse.model_validate(spu)})
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/admin/goods/spus/{spu_id}", response_model=ApiResponse[dict])
async def admin_get_spu(
    spu_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    spu = await service.get_spu(spu_id)
    if not spu:
        raise HTTPException(status_code=404, detail="SPU not found")
    return ApiResponse(data={"spu": SpuResponse.model_validate(spu)})


@router.put("/admin/goods/spus/{spu_id}", response_model=ApiResponse[dict])
async def admin_update_spu(
    spu_id: int,
    data: SpuUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    spu = await service.update_spu(spu_id, data)
    if not spu:
        raise HTTPException(status_code=404, detail="SPU not found")
    return ApiResponse(data={"spu": SpuResponse.model_validate(spu)})


@router.delete("/admin/goods/spus/{spu_id}", response_model=ApiResponse[dict])
async def admin_delete_spu(
    spu_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    deleted = await service.delete_spu(spu_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="SPU not found")
    return ApiResponse(data={"message": "SPU deleted"})


@router.get("/admin/goods/spus/{spu_id}/listings", response_model=ApiResponse[dict])
async def admin_get_spu_listings(
    spu_id: int,
    match_status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    listings = await service.get_listings_by_spu(spu_id, match_status)
    return ApiResponse(
        data={
            "items": [SpuListingResponse.model_validate(l) for l in listings],
            "total": len(listings),
        }
    )


@router.post("/admin/goods/listings/{listing_id}/link", response_model=ApiResponse[dict])
async def admin_link_listing(
    listing_id: int,
    data: LinkListingRequest,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    listing = await service.link_listing(listing_id, data.spu_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return ApiResponse(data={"listing": SpuListingResponse.model_validate(listing)})


@router.post("/admin/goods/listings/{listing_id}/unlink", response_model=ApiResponse[dict])
async def admin_unlink_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    listing = await service.unlink_listing(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return ApiResponse(data={"listing": SpuListingResponse.model_validate(listing)})


@router.get("/admin/goods/matching-queue", response_model=ApiResponse[dict])
async def admin_get_matching_queue(
    match_status: str = Query("candidate"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)
    listings, total = await service.get_matching_queue(match_status, page, page_size)

    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )

    return ApiResponse(
        data={
            "items": [SpuListingResponse.model_validate(l) for l in listings],
            "total": total,
        },
        pagination=pagination,
    )


@router.post("/admin/goods/matching-queue/confirm", response_model=ApiResponse[dict])
async def admin_confirm_candidates(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    listing_ids = data.get("listing_ids", [])
    if not listing_ids:
        raise HTTPException(status_code=400, detail="No listing IDs provided")

    service = SpuService(db)
    count = await service.confirm_candidates(listing_ids)
    return ApiResponse(data={"confirmed": count})


@router.post("/admin/goods/matching-queue/reject", response_model=ApiResponse[dict])
async def admin_reject_candidates(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    listing_ids = data.get("listing_ids", [])
    if not listing_ids:
        raise HTTPException(status_code=400, detail="No listing IDs provided")

    service = SpuService(db)
    count = await service.reject_candidates(listing_ids)
    return ApiResponse(data={"rejected": count})
