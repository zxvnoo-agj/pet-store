import asyncio
import json
import re
from datetime import UTC, datetime
from typing import Any, Optional

from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.category import Category
from app.models.collection import ExternalProduct, PriceHistory, SearchStrategy
from app.models.data_source import DataFetchJob, DataSource
from app.models.product import Product
from app.services.llm_extractor import extract_product_fields
from app.services.pdd_client import PDDClient
from app.services.pdd_crawler import ConservativePDDCrawler
from app.services.vision_service import QwenVLClient


def parse_pdd_goods_id(url: str) -> Optional[str]:
    match = re.search(r"goods_id=(\d+)", url)
    return match.group(1) if match else None


async def discover_products(
    db: AsyncSession,
    strategy: SearchStrategy,
    progress_callback: Optional[callable] = None,
) -> dict[str, int]:
    pdd = PDDClient()
    found = 0
    new_count = 0
    skipped = 0
    failed = 0
    page = 1
    page_size = min(strategy.max_items, 100)
    pending_enrich: list[tuple[int, str]] = []

    try:
        while found < strategy.max_items:
            goods_list = await pdd.search_goods(
                keyword=" ".join(strategy.keywords or []),
                page=page,
                page_size=page_size,
                opt_id=strategy.opt_id,
                price_min=strategy.price_min,
                price_max=strategy.price_max,
                sort_type=strategy.sort_type,
            )

            if not goods_list:
                break

            logger.info(f"[discover] Page {page}: API returned {len(goods_list)} goods")

            for goods in goods_list:
                if found >= strategy.max_items:
                    break

                goods_id = str(goods.get("goods_id", ""))
                if not goods_id:
                    failed += 1
                    continue

                existing = await db.execute(
                    select(ExternalProduct).where(
                        ExternalProduct.platform == "pdd",
                        ExternalProduct.external_id == goods_id,
                    )
                )
                if existing.scalar_one_or_none():
                    skipped += 1
                    found += 1
                    continue

                try:
                    parsed = pdd.parse_goods(goods)
                    goods_sign = goods.get("goods_sign", "")
                    logger.info(f"[discover] Raw API goods_id={goods_id}: "
                                f"name={parsed['name'][:60]}, brand={parsed['brand']}, "
                                f"group_price={parsed['group_price']}, single_price={parsed['single_price']}, "
                                f"coupon_discount={parsed['coupon_discount']}, sales_tip={parsed['sales_tip']}, "
                                f"category_name={parsed['category_name']}, "
                                f"goods_sign={goods_sign!r}")
                    pdd_cat_name = parsed.get("category_name", "")
                    cat_result = await db.execute(
                        select(Category).where(Category.name.ilike(f"%{pdd_cat_name}%")).limit(1)
                    )
                    cat = cat_result.scalar_one_or_none()
                    if not cat:
                        cat_result = await db.execute(select(Category).limit(1))
                        cat = cat_result.scalar_one_or_none()
                    if not cat:
                        cat = Category(name="通用", pet_type="cat", level=1, sort_order=99)
                        db.add(cat)
                        await db.flush()
                    category_id = cat.id

                    specifications = {k: v for k, v in parsed.items() if k not in ("external_id", "external_url", "name", "brand", "description", "image_urls", "category_id", "category_name")}
                    if goods_sign:
                        specifications["pdd_goods_sign"] = goods_sign

                    product = Product(
                        category_id=category_id,
                        name=parsed["name"][:128] if parsed.get("name") else "",
                        brand=parsed.get("brand") or None,
                        description=parsed.get("description"),
                        image_urls=parsed.get("image_urls", []),
                        source_platform="pdd",
                        source_url=parsed.get("external_url", ""),
                        status="pending",
                        specifications=specifications,
                    )
                    db.add(product)
                    await db.flush()

                    ext = ExternalProduct(
                        product_id=product.id,
                        source_id=strategy.data_source_id,
                        platform="pdd",
                        external_id=goods_id,
                        external_url=parsed.get("external_url", ""),
                        pid=pdd.pid,
                        is_primary=True,
                    )
                    db.add(ext)
                    new_count += 1
                    found += 1

                    logger.info(f"[discover] Inserted product id={product.id}: "
                                f"name={product.name[:60]}, brand={product.brand}, "
                                f"category_id={product.category_id}, "
                                f"external_id={ext.external_id}, "
                                f"specifications={json.dumps(specifications, ensure_ascii=False)}")

                    pending_enrich.append((product.id, goods_sign))

                except Exception as e:
                    logger.error(f"Failed to process goods {goods_id}: {e}")
                    failed += 1

                if progress_callback:
                    await progress_callback(found, new_count, skipped, failed, "searching")

                page += 1
                await asyncio.sleep(2)

        await db.commit()
    finally:
        await pdd.close()

    for pid, sign in pending_enrich:
        asyncio.create_task(_enrich_product(pid, sign))

    return {"new": new_count, "skipped": skipped, "failed": failed, "found": found}


