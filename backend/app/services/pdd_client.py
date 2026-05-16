import hashlib
import re
from typing import Any, Optional

from loguru import logger

from app.core.config import settings
from app.utils.http_client import HttpClient

PDD_API_URL = "https://gw-api.pinduoduo.com/api/router"


class PDDClient:
    def __init__(self):
        self.client_id = settings.PDD_CLIENT_ID or ""
        self.client_secret = settings.PDD_CLIENT_SECRET or ""
        self.pid = settings.PDD_PID or ""
        self.http = HttpClient(
            base_url=PDD_API_URL,
            timeout=30,
            max_retries=3,
            base_delay=2.0,
            rate_limit=2.0,
        )

    def _sign(self, params: dict) -> str:
        sorted_keys = sorted(params.keys())
        raw = self.client_secret + "".join(f"{k}{params[k]}" for k in sorted_keys) + self.client_secret
        return hashlib.md5(raw.encode("utf-8")).hexdigest().upper()

    async def _call(self, method: str, biz_params: dict) -> dict:
        params = {
            "type": method,
            "client_id": self.client_id,
            "timestamp": str(int(__import__("time").time())),
            "data_type": "JSON",
            "version": "V1",
            "pid": self.pid,
        }
        params.update(biz_params)
        params["sign"] = self._sign(params)

        resp = await self.http.post(PDD_API_URL, data=params)
        result = await resp.json()
        error_response = result.get("error_response")
        if error_response:
            raise Exception(f"PDD API error: {error_response.get('sub_msg', error_response.get('msg', 'Unknown'))}")
        return result

    async def search_goods(
        self,
        keyword: str,
        page: int = 1,
        page_size: int = 20,
        opt_id: Optional[int] = None,
        price_min: Optional[int] = None,
        price_max: Optional[int] = None,
        sort_type: int = 0,
    ) -> list[dict]:
        params = {
            "keyword": keyword,
            "page": str(page),
            "page_size": str(page_size),
            "sort_type": str(sort_type),
            "with_coupon": "true",
        }
        if opt_id is not None:
            params["opt_id"] = str(opt_id)
        if price_min is not None:
            params["price_range_lower"] = str(price_min * 100)
        if price_max is not None:
            params["price_range_upper"] = str(price_max * 100)

        result = await self._call("pdd.ddk.goods.search", params)
        goods_list = result.get("goods_search_response", {}).get("goods_list", [])
        logger.debug(f"PDD search keyword='{keyword}' page={page}: found {len(goods_list)} goods")
        return goods_list

    async def get_goods_detail(self, goods_sign: str) -> Optional[dict]:
        result = await self._call("pdd.ddk.goods.detail", {"goods_sign": goods_sign})
        details = result.get("goods_detail_response", {}).get("goods_details", [])
        if details:
            logger.debug(f"PDD detail goods_sign={goods_sign}: fetched successfully")
            return details[0]
        logger.warning(f"PDD detail goods_sign={goods_sign}: no details returned")
        return None

    def parse_goods(self, goods: dict) -> dict:
        gallery_urls = (
            goods.get("goods_gallery_urls")
            or [goods.get(f"goods_gallery_urls_{i}", "") for i in range(1, 10) if goods.get(f"goods_gallery_urls_{i}")]
            or []
        )
        desc_html = goods.get("goods_desc", "") or ""
        detail_img_urls = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', desc_html) if desc_html else []

        return {
            "external_id": str(goods.get("goods_id", "")),
            "external_url": goods.get("goods_url", ""),
            "name": goods.get("goods_name", ""),
            "brand": goods.get("brand_name", ""),
            "description": desc_html,
            "image_urls": [goods.get("goods_image_url", "")] + gallery_urls,
            "gallery_urls": gallery_urls,
            "detail_img_urls": detail_img_urls,
            "group_price": float(goods.get("min_group_price", 0)) / 100 if goods.get("min_group_price") else None,
            "single_price": float(goods.get("min_normal_price", 0)) / 100 if goods.get("min_normal_price") else None,
            "coupon_discount": float(goods.get("coupon_discount", 0)) / 100 if goods.get("coupon_discount") else None,
            "coupon_start_time": goods.get("coupon_start_time", ""),
            "coupon_end_time": goods.get("coupon_end_time", ""),
            "sales_tip": goods.get("sales_tip", ""),
            "goods_eval_score": float(goods.get("goods_eval_score", 0)) if goods.get("goods_eval_score") else None,
            "goods_eval_count": int(goods.get("goods_eval_count", 0)) if goods.get("goods_eval_count") else None,
            "mall_name": goods.get("mall_name", ""),
            "mall_cps": float(goods.get("mall_cps", 0)) if goods.get("mall_cps") else None,
            "promotion_rate": float(goods.get("promotion_rate", 0)) if goods.get("promotion_rate") else None,
            "category_id": goods.get("opt_id"),
            "category_name": goods.get("opt_name", ""),
        }

    async def generate_promotion_url(self, goods_sign: str, pid: str) -> dict:
        result = await self._call("pdd.ddk.goods.promotion.url.generate", {
            "goods_sign": goods_sign,
            "p_id": pid,
            "generate_short_url": "true",
            "generate_mobile": "true",
            "generate_we_app": "true",
        })
        resp = result.get("goods_promotion_url_generate_response", {})
        urls = resp.get("goods_promotion_url_list", [])
        if urls:
            return {
                "short_url": urls[0].get("short_url", ""),
                "mobile_url": urls[0].get("mobile_url", ""),
                "we_app_url": urls[0].get("we_app_url", ""),
            }
        return {}

    async def close(self):
        await self.http.close()
