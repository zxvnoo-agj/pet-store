import asyncio
import json
from datetime import UTC, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.admin_deps import get_current_admin
from app.core.database import AsyncSessionLocal, get_db
from app.models.collection import ExternalProduct, PriceHistory, SearchStrategy
from app.models.data_source import DataFetchJob, DataSource
from app.models.product import Product
from app.models.review import Review
from app.schemas.collection import (
    AggregationTriggerResponse,
    CollectionJobList,
    CollectionJobResponse,
    DataSourceList,
    DataSourceResponse,
    DataSourceUpdate,
    DiscoveryProgress,
    JobRetryResponse,
    ProductCollectionList,
    ProductCollectionStatus,
    ProductSeed,
    ProductSeedResponse,
    RetryResponse,
    SchedulerStatus,
    SearchStrategyCreate,
    SearchStrategyList,
    SearchStrategyResponse,
    StrategyExecuteResponse,
    XHSCollectResponse,
)
from app.schemas.common import ApiResponse, Pagination
from app.services.collection_service import (
    aggregate_product_tags,
    discover_products,
    parse_pdd_goods_id,
    retry_product_collection,
    run_post_discovery_enrichment,
    seed_product,
    update_product_prices,
)
from app.services.pdd_client import PDDClient
from app.services.xhs_collector import XHSCollector
from app.services.llm_analyzer import analyze_review

router = APIRouter()


# === 1. Search Strategies ===

@router.get("/admin/collect/strategies", response_model=ApiResponse[dict])
async def list_strategies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    data_source_id: Optional[int] = Query(None),
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

    job = DataFetchJob(
        data_source_id=strategy.data_source_id,
        job_type="discovery",
        status="pending",
        params={"strategy_id": strategy_id, "keyword": " ".join(strategy.keywords or [])},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(_run_discovery(strategy_id, job.id))

    return ApiResponse(
        data=StrategyExecuteResponse(
            job_id=job.id,
            status="pending",
            message="Strategy execution started. Products will be discovered and enriched asynchronously.",
        ).model_dump()
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
        product = await seed_product(db, body.category_id, body.product_name, body.pdd_url, pet_type=body.pet_type)
        return ApiResponse(
            data=ProductSeedResponse(
                product_id=product.id,
                status="pending",
                message="Product seeded. Data collection will begin shortly.",
            ).model_dump()
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/admin/collect/products", response_model=ApiResponse[dict])
async def list_collection_products(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    query = select(Product).order_by(Product.created_at.desc())
    count_query = select(func.count(Product.id))
    if status:
        query = query.where(Product.status == status)
        count_query = count_query.where(Product.status == status)

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    products = result.scalars().all()
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    total_pages = (total + page_size - 1) // page_size

    items = []
    for p in products:
        ext_result = await db.execute(
            select(ExternalProduct).where(
                ExternalProduct.product_id == p.id,
                ExternalProduct.platform == "pdd",
            ).limit(1)
        )
        ext = ext_result.scalar_one_or_none()
        goods_id = ext.external_id if ext else None
        note = (p.specifications or {}).get("_crawl_note") if p.specifications else None
        items.append(ProductCollectionStatus(
            product_id=p.id, name=p.name, status=p.status,
            brand=p.brand, source_platform=p.source_platform,
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
    try:
        product = await retry_product_collection(db, product_id)
        return ApiResponse(
            data=RetryResponse(
                product_id=product.id,
                status="pending",
                message="Product collection retry triggered.",
            ).model_dump()
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


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
    status: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    data_source_id: Optional[int] = Query(None),
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
            status=j.status, product_id=getattr(j, "product_id", None),
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
        status="pending",
        params=old_job.params,
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    return ApiResponse(
        data=JobRetryResponse(
            new_job_id=new_job.id,
            status="pending",
            message="Job retry queued.",
        ).model_dump()
    )


# === 4. XHS Reviews ===

@router.post("/admin/collect/products/{product_id}/xhs-collect", status_code=202, response_model=ApiResponse[dict])
async def trigger_xhs_collect(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ds_result = await db.execute(select(DataSource).where(DataSource.platform == "xiaohongshu").limit(1))
    ds = ds_result.scalar_one_or_none()
    ds_id = ds.id if ds else 2

    job = DataFetchJob(
        data_source_id=ds_id,
        job_type="review",
        status="pending",
        params={"product_id": product_id, "product_name": product.name, "brand": product.brand},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(_run_xhs_collection(product, job.id))

    return ApiResponse(
        data=XHSCollectResponse(
            job_id=job.id, status="pending",
            message=f"XHS review collection queued for product {product_id}.",
        ).model_dump()
    )


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
    await aggregate_product_tags(db, product_id=product_id)
    return ApiResponse(
        data=AggregationTriggerResponse(
            product_id=product_id,
            message="Tag aggregation completed.",
        ).model_dump()
    )


# === Internal helpers ===

async def _run_discovery(strategy_id: int, job_id: int):
    async with AsyncSessionLocal() as db:
        job = await db.get(DataFetchJob, job_id)
        if not job:
            return
        strategy = await db.get(SearchStrategy, strategy_id)
        if not strategy:
            return

        job.status = "running"
        job.started_at = datetime.now(UTC)
        await db.commit()

        try:
            result = await discover_products(db, strategy)

            matched_for_003: list[dict] = result.pop("matched_for_003", [])  # type: ignore
            asyncio.create_task(
                run_post_discovery_enrichment(
                    db, strategy_id, job_id, matched_for_003
                )
            )

            job.status = "completed"
            job.result = result
            job.completed_at = datetime.now(UTC)

            strategy.last_run_at = datetime.now(UTC)
            strategy.last_result = result
            await db.commit()
        except Exception as e:
            logger.error(f"Discovery job {job_id} failed: {type(e).__name__}: {e}")
            job.status = "failed"
            job.error_message = f"{type(e).__name__}: {e}"
            job.completed_at = datetime.now(UTC)
            await db.commit()


async def _run_xhs_collection(product: Product, job_id: int):
    async with AsyncSessionLocal() as db:
        job = await db.get(DataFetchJob, job_id)
        if not job:
            return
        job.status = "running"
        job.started_at = datetime.now(UTC)
        await db.commit()

    collector = XHSCollector()
    try:
        notes = await collector.collect_product_reviews(product.name, product.brand)
        new_count = 0

        async with AsyncSessionLocal() as db:
            for note in notes:
                ext_id = note.get("external_note_id", "")
                if not ext_id:
                    continue

                existing = await db.execute(
                    select(Review).where(Review.external_note_id == ext_id)
                )
                if existing.scalar_one_or_none():
                    continue

                analysis = await analyze_review(
                    title=note.get("title", ""),
                    content=note.get("content", ""),
                    comments=note.get("comments", []),
                )

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
                    product_id=product.id,
                    rating=rating,
                    content=note.get("content", ""),
                    images=note.get("images", []),
                    tags=tags,
                    is_recommended=is_recommended,
                    source="crawled",
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
                job.status = "completed"
                job.result = {"new": new_count, "total": len(notes)}
                job.completed_at = datetime.now(UTC)
                await db.commit()
            logger.info(f"XHS collection job {job_id}: {new_count} new reviews from {len(notes)} notes")
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