async def _enrich_product(product_id: int, goods_sign: str = ""):
    pdd = PDDClient()
    try:
        async with AsyncSessionLocal() as db:
            product_result = await db.execute(select(Product).where(Product.id == product_id))
            product = product_result.scalar_one_or_none()
            if not product:
                return

            logger.info(f"[enrich] START product_id={product.id}: status={product.status}, "
                        f"specs_keys={list((product.specifications or {}).keys())}, "
                        f"param_goods_sign={goods_sign!r}")

            product.status = "enriching"
            await db.commit()

            ext_result = await db.execute(
                select(ExternalProduct).where(
                    ExternalProduct.product_id == product_id,
                    ExternalProduct.platform == "pdd",
                ).limit(1)
            )
            ext = ext_result.scalar_one_or_none()
            goods_id = ext.external_id if ext else ""

            if not goods_sign:
                goods_sign = (product.specifications or {}).get("pdd_goods_sign", "")

            # Step 1: Playwright crawl (uses share URL when available)
            playwright_data = None
            share_url = ext.external_url if ext else ""
            try:
                crawler = ConservativePDDCrawler()
                playwright_data = await crawler.crawl_product(goods_id, url=share_url)
                await crawler.close()
            except Exception as e:
                logger.warning(f"[enrich] Step 1 (Playwright) failed for product {product_id}: {e}")

            if playwright_data:
                product.goods_name = playwright_data.get("goods_name", "")[:255] or None
                product.mall_name = playwright_data.get("mall_name", "")[:128] or None
                gallery = playwright_data.get("gallery_urls", [])
                if gallery:
                    product.gallery_urls = gallery
                detail_imgs = playwright_data.get("detail_img_urls", [])
                if detail_imgs:
                    product.detail_img_urls = detail_imgs
                service_tags = playwright_data.get("service_tags", [])
                if service_tags:
                    product.service_tags = service_tags
                await db.commit()
                logger.info(f"[enrich] Step 1 (Playwright) done product_id={product.id}: "
                            f"gallery={len(gallery)}, detail={len(detail_imgs)}")

            # Step 2: LLM title extraction
            fields = await extract_product_fields(product.name, product.description or "")
            logger.info(f"[enrich] Step 2 (LLM) product_id={product.id}: {json.dumps(fields, ensure_ascii=False)}")
            specs = product.specifications or {}
            llm_spec_keys = ("brand", "spec_weight", "spec_form", "origin", "shelf_life", "age_range", "special_formula", "top_8_ingredients", "nutrition_highlight", "ingredients", "pros", "cons", "rating_overall")
            specs.update({k: v for k, v in fields.items() if v is not None and k in llm_spec_keys})
            product.specifications = specs

            for col in ("brand", "spec_form", "age_range"):
                val = fields.get(col)
                if val:
                    setattr(product, col, str(val)[:64] if col == "brand" else str(val)[:16] if col == "spec_form" else str(val)[:32])

            if fields.get("pros"):
                product.pros = fields["pros"]
            if fields.get("cons"):
                product.cons = fields["cons"]
            if fields.get("ingredients"):
                product.ingredients = fields["ingredients"]
            if fields.get("rating_overall") is not None:
                ratings = product.ratings or {}
                ratings["overall"] = fields["rating_overall"]
                product.ratings = ratings
            await db.commit()

            # Step 3: Vision LLM ingredient analysis
            try:
                images = product.detail_img_urls or product.gallery_urls or []
                if images:
                    vision = QwenVLClient()
                    vision_result = await vision.batch_analyze(images)
                    if vision_result.get("ingredients"):
                        product.ingredients = vision_result["ingredients"]
                    if vision_result.get("nutrition"):
                        product.nutrition = vision_result["nutrition"]
                    await db.commit()
                    logger.info(f"[enrich] Step 3 (Vision) done product_id={product.id}: "
                                f"ingredients={len(vision_result.get('ingredients', []))}, "
                                f"nutrition_keys={list(vision_result.get('nutrition', {}).keys())}")
            except Exception as e:
                logger.warning(f"[enrich] Step 3 (Vision) failed for product {product.id}: {e}")

            # Step 4: PDD API price/commission (only when goods_sign available)
            if goods_sign:
                try:
                    logger.info(f"[enrich] Step 4 start product_id={product.id}: goods_sign={goods_sign!r}")
                    detail = await pdd.get_goods_detail(goods_sign)
                    if detail:
                        parsed = pdd.parse_goods(detail)
                        logger.info(f"[enrich] Step 4 (PDD API) product_id={product.id}: "
                                    f"group_price={parsed['group_price']}, single_price={parsed['single_price']}, "
                                    f"promotion_rate={parsed.get('promotion_rate')}")
                        specs = product.specifications or {}
                        for key in ("group_price", "single_price", "coupon_discount", "coupon_start_time", "coupon_end_time", "sales_tip", "goods_eval_score", "goods_eval_count"):
                            if parsed.get(key) is not None:
                                specs[key] = parsed[key]
                        product.specifications = specs
                        product.price_min = parsed.get("group_price") or product.price_min
                        product.price_max = parsed.get("single_price") or product.price_max
                        product.min_group_price = int((parsed.get("group_price") or 0) * 100)
                        product.min_normal_price = int((parsed.get("single_price") or 0) * 100)
                        if parsed.get("promotion_rate") is not None:
                            product.promotion_rate = int(parsed["promotion_rate"])
                        if parsed.get("name"):
                            product.goods_name = parsed["name"][:255] or product.goods_name
                            product.name = parsed["name"][:128]
                        if parsed.get("brand"):
                            product.brand = parsed["brand"][:64]
                        await db.commit()
                        logger.info(f"[enrich] Step 4 done product_id={product.id}: "
                                    f"price_min={product.price_min}, promotion_rate={product.promotion_rate}")
                except Exception as e:
                    logger.warning(f"[enrich] Step 4 (PDD API) failed for product {product.id}: {e}")
            else:
                logger.info(f"[enrich] Step 4 SKIPPED product_id={product.id}: no goods_sign (specs_keys={list((product.specifications or {}).keys())})")

            product.status = "active"
            await db.commit()

            # Price history
            price = product.price_min or 0
            ph = PriceHistory(
                product_id=product.id,
                source_id=ext.source_id if ext else 1,
                price=float(price),
                group_price=float(specs.get("group_price", price)),
                single_price=float(specs.get("single_price", 0)),
            )
            db.add(ph)
            await db.commit()
            logger.info(f"[enrich] Step 5 complete product_id={product.id}: status=active, "
                        f"price={ph.price}")

    except Exception as e:
        logger.error(f"Enrichment failed for product {product_id}: {e}")
        try:
            async with AsyncSessionLocal() as db:
                r = await db.execute(select(Product).where(Product.id == product_id))
                p = r.scalar_one_or_none()
                if p:
                    p.status = "failed"
                    await db.commit()
        except Exception:
            pass
    finally:
        await pdd.close()


