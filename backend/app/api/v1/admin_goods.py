from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.schemas.common import ApiResponse, Pagination
from app.schemas.spu import SpuCreate, SpuFilter, SpuResponse, SpuUpdate
from app.schemas.spu_listing import SpuListingResponse, LinkListingRequest
from app.services.spu_service import SpuService
from app.services.spu_listing_service import ImportJobManager, SpuListingService

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
    tier: str = Query("all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    service = SpuService(db)

    if tier == "all":
        # Return both candidates and unmatched
        candidates, candidates_total = await service.get_matching_queue("candidate", page, page_size)
        unmatched, unmatched_total = await service.get_matching_queue("unmatched", page, page_size)

        return ApiResponse(
            data={
                "candidates": {
                    "total": candidates_total,
                    "items": [SpuListingResponse.model_validate(l) for l in candidates],
                },
                "unmatched": {
                    "total": unmatched_total,
                    "items": [SpuListingResponse.model_validate(l) for l in unmatched],
                },
            }
        )
    else:
        match_status = tier if tier in ("candidate", "unmatched", "rejected") else "candidate"
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

    service = SpuListingService(db)
    details = await service.confirm_listings(listing_ids)
    return ApiResponse(
        data={
            "processed": len(listing_ids),
            "linked": len(details),
            "failed": len(listing_ids) - len(details),
            "details": details,
        }
    )


@router.post("/admin/goods/matching-queue/reject", response_model=ApiResponse[dict])
async def admin_reject_candidates(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    listing_ids = data.get("listing_ids", [])
    if not listing_ids:
        raise HTTPException(status_code=400, detail="No listing IDs provided")

    service = SpuListingService(db)
    details = await service.reject_listings(listing_ids)
    return ApiResponse(
        data={
            "processed": len(listing_ids),
            "rejected": len(details),
            "failed": len(listing_ids) - len(details),
            "details": details,
        }
    )


@router.post("/admin/goods/listings/import", response_model=ApiResponse[dict])
async def admin_import_listings(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    keyword = data.get("keyword", "")
    max_results = data.get("max_results", 100)
    platform = data.get("source", "pdd_ddk").replace("_ddk", "")

    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword is required")

    service = SpuListingService(db)
    job = await service.import_and_match(
        keyword=keyword,
        max_results=max_results,
        platform=platform,
    )

    return ApiResponse(
        data={
            "job_id": job.job_id,
            "status": job.status,
            "message": "Import and matching job started",
            "estimated_duration": "2-5 minutes",
        }
    )


@router.get("/admin/goods/jobs/{job_id}", response_model=ApiResponse[dict])
async def admin_get_job_status(
    job_id: str,
    current_admin = Depends(get_current_admin),
):
    job = ImportJobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return ApiResponse(
        data={
            "job_id": job.job_id,
            "status": job.status,
            "result": {
                "total_imported": job.total_imported,
                "auto_linked": job.auto_linked,
                "candidates": job.candidates,
                "unmatched": job.unmatched,
                "high_confidence_count": job.auto_linked,
                "medium_confidence_count": job.candidates,
                "low_confidence_count": job.unmatched,
            },
            "started_at": job.started_at,
            "completed_at": job.completed_at,
        }
    )
