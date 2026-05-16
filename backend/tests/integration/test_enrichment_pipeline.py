import pytest


@pytest.mark.asyncio
async def test_enrich_product_imports():
    from app.services.collection_service import _enrich_product, discover_products, seed_product
    assert _enrich_product is not None
    assert discover_products is not None
    assert seed_product is not None


@pytest.mark.asyncio
async def test_pipeline_imports():
    from app.services.pdd_crawler import ConservativePDDCrawler
    from app.services.vision_service import QwenVLClient
    from app.services.pdd_client import PDDClient
    assert ConservativePDDCrawler
    assert QwenVLClient
    assert PDDClient


@pytest.mark.asyncio
async def test_parse_pdd_goods_id():
    from app.services.collection_service import parse_pdd_goods_id
    assert parse_pdd_goods_id("https://mobile.yangkeduo.com/goods.html?goods_id=123456") == "123456"
    assert parse_pdd_goods_id("https://mobile.yangkeduo.com/goods.html?goods_id=abc") == "abc"
    assert parse_pdd_goods_id("https://example.com") is None
    assert parse_pdd_goods_id("") is None
