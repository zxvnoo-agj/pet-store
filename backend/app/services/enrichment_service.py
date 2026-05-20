from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.services.crawled_product_service import get_crawled_product_by_goods_id
from app.services.llm_extractor import extract_from_crawled_content
from app.services.pdd_client import PDDClient

LLM_SPEC_KEYS = (
    "brand",
    "spec_weight",
    "spec_form",
    "origin",
    "shelf_life",
    "age_range",
    "special_formula",
    "top_8_ingredients",
    "nutrition_highlight",
)


def _calculate_llm_status(extracted: list[str]) -> str:
    filled = len(extracted)
    if filled >= 7:
        return "success"
    if filled >= 3:
        return "partial"
    if filled > 0:
        return "partial"
    return "failed"


def _merge_llm_fields(product: Product, llm_fields: dict[str, Any]) -> list[str]:
    extracted: list[str] = []
    specs = product.specifications or {}
    for key in LLM_SPEC_KEYS:
        val = llm_fields.get(key)
        if val is not None:
            specs[key] = val
            extracted.append(key)
    product.specifications = specs

    for col in ("brand", "spec_form", "age_range"):
        val = llm_fields.get(col)
        if val:
            if col == "brand":
                setattr(product, col, str(val)[:64])
            elif col == "spec_form":
                setattr(product, col, str(val)[:16])
            else:
                setattr(product, col, str(val)[:32])
    return extracted


def _sort_enrich_detail(parsed: dict) -> dict[str, Any]:
    return {
        "group_price": parsed.get("group_price"),
        "single_price": parsed.get("single_price"),
        "coupon_discount": parsed.get("coupon_discount"),
        "coupon_start_time": parsed.get("coupon_start_time"),
        "coupon_end_time": parsed.get("coupon_end_time"),
        "sales_tip": parsed.get("sales_tip"),
        "goods_eval_score": parsed.get("goods_eval_score"),
        "goods_eval_count": parsed.get("goods_eval_count"),
    }


async def enrich_product(
    db: AsyncSession,
    product_id: int,
    goods_id: str,
    goods_sign: str = "",
) -> dict[str, Any]:
    """Run 003 enrichment pipeline for a single product.

    Steps:
        1. Match goods_id in crawled_products
        2. Extract fields via LLM from crawled content
        3. Call PDD goods.detail for remaining fields
        4. Write fields to product record
        5. Update product status
        6. Return per-product result dict
    """
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        raise ValueError(f"Product {product_id} not found")

    product.status = "enriching"
    await db.commit()

    crawled = await get_crawled_product_by_goods_id(db, goods_id)
    if not crawled:
        product.status = "pending"
        specs = product.specifications or {}
        specs["_crawl_note"] = "爬取数据未覆盖"
        product.specifications = specs
        await db.commit()
        return {
            "goods_id": goods_id,
            "product_id": product_id,
            "match_status": "unmatched",
            "llm_status": "skipped",
            "llm_fields_extracted": [],
            "llm_fields_missing": list(LLM_SPEC_KEYS),
            "detail_status": "skipped",
            "final_status": "pending",
        }

    try:
        llm_fields = await extract_from_crawled_content(
            crawled.raw_text or "",
            images=crawled.images or None,
        )
        extracted = _merge_llm_fields(product, llm_fields)
        await db.commit()
        missing = [f for f in LLM_SPEC_KEYS if f not in extracted]
        llm_status = _calculate_llm_status(extracted)
    except Exception as e:
        logger.warning(f"LLM extraction failed for product {product_id}: {e}")
        extracted = []
        missing = list(LLM_SPEC_KEYS)
        llm_status = "failed"
        llm_fields = {}

    detail_status = "skipped"
    if goods_sign:
        try:
            pdd = PDDClient()
            detail = await pdd.get_goods_detail(goods_sign)
            if detail:
                parsed = pdd.parse_goods(detail)
                detail_data = _sort_enrich_detail(parsed)
                specs = product.specifications or {}
                for key, val in detail_data.items():
                    if val is not None:
                        specs[key] = val
                product.specifications = specs
                product.price_min = parsed.get("group_price") or product.price_min
                product.price_max = parsed.get("single_price") or product.price_max
                if parsed.get("promotion_rate") is not None:
                    product.promotion_rate = int(parsed["promotion_rate"])
                if parsed.get("name"):
                    product.goods_name = parsed["name"][:255]
                    product.name = parsed["name"][:128]
                if parsed.get("brand"):
                    product.brand = parsed["brand"][:64]
                if parsed.get("mall_name"):
                    product.mall_name = parsed["mall_name"][:128]
                gallery = parsed.get("gallery_urls", [])
                if gallery:
                    product.gallery_urls = gallery
                detail_imgs = parsed.get("detail_img_urls", [])
                if detail_imgs:
                    product.detail_img_urls = detail_imgs
                service_tags = parsed.get("service_tags", [])
                if service_tags:
                    product.service_tags = service_tags
                await db.commit()
                detail_status = "success"
            await pdd.close()
        except Exception as e:
            logger.warning(f"PDD detail failed for product {product_id}: {e}")
            detail_status = "failed"
    else:
        logger.info(f"PDD detail skipped for product {product_id}: no goods_sign")

    product.status = "active"
    await db.commit()

    return {
        "goods_id": goods_id,
        "product_id": product_id,
        "match_status": "matched",
        "llm_status": llm_status,
        "llm_fields_extracted": extracted,
        "llm_fields_missing": missing,
        "detail_status": detail_status,
        "final_status": "active",
    }