async def seed_product(db: AsyncSession, category_id: int, product_name: str, pdd_url: str, pet_type: str = "cat") -> Product:
    goods_id = parse_pdd_goods_id(pdd_url)
    if not goods_id:
        raise ValueError("Invalid PDD URL: could not extract goods_id")

    existing = await db.execute(
        select(ExternalProduct).where(
            ExternalProduct.platform == "pdd",
            ExternalProduct.external_id == goods_id,
        )
    )
    ext = existing.scalar_one_or_none()
    if ext:
        raise ValueError(f"Product with goods_id {goods_id} already exists (product_id: {ext.product_id})")

    cat_result = await db.execute(select(Category).where(Category.id == category_id))
    cat = cat_result.scalar_one_or_none()
    if not cat:
        cat = Category(name="通用", pet_type=pet_type, level=1, sort_order=99)
        db.add(cat)
        await db.flush()
        category_id = cat.id

    product = Product(
        category_id=category_id,
        name=product_name,
        pet_type=pet_type,
        source_platform="pdd",
        source_url=pdd_url,
        status="pending",
    )
    db.add(product)
    await db.flush()

    ds_result = await db.execute(select(DataSource).where(DataSource.platform == "pdd").limit(1))
    ds = ds_result.scalar_one_or_none()

    ext = ExternalProduct(
        product_id=product.id,
        source_id=ds.id if ds else 1,
        platform="pdd",
        external_id=goods_id,
        external_url=pdd_url,
        pid=settings.PDD_PID or "",
        is_primary=True,
    )
    db.add(ext)
    await db.commit()

    try:
        pdd = PDDClient()
        try:
            goods_list = await pdd.search_goods(
                keyword=product_name,
                page=1,
                page_size=10,
            )
            for goods in goods_list:
                gid = str(goods.get("goods_id", ""))
                if gid == goods_id:
                    gsign = goods.get("goods_sign", "")
                    if gsign:
                        specs = product.specifications or {}
                        specs["pdd_goods_sign"] = gsign
                        product.specifications = specs
                        await db.commit()
                        logger.info(f"[seed] Found goods_sign={gsign} for goods_id={goods_id}")
                    break
        except Exception as e:
            logger.warning(f"[seed] Could not lookup goods_sign for {goods_id}: {e}")
        finally:
            await pdd.close()
    except Exception:
        pass

    asyncio.create_task(_enrich_product(product.id))

    return product


