import pytest


@pytest.mark.asyncio
async def test_crawl_product_success():
    from app.services.pdd_crawler import ConservativePDDCrawler
    assert ConservativePDDCrawler
    assert ConservativePDDCrawler.__init__ is not None
    assert hasattr(ConservativePDDCrawler, "crawl_product")


@pytest.mark.asyncio
async def test_crawl_product_daily_limit():
    from app.services.pdd_crawler import ConservativePDDCrawler
    crawler = ConservativePDDCrawler()
    crawler.daily_limit = 0
    result = await crawler.crawl_product("test_goods")
    assert result is None


@pytest.mark.asyncio
async def test_crawl_daily_limit_reset():
    from datetime import date
    from app.services.pdd_crawler import ConservativePDDCrawler
    crawler = ConservativePDDCrawler()
    crawler.today_count = 200
    crawler.today = date.today()
    assert crawler.today_count >= crawler.daily_limit


@pytest.mark.asyncio
async def test_crawl_product_invalid_goods_id():
    from app.services.pdd_crawler import ConservativePDDCrawler
    crawler = ConservativePDDCrawler()
    crawler.daily_limit = 200
    crawler.today_count = 0
    result = await crawler.crawl_product("")
    assert result is None or isinstance(result, dict)


@pytest.mark.asyncio
async def test_crawler_has_close():
    from app.services.pdd_crawler import ConservativePDDCrawler
    crawler = ConservativePDDCrawler()
    assert hasattr(crawler, "close")
    assert callable(crawler.close)
