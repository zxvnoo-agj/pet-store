from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.schemas.common import ApiResponse, Pagination
from app.schemas.spu import SpuCreate, SpuFilter, SpuResponse, SpuUpdate
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