async def retry_product_collection(db: AsyncSession, product_id: int):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise ValueError(f"Product {product_id} not found")

    product.status = "pending"
    await db.commit()

    goods_sign = (product.specifications or {}).get("pdd_goods_sign", "")
    asyncio.create_task(_enrich_product(product_id, goods_sign))

    return product


async def update_product_prices(db: AsyncSession):
    result = await db.execute(
        select(Product).where(Product.status.in_(["active", "enriching"]))
    )
    products = result.scalars().all()
    pdd = PDDClient()
    succeeded = 0
    failed = 0

    try:
        for product in products:
            goods_sign = (product.specifications or {}).get("pdd_goods_sign", "")
            if not goods_sign:
                continue

            try:
                detail = await pdd.get_goods_detail(goods_sign)
                if detail:
                    parsed = pdd.parse_goods(detail)
                    logger.info(f"[price] Detail API product_id={product.id}: "
                                f"group_price={parsed['group_price']}, single_price={parsed['single_price']}, "
                                f"coupon_discount={parsed['coupon_discount']}, sales_tip={parsed['sales_tip']}")
                    specs = product.specifications or {}
                    for key in ("group_price", "single_price", "coupon_discount", "coupon_start_time", "coupon_end_time", "sales_tip", "goods_eval_score", "goods_eval_count", "promotion_rate"):
                        if parsed.get(key) is not None:
                            specs[key] = parsed[key]
                    product.specifications = specs
                    product.price_min = parsed.get("group_price") or product.price_min
                    product.price_max = parsed.get("single_price") or product.price_max
                    if parsed.get("promotion_rate") is not None:
                        product.promotion_rate = int(parsed["promotion_rate"])

                    ext_result = await db.execute(
                        select(ExternalProduct).where(
                            ExternalProduct.product_id == product.id,
                            ExternalProduct.platform == "pdd",
                        ).limit(1)
                    )
                    ext = ext_result.scalar_one_or_none()
                    ph = PriceHistory(
                        product_id=product.id,
                        source_id=ext.source_id if ext else 1,
                        price=float(product.price_min or 0),
                        group_price=float(parsed.get("group_price", 0) or 0),
                        single_price=float(parsed.get("single_price", 0) or 0),
                        coupon_discount=float(parsed.get("coupon_discount", 0) or 0),
                    )
                    db.add(ph)
                    succeeded += 1
                    logger.info(f"[price] Updated product_id={product.id}: "
                                f"price_min={product.price_min}, price_max={product.price_max}, "
                                f"price_history: price={ph.price}")

            except Exception as e:
                logger.error(f"Price update failed for product {product.id}: {e}")
                failed += 1

            await asyncio.sleep(2)

        await db.commit()
    finally:
        await pdd.close()
    return {"succeeded": succeeded, "failed": failed}


async def aggregate_product_tags(db: AsyncSession, product_id: Optional[int] = None):
    from app.models.review import Review

    query = select(Review).where(
        Review.source == "crawled",
        Review.llm_review_result.isnot(None),
        Review.status == "approved",
    )
    if product_id:
        query = query.where(Review.product_id == product_id)
    result = await db.execute(query)
    reviews = result.scalars().all()

    tag_weights: dict[str, float] = {}
    rec_total = 0
    rec_positive = 0
    processed_products = set()

    for review in reviews:
        processed_products.add(review.product_id)
        llm_data = review.llm_review_result or {}
        confidence = llm_data.get("confidence", 0.5)

        tags = review.tags or []
        if isinstance(tags, list):
            for tag in tags:
                tag_str = tag if isinstance(tag, str) else (tag.get("name", "") if isinstance(tag, dict) else "")
                if tag_str:
                    tag_weights[tag_str] = tag_weights.get(tag_str, 0) + confidence

        if review.is_recommended is True:
            rec_positive += 1
        rec_total += 1

    result_pids = set(processed_products) if not product_id else {product_id}
    for pid in result_pids:
        p_result = await db.execute(select(Product).where(Product.id == pid))
        p = p_result.scalar_one_or_none()
        if not p:
            continue

        pros = [t for t in sorted(tag_weights.items(), key=lambda x: -x[1])[:8] if t[1] > 0]
        p.pros = [{"name": name, "weight": round(w, 2)} for name, w in pros]

        if rec_total > 0:
            ratings = p.ratings or {}
            ratings["recommend_rate"] = round(rec_positive / rec_total * 100)
            p.ratings = ratings

    await db.commit()
