import asyncio
import json
import random
import re
from datetime import date
from pathlib import Path
from typing import Any, Optional

import httpx
from loguru import logger

from app.core.config import settings

COOKIE_PATH = Path(__file__).resolve().parent.parent.parent / "pdd_cookies.json"
UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 "
    "Mobile/15E148 Safari/604.1"
)


class ConservativePDDCrawler:
    def __init__(self):
        self.daily_limit = settings.CRAWL_DAILY_LIMIT
        self.today_count = 0
        self.today = date.today()
        self._client: Optional[httpx.AsyncClient] = None

    async def _ensure_client(self):
        if self._client is not None:
            return

        cookies = {}
        ua = UA
        if COOKIE_PATH.exists():
            try:
                with open(COOKIE_PATH) as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    cookies = data.get("cookies", {}) or {}
                    ua = data.get("user_agent", UA)
                logger.info("[crawler] Loaded %d cookies from %s" % (len(cookies), COOKIE_PATH))
            except Exception as e:
                logger.warning("[crawler] Failed to load cookies from %s: %s" % (COOKIE_PATH, e))
        else:
            logger.info("[crawler] No cookie file at %s, proceeding without login" % COOKIE_PATH)

        self._client = httpx.AsyncClient(
            cookies=cookies,
            headers={
                "User-Agent": ua,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.5",
            },
            timeout=30.0,
        )

    @staticmethod
    def _extract_raw_data(html: str) -> Optional[dict]:
        for var_name in ("rawData", "__INITIAL_STATE__", "__NUXT__"):
            pattern = r'window\.%s\s*=\s*' % re.escape(var_name)
            for match in re.finditer(pattern, html):
                start = match.end()
                depth = 0
                in_string = False
                escape = False
                pos = start
                while pos < len(html):
                    ch = html[pos]
                    if escape:
                        escape = False
                    elif ch == "\\" and in_string:
                        escape = True
                    elif ch == '"':
                        in_string = not in_string
                    elif not in_string:
                        if ch == "{":
                            depth += 1
                        elif ch == "}":
                            depth -= 1
                            if depth == 0:
                                try:
                                    return json.loads(html[start : pos + 1])
                                except json.JSONDecodeError:
                                    break
                    pos += 1
        return None

    async def crawl_product(self, goods_id: str, url: str = "") -> Optional[dict[str, Any]]:
        if self.today != date.today():
            self.today_count = 0
            self.today = date.today()

        if self.today_count >= self.daily_limit:
            logger.warning("[crawler] Daily limit %d reached" % self.daily_limit)
            return None

        await self._ensure_client()
        assert self._client is not None

        target_url = url or "https://mobile.yangkeduo.com/goods.html?goods_id=%s" % goods_id
        logger.info("[crawler] Fetching goods_id=%s url=%s" % (goods_id, target_url[:120]))

        delay = random.uniform(8, 15)
        await asyncio.sleep(delay)

        try:
            resp = await self._client.get(target_url, follow_redirects=True)

            if resp.status_code in (302, 403):
                logger.warning("[crawler] Login redirect for goods_id=%s, status=%d" % (goods_id, resp.status_code))
                return None

            if "login" in str(resp.url).lower():
                logger.warning("[crawler] Redirected to login page for goods_id=%s" % goods_id)
                return None

            data = self._extract_raw_data(resp.text)
            if not data:
                logger.warning("[crawler] No raw data found for goods_id=%s" % goods_id)
                return None

            store = data.get("store", {})
            if isinstance(store, dict) and store.get("initDataObj", {}).get("needLogin"):
                logger.warning("[crawler] Login wall detected for goods_id=%s" % goods_id)
                return None

            goods_info = data.get("goodsInfo", {}) or {}
            mall_info = data.get("mallInfo", {}) or data.get("mall", {}) or {}
            sku_info = data.get("skuInfo", {}) or {}
            service_info = data.get("serviceInfo", {}) or {}

            result = {
                "goods_id": goods_id,
                "goods_name": goods_info.get("goodsName", "") or goods_info.get("name", ""),
                "gallery_urls": goods_info.get("galleryUrlList", []) or goods_info.get("gallery", []),
                "detail_img_urls": goods_info.get("detailUrlList", []) or goods_info.get("detailImgs", []),
                "sku_list": [
                    {
                        "sku_id": sku.get("skuId"),
                        "spec": sku.get("spec", ""),
                        "price": sku.get("groupPrice", 0),
                        "stock": sku.get("stock", 0),
                    }
                    for sku in (sku_info.get("skuList") or [])
                ],
                "mall_name": mall_info.get("mallName", "") or mall_info.get("name", ""),
                "service_tags": service_info.get("serviceTags", []) or [],
            }

            if not result["goods_name"] and not result["gallery_urls"] and not result["detail_img_urls"]:
                logger.warning("[crawler] Empty result from rawData for goods_id=%s, key mismatch?" % goods_id)
                logger.info("[crawler] rawData top-level keys: %s" % list(data.keys()))
                return None

            self.today_count += 1
            logger.info(
                "[crawler] Success goods_id=%s: name=%s, gallery=%d, detail=%d, mall=%s, today_count=%d"
                % (
                    goods_id,
                    result["goods_name"][:60],
                    len(result["gallery_urls"]),
                    len(result["detail_img_urls"]),
                    result["mall_name"],
                    self.today_count,
                )
            )
            return result

        except httpx.HTTPError as e:
            logger.error("[crawler] HTTP error goods_id=%s: %s" % (goods_id, e))
            return None
        except Exception as e:
            logger.error("[crawler] Failed goods_id=%s: %s: %s" % (goods_id, type(e).__name__, e))
            return None

    async def close(self):
        if self._client is not None:
            await self._client.aclose()
            self._client = None
