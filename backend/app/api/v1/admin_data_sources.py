from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.models.data_source import DataFetchJob, DataSource
from app.schemas.common import ApiResponse, Pagination

router = APIRouter()


@router.get("/admin/data-sources", response_model=ApiResponse[dict])
async def admin_list_data_sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(DataSource).order_by(DataSource.created_at.desc())
    count_query = select(func.count(DataSource.id))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    sources = result.scalars().all()

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
        data={"sources": [{
            "id": s.id,
            "name": s.name,
            "platform": s.platform,
            "is_active": s.is_active,
            "last_sync_at": s.last_sync_at,
            "sync_interval_minutes": s.sync_interval_minutes,
        } for s in sources]},
        pagination=pagination,
    )


@router.post("/admin/data-sources", response_model=ApiResponse[dict])
async def admin_create_data_source(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    source = DataSource(
        name=data["name"],
        platform=data["platform"],
        config=data.get("config", {}),
        sync_interval_minutes=data.get("sync_interval_minutes", 60),
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return ApiResponse(data={"source": {"id": source.id, "name": source.name}})


@router.get("/admin/data-sources/{source_id}", response_model=ApiResponse[dict])
async def admin_get_data_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(DataSource).where(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    return ApiResponse(data={"source": {
        "id": source.id,
        "name": source.name,
        "platform": source.platform,
        "config": source.config,
        "is_active": source.is_active,
    }})


@router.put("/admin/data-sources/{source_id}", response_model=ApiResponse[dict])
async def admin_update_data_source(
    source_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(DataSource).where(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")

    if "name" in data:
        source.name = data["name"]
    if "config" in data:
        source.config = data["config"]
    if "is_active" in data:
        source.is_active = data["is_active"]
    if "sync_interval_minutes" in data:
        source.sync_interval_minutes = data["sync_interval_minutes"]

    await db.commit()
    await db.refresh(source)
    return ApiResponse(data={"source": {"id": source.id, "name": source.name}})


@router.delete("/admin/data-sources/{source_id}", response_model=ApiResponse[dict])
async def admin_delete_data_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(DataSource).where(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")

    await db.delete(source)
    await db.commit()
    return ApiResponse(data={"message": "Data source deleted"})


@router.get("/admin/data-fetch-jobs", response_model=ApiResponse[dict])
async def admin_list_fetch_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(DataFetchJob)
    count_query = select(func.count(DataFetchJob.id))

    if status:
        query = query.where(DataFetchJob.status == status)
        count_query = count_query.where(DataFetchJob.status == status)

    query = query.order_by(DataFetchJob.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    jobs = result.scalars().all()

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
        data={"jobs": [{
            "id": j.id,
            "data_source_id": j.data_source_id,
            "job_type": j.job_type,
            "status": j.status,
            "result": j.result,
            "error_message": j.error_message,
            "started_at": j.started_at,
            "completed_at": j.completed_at,
        } for j in jobs]},
        pagination=pagination,
    )
