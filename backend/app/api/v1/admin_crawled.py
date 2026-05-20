import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import AsyncSessionLocal, get_db
from app.models.collection import ExternalProduct
from app.models.data_source import DataFetchJob
from app.models.product import Product
from app.schemas.common import ApiResponse
from app.schemas.crawled_product import (
    CrawledProductResponse,
    ImportRequest,
)
from app.services.crawled_product_service import (
    get_crawled_product_by_goods_id,
    list_crawled_products,
)
from app.services.enrichment_service import enrich_product
from app.services.txt_importer import import_from_directory

router = APIRouter()


@router.post("/admin/collect/crawled/import", response_model=ApiResponse[dict])
async def import_crawled_data(
    body: ImportRequest = ImportRequest(),
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Import crawled product data from txt files in pet-store/pdd/ directory."""
    result = await import_from_directory(db, max_files=body.max_files)
    logger.info(
        f"Admin {current_admin.id} triggered import: "
        f"{result.total_files} files, {result.new_records} new, "
        f"{result.updated_records} updated, {result.failed_files} failed"
    )
    return ApiResponse(data=result.model_dump())


@router.get("/admin/collect/crawled/products")
async def get_crawled_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    goods_id: str | None = Query(None),
    import_status: str | None = Query(None),
    file_source: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """List crawled products with pagination and filtering."""
    result = await list_crawled_products(
        db,
        page=page,
        page_size=page_size,
        goods_id=goods_id,
        import_status=import_status,
        file_source=file_source,
    )
    return ApiResponse(data=result.model_dump())


@router.get("/admin/collect/crawled/products/{goods_id}")
async def get_crawled_product_detail(
    goods_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Get full detail of a single crawled product by goods_id."""
    product = await get_crawled_product_by_goods_id(db, goods_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Crawled product with goods_id {goods_id} not found")
    response = CrawledProductResponse.model_validate(product)
    return ApiResponse(data=response.model_dump())


@router.post("/admin/collect/products/{product_id}/rematch")
async def rematch_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Manually trigger re-matching for a single product (FR-012)."""
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    ext_result = await db.execute(
        select(ExternalProduct).where(
            ExternalProduct.product_id == product_id,
            ExternalProduct.platform == "pdd",
        ).limit(1)
    )
    ext = ext_result.scalar_one_or_none()
    if not ext or not ext.external_id:
        raise HTTPException(
            status_code=400,
            detail=f"Product {product_id} does not have a linked goods_id in external_products",
        )

    goods_id = ext.external_id
    goods_sign = (product.specifications or {}).get("pdd_goods_sign", "")
    crawled = await get_crawled_product_by_goods_id(db, goods_id)

    if not crawled:
        return ApiResponse(data={
            "product_id": product_id,
            "goods_id": goods_id,
            "matched": False,
            "status": product.status,
            "message": "Product not found in crawled database. Status remains pending.",
        })

    logger.info(f"Rematch triggered: product_id={product_id}, goods_id={goods_id}")
    asyncio.create_task(_run_rematch_enrichment(product_id, goods_id, goods_sign))

    return ApiResponse(data={
        "product_id": product_id,
        "goods_id": goods_id,
        "matched": True,
        "status": "enriching",
        "message": "Product matched in crawled database. Enrichment started.",
    })


async def _run_rematch_enrichment(product_id: int, goods_id: str, goods_sign: str):
    async with AsyncSessionLocal() as db:
        try:
            result = await enrich_product(db, product_id, goods_id, goods_sign)
            logger.info(
                f"Rematch enrichment complete: product_id={product_id}, "
                f"match={result.get('match_status')}, "
                f"llm={result.get('llm_status')}, "
                f"final={result.get('final_status')}"
            )
        except Exception as e:
            logger.error(f"Rematch enrichment failed for product {product_id}: {e}")
            r = await db.execute(select(Product).where(Product.id == product_id))
            p = r.scalar_one_or_none()
            if p:
                p.status = "failed"
                await db.commit()


@router.get("/admin/collect/enrichment/logs")
async def list_enrichment_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """List enrichment task logs (job_type='enrich_match')."""
    query = select(DataFetchJob).where(DataFetchJob.job_type == "enrich_match")
    count_query = select(func.count(DataFetchJob.id)).where(DataFetchJob.job_type == "enrich_match")

    if status:
        query = query.where(DataFetchJob.status == status)
        count_query = count_query.where(DataFetchJob.status == status)

    query = query.order_by(DataFetchJob.created_at.desc())
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    jobs = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    items = []
    for j in jobs:
        res = j.result or {}
        items.append({
            "id": j.id,
            "job_type": j.job_type,
            "status": j.status,
            "params": j.params,
            "result": {
                "total_discovered": res.get("total_discovered", 0),
                "matched": res.get("matched", 0),
                "unmatched": res.get("unmatched", 0),
                "llm_success": res.get("llm_success", 0),
                "llm_partial": res.get("llm_partial", 0),
                "llm_failed": res.get("llm_failed", 0),
                "detail_success": res.get("detail_success", 0),
                "detail_failed": res.get("detail_failed", 0),
                "llm_field_completion_rate": res.get("llm_field_completion_rate", 0.0),
            } if isinstance(res, dict) else {},
            "error_message": j.error_message,
            "started_at": j.started_at,
            "completed_at": j.completed_at,
            "created_at": j.created_at,
        })

    return ApiResponse(data={
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.get("/admin/collect/enrichment/logs/{job_id}")
async def get_enrichment_log_detail(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Get full detail of a single enrichment task including per-product breakdown."""
    result = await db.execute(
        select(DataFetchJob).where(
            DataFetchJob.id == job_id,
            DataFetchJob.job_type == "enrich_match",
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Enrichment log not found")

    res = job.result or {}
    products = res.get("products", []) if isinstance(res, dict) else []

    return ApiResponse(data={
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "params": job.params,
        "result": {
            "total_discovered": res.get("total_discovered", 0) if isinstance(res, dict) else 0,
            "matched": res.get("matched", 0) if isinstance(res, dict) else 0,
            "unmatched": res.get("unmatched", 0) if isinstance(res, dict) else 0,
            "llm_success": res.get("llm_success", 0) if isinstance(res, dict) else 0,
            "llm_partial": res.get("llm_partial", 0) if isinstance(res, dict) else 0,
            "llm_failed": res.get("llm_failed", 0) if isinstance(res, dict) else 0,
            "detail_success": res.get("detail_success", 0) if isinstance(res, dict) else 0,
            "detail_failed": res.get("detail_failed", 0) if isinstance(res, dict) else 0,
            "llm_field_completion_rate": res.get("llm_field_completion_rate", 0.0) if isinstance(res, dict) else 0.0,
            "products": products,
        } if isinstance(res, dict) else {},
        "error_message": job.error_message,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "created_at": job.created_at,
    })
