import asyncio
import json
import re
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import AsyncSessionLocal, get_db
from app.models.category import Category
from app.models.collection import ExternalProduct, SearchStrategy
from app.models.data_source import DataFetchJob, DataSource
from app.models.review import Review
from app.models.spu import Spu
from app.schemas.collection import (
    AggregationTriggerResponse,
    CollectionJobResponse,
    DataSourceResponse,
    DataSourceUpdate,
    DiscoveryProgress,
    JobRetryResponse,
    ProductCollectionStatus,
    ProductSeed,
    ProductSeedResponse,
    SchedulerStatus,
    SearchStrategyCreate,
    SearchStrategyResponse,
    XHSCollectResponse,
)
from app.schemas.common import ApiResponse, Pagination
from app.services.llm_analyzer import analyze_review, generate_spu_summary
from app.services.xhs_collector import XHSCollector

router = APIRouter()


def _parse_pdd_goods_id(url: str) -> str | None:
    match = re.search(r"goods_id=(\d+)", url)
    return match.group(1) if match else None


# === 1. Search Strategies ===

@router.get("/admin/collect/strategies", response_model=ApiResponse[dict])
async def list_strategies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    data_source_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(SearchStrategy).order_by(SearchStrategy.created_at.desc())
    count_query = select(func.count(SearchStrategy.id))
    if data_source_id:
        query = query.where(SearchStrategy.data_source_id == data_source_id)
        count_query = count_query.where(SearchStrategy.data_source_id == data_source_id)

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    strategies = result.scalars().all()
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    total_pages = (total + page_size - 1) // page_size

    return ApiResponse(
        data={
            "items": [SearchStrategyResponse.model_validate(s).model_dump() for s in strategies],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
        pagination=Pagination(page=page, page_size=page_size, total=total, total_pages=total_pages),
    )


@router.post("/admin/collect/strategies", status_code=201, response_model=ApiResponse[dict])
async def create_strategy(
    body: SearchStrategyCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    strategy = SearchStrategy(**body.model_dump())
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return ApiResponse(data=SearchStrategyResponse.model_validate(strategy).model_dump())


@router.post("/admin/collect/strategies/{strategy_id}/execute", status_code=202, response_model=ApiResponse[dict])
async def execute_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(SearchStrategy).where(SearchStrategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    raise HTTPException(
        status_code=410,
        detail="Product discovery has been retired after the SPU migration. Use SPU-based collection endpoints.",
    )


@router.delete("/admin/collect/strategies/{strategy_id}", status_code=204)
async def delete_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(SearchStrategy).where(SearchStrategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    await db.delete(strategy)
    await db.commit()


# === 2. Product Collection ===

@router.post("/admin/collect/products/seed", status_code=201, response_model=ApiResponse[dict])
async def seed_product_endpoint(
    body: ProductSeed,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    try:
        goods_id = _parse_pdd_goods_id(body.pdd_url)
        if not goods_id:
            raise HTTPException(status_code=400, detail="Invalid PDD URL: could not extract goods_id")

        existing = await db.execute(
            select(ExternalProduct).where(
                ExternalProduct.platform == "pdd",
                ExternalProduct.external_id == goods_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"SPU with goods_id {goods_id} already exists")

        cat_result = await db.execute(select(Category).where(Category.id == body.category_id))
        category = cat_result.scalar_one_or_none()
        if not category:
            category = Category(name="通用", pet_type=body.pet_type, level=1, sort_order=99)
            db.add(category)
            await db.flush()

        spu = Spu(
            category_id=category.id,
            brand="未知品牌",
            name=body.product_name,
            model="默认规格",
            pet_type=body.pet_type,
            status="pending",
            extra_attrs={"source_platform": "pdd", "source_url": body.pdd_url},
        )
        db.add(spu)
        await db.flush()

        ds_result = await db.execute(select(DataSource).where(DataSource.platform == "pdd").limit(1))
        ds = ds_result.scalar_one_or_none()
        ext = ExternalProduct(
            spu_id=spu.id,
            source_id=ds.id if ds else 1,
            platform="pdd",
            external_id=goods_id,
            external_url=body.pdd_url,
            is_primary=True,
        )
        db.add(ext)
        await db.commit()
        await db.refresh(spu)

        return ApiResponse(
            data=ProductSeedResponse(
                product_id=spu.id,
                status="pending",
                message="SPU seeded. Product enrichment is retired after the SPU migration.",
            ).model_dump()
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/admin/collect/products", response_model=ApiResponse[dict])
async def list_collection_products(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(Spu).order_by(Spu.created_at.desc())
    count_query = select(func.count(Spu.id))
    if status:
        query = query.where(Spu.status == status)
        count_query = count_query.where(Spu.status == status)

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    spus = result.scalars().all()
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    total_pages = (total + page_size - 1) // page_size

    items = []
    for p in spus:
        ext_result = await db.execute(
            select(ExternalProduct).where(
                ExternalProduct.spu_id == p.id,
                ExternalProduct.platform == "pdd",
            ).limit(1)
        )
        ext = ext_result.scalar_one_or_none()
        goods_id = ext.external_id if ext else None
        note = (p.extra_attrs or {}).get("_crawl_note") if p.extra_attrs else None
        items.append(ProductCollectionStatus(
            product_id=p.id, name=p.name, status=p.status,
            brand=p.brand, source_platform="pdd" if ext else None,
            created_at=p.created_at,
            goods_id=goods_id,
            note=note,
        ).model_dump())

    return ApiResponse(
        data={"items": items, "total": total, "page": page, "page_size": page_size},
        pagination=Pagination(page=page, page_size=page_size, total=total, total_pages=total_pages),
    )


@router.post("/admin/collect/products/{product_id}/retry", response_model=ApiResponse[dict])
async def retry_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    raise HTTPException(
        status_code=410,
        detail="Product retry has been retired after the SPU migration.",
    )


@router.get("/admin/collect/products/discovery-progress")
async def discovery_progress(
    job_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    async def event_stream():
        last = None
        for _ in range(600):
            result = await db.execute(select(DataFetchJob).where(DataFetchJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                yield f"event: error\ndata: {json.dumps({'message': 'Job not found'})}\n\n"
                return

            progress = (job.result or {}) if job.status in ("completed", "failed") else (job.result or {})
            stage = job.status if job.status in ("completed", "failed") else (progress.get("stage", "searching"))
            phase = progress.get("phase", "discovery")
            data = DiscoveryProgress(
                found=progress.get("found", 0),
                new=progress.get("new", 0),
                skipped=progress.get("skipped", 0),
                failed=progress.get("failed", 0),
                stage=stage,
                phase=phase,
                total=progress.get("total", 0),
                completed=progress.get("completed", 0),
                enriched=progress.get("enriched", 0),
                total_time_seconds=progress.get("total_time_seconds"),
            )

            current = data.model_dump_json()
            if current != last:
                event = "complete" if job.status == "completed" else ("error" if job.status == "failed" else "progress")
                yield f"event: {event}\ndata: {current}\n\n"
                last = current

            if job.status in ("completed", "failed"):
                return

            await asyncio.sleep(1)

        yield f"event: error\ndata: {json.dumps({'message': 'Timeout waiting for job completion'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# === 3. Collection Jobs ===

@router.get("/admin/collect/jobs", response_model=ApiResponse[dict])
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    job_type: str | None = Query(None),
    data_source_id: int | None = Query(None),
    spu_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(DataFetchJob).order_by(DataFetchJob.created_at.desc())
    count_query = select(func.count(DataFetchJob.id))
    failed_query = select(func.count(DataFetchJob.id)).where(DataFetchJob.status == "failed")

    if status:
        query = query.where(DataFetchJob.status == status)
        count_query = count_query.where(DataFetchJob.status == status)
    if job_type:
        query = query.where(DataFetchJob.job_type == job_type)
        count_query = count_query.where(DataFetchJob.job_type == job_type)
    if data_source_id:
        query = query.where(DataFetchJob.data_source_id == data_source_id)
        count_query = count_query.where(DataFetchJob.data_source_id == data_source_id)
    if spu_id:
        query = query.where(DataFetchJob.spu_id == spu_id)
        count_query = count_query.where(DataFetchJob.spu_id == spu_id)

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    jobs = result.scalars().all()
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    failed_result = await db.execute(failed_query)
    failed_count = failed_result.scalar()
    total_pages = (total + page_size - 1) // page_size

    items = []
    for j in jobs:
        ds_name = None
        if j.data_source_id:
            ds_result = await db.execute(select(DataSource.name).where(DataSource.id == j.data_source_id))
            ds_name = ds_result.scalar_one_or_none()
        items.append(CollectionJobResponse(
            id=j.id, data_source_id=j.data_source_id, data_source_name=ds_name,
            job_type=j.job_type, collection_type=getattr(j, "collection_type", "full"),
            status=j.status, product_id=getattr(j, "product_id", None), spu_id=getattr(j, "spu_id", None),
            params=j.params, result=j.result, error_message=j.error_message,
            started_at=j.started_at, completed_at=j.completed_at, created_at=j.created_at,
        ).model_dump())

    return ApiResponse(
        data={"items": items, "total": total, "page": page, "page_size": page_size, "failed_count": failed_count or 0},
        pagination=Pagination(page=page, page_size=page_size, total=total, total_pages=total_pages),
    )


@router.get("/admin/collect/jobs/{job_id}", response_model=ApiResponse[dict])
async def get_job_detail(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(DataFetchJob).where(DataFetchJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ApiResponse(data=CollectionJobResponse.model_validate(job).model_dump())


@router.post("/admin/collect/jobs/{job_id}/retry", response_model=ApiResponse[dict])
async def retry_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(DataFetchJob).where(DataFetchJob.id == job_id))
    old_job = result.scalar_one_or_none()
    if not old_job:
        raise HTTPException(status_code=404, detail="Job not found")

    new_job = DataFetchJob(
        data_source_id=old_job.data_source_id,
        job_type=old_job.job_type,
        collection_type=getattr(old_job, "collection_type", "incremental"),
        status="pending",
        params=old_job.params,
        spu_id=old_job.spu_id,
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    if new_job.job_type == "pdd_detail_refresh":
        listing_id = (new_job.params or {}).get("listing_id")
        if listing_id:
            asyncio.create_task(_run_pdd_detail_refresh_retry(new_job.id, int(listing_id)))
    elif new_job.job_type == "pdd_listing_search" and new_job.spu_id:
        from app.api.v1.admin_goods import _run_import_for_spu_job
        from app.services.spu_listing_service import ImportJobManager

        params = new_job.params or {}
        memory_job = ImportJobManager.create_job(f"SPU-{new_job.spu_id}")
        asyncio.create_task(
            _run_import_for_spu_job(
                new_job.id,
                memory_job.job_id,
                new_job.spu_id,
                params.get("keyword", ""),
                int(params.get("max_results", 10)),
                params.get("platform", "pdd"),
            )
        )

    return ApiResponse(
        data=JobRetryResponse(
            new_job_id=new_job.id,
            status="pending",
            message="Job retry queued.",
        ).model_dump()
    )


async def _run_pdd_detail_refresh_retry(job_id: int, listing_id: int) -> None:
    from app.services.spu_service import SpuService

    async with AsyncSessionLocal() as db:
        service = SpuService(db)
        await service.refresh_listing_price(job_id, listing_id)


# === 4. XHS Reviews (SPU-based) ===

@router.post("/admin/spus/{spu_id}/xhs-collect", status_code=202, response_model=ApiResponse[dict])
async def trigger_xhs_collect_spu(
    spu_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    from app.models.spu import Spu
    result = await db.execute(select(Spu).where(Spu.id == spu_id))
    spu = result.scalar_one_or_none()
    if not spu:
        raise HTTPException(status_code=404, detail="SPU not found")

    existing_job = await db.execute(
        select(DataFetchJob).where(
            DataFetchJob.spu_id == spu_id,
            DataFetchJob.job_type == "review",
            DataFetchJob.status.in_(["pending", "running"]),
        )
    )
    if existing_job.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="该 SPU 已有进行中的采集任务，请稍后再试")

    ds_result = await db.execute(select(DataSource).where(DataSource.platform == "xiaohongshu").limit(1))
    ds = ds_result.scalar_one_or_none()
    ds_id = ds.id if ds else 2

    job = DataFetchJob(
        data_source_id=ds_id,
        job_type="review",
        status="pending",
        spu_id=spu_id,
        params={"spu_id": spu_id, "spu_name": spu.name, "brand": spu.brand},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(_run_xhs_collection(spu, job.id))

    return ApiResponse(
        data=XHSCollectResponse(
            job_id=job.id, status="pending",
            message=f"XHS review collection queued for SPU {spu_id}.",
        ).model_dump()
    )


@router.get("/admin/spus/{spu_id}/xhs-collect/status", response_model=ApiResponse[dict])
async def get_xhs_collect_status(
    spu_id: int,
    job_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(
        select(DataFetchJob).where(
            DataFetchJob.id == job_id,
            DataFetchJob.spu_id == spu_id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return ApiResponse(
        data={
            "job_id": job.id,
            "status": job.status,
            "result": job.result or {},
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    )


@router.post("/admin/spus/{spu_id}/reviews/summary/regenerate", response_model=ApiResponse[dict])
async def regenerate_spu_review_summary(
    spu_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    from app.models.spu import Spu

    spu = await db.get(Spu, spu_id)
    if not spu:
        raise HTTPException(status_code=404, detail="SPU not found")

    summary = await generate_spu_summary(spu_id, db)
    if not summary:
        raise HTTPException(status_code=400, detail="可用于总结的已审核评价不足")

    spu.ai_review_summary = summary
    await db.commit()
    logger.info("review_summary_regenerated", spu_id=spu_id, admin_id=current_admin.id, review_count=summary.get("review_count"))
    return ApiResponse(data={"summary": summary})


# === 5. Data Sources ===

@router.get("/admin/collect/sources", response_model=ApiResponse[dict])
async def list_data_sources(
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(DataSource).order_by(DataSource.id))
    sources = result.scalars().all()
    return ApiResponse(
        data={"items": [DataSourceResponse.model_validate(s).model_dump() for s in sources]}
    )


@router.patch("/admin/collect/sources/{source_id}", response_model=ApiResponse[dict])
async def update_data_source(
    source_id: int,
    body: DataSourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(DataSource).where(DataSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")

    update_data = body.model_dump(exclude_unset=True)
    if "config" in update_data and update_data["config"]:
        current_config = source.config or {}
        current_config.update(update_data["config"])
        source.config = current_config
        del update_data["config"]

    for key, value in update_data.items():
        setattr(source, key, value)
    await db.commit()
    await db.refresh(source)
    return ApiResponse(data=DataSourceResponse.model_validate(source).model_dump())


# === Scheduler ===

@router.get("/admin/collect/scheduler/status", response_model=ApiResponse[dict])
async def scheduler_status(
    current_admin = Depends(get_current_admin),
):
    from app.scheduler.jobs import scheduler as apscheduler
    jobs = [
        {"id": j.id, "name": j.name, "next_run": str(j.next_run_time) if j.next_run_time else None}
        for j in apscheduler.get_jobs()
    ]
    return ApiResponse(data=SchedulerStatus(running=apscheduler.running, jobs=jobs).model_dump())


@router.post("/admin/collect/scheduler/trigger/{job_id}", response_model=ApiResponse[dict])
async def trigger_job(
    job_id: str,
    current_admin = Depends(get_current_admin),
):
    from app.scheduler.jobs import scheduler as apscheduler
    job = apscheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Scheduler job '{job_id}' not found")
    apscheduler.modify_job(job_id, next_run_time=datetime.now(UTC))
    return ApiResponse(data={"job_id": job_id, "status": "triggered"})


# === Tag Aggregation ===

@router.post("/admin/collect/products/{product_id}/aggregate-tags", response_model=ApiResponse[dict])
async def trigger_aggregation(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    spu = await db.get(Spu, product_id)
    if not spu:
        raise HTTPException(status_code=404, detail="SPU not found")
    summary = await generate_spu_summary(product_id, db)
    if summary:
        spu.ai_review_summary = summary
        await db.commit()
    return ApiResponse(
        data=AggregationTriggerResponse(
            product_id=product_id,
            message="SPU review aggregation completed." if summary else "Not enough approved reviews to aggregate.",
        ).model_dump()
    )


async def _run_xhs_collection(spu, job_id: int):
    async with AsyncSessionLocal() as db:
        job = await db.get(DataFetchJob, job_id)
        if not job:
            return
        job.status = "running"
        job.started_at = datetime.now(UTC)
        await db.commit()

    collector = XHSCollector()
    try:
        collected_notes, failed_notes = await collector.collect_product_reviews(
            spu_id=spu.id, spu_name=spu.name, brand=spu.brand
        )
        new_count = 0

        async with AsyncSessionLocal() as db:
            for note in collected_notes:
                ext_id = note.get("external_note_id", "")
                if not ext_id:
                    continue

                existing = await db.execute(
                    select(Review).where(Review.external_note_id == ext_id)
                )
                if existing.scalar_one_or_none():
                    continue

                try:
                    analysis = await analyze_review(
                        title=note.get("title", ""),
                        content=note.get("content", ""),
                        comments=note.get("comments", []),
                    )
                except Exception as e:
                    logger.warning(f"LLM analysis failed for note {ext_id}: {e}")
                    analysis = {
                        "pros": [], "cons": [],
                        "recommendation": "中性", "confidence": 0.0,
                        "summary": "", "cat_mood": "",
                    }

                tags = []
                is_recommended = None
                if analysis.get("recommendation") == "推荐":
                    is_recommended = True
                elif analysis.get("recommendation") == "不推荐":
                    is_recommended = False
                tags = analysis.get("pros", []) + analysis.get("cons", [])

                rating = 5
                if is_recommended is False:
                    rating = 1
                elif analysis.get("recommendation") == "中性":
                    rating = 3

                review = Review(
                    spu_id=spu.id,
                    rating=rating,
                    content=note.get("content", ""),
                    images=note.get("images", []),
                    tags=tags,
                    is_recommended=is_recommended,
                    source="xhs_auto",
                    source_url=f"https://www.xiaohongshu.com/explore/{ext_id}",
                    external_note_id=ext_id,
                    author=note.get("author", ""),
                    note_published_at=note.get("note_published_at"),
                    note_likes=note.get("likes"),
                    status="approved",
                    llm_review_result=analysis,
                )
                db.add(review)
                new_count += 1

            job = await db.get(DataFetchJob, job_id)
            if job:
                total_notes = len(collected_notes) + len(failed_notes)
                if failed_notes and new_count > 0:
                    job.status = "partial_success"
                elif new_count == 0 and failed_notes:
                    job.status = "failed"
                else:
                    job.status = "completed"
                job.result = {
                    "new": new_count,
                    "total": total_notes,
                    "failed": len(failed_notes),
                    "errors": failed_notes[:10],
                }
                job.completed_at = datetime.now(UTC)
                await db.commit()

            from app.models.spu import Spu
            summary = await generate_spu_summary(spu.id, db)
            if summary:
                spu_from_db = await db.get(Spu, spu.id)
                if spu_from_db:
                    spu_from_db.ai_review_summary = summary
                    await db.commit()
                    logger.info(f"SPU {spu.id}: ai_review_summary saved ({summary.get('review_count')} reviews)")
            else:
                logger.info(f"SPU {spu.id}: insufficient reviews for summary, field left null")
    except Exception as e:
        logger.error(f"XHS collection job {job_id} failed: {e}")
        async with AsyncSessionLocal() as db:
            job = await db.get(DataFetchJob, job_id)
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.completed_at = datetime.now(UTC)
                await db.commit()
    finally:
        await collector.close()
