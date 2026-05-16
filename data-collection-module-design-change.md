# 数据采集模块设计文档

> 所属项目：宠物好物助手小程序  
> 版本: v3.0（Playwright爬虫 + 多多进宝API）  
> 日期: 2026-05-15  
> 范围: MVP阶段数据采集方案

---

## 一、概述

### 1.1 数据来源架构

MVP阶段采用三个数据源，职责分明：

```
┌─────────────────────────────────────────────────────────────┐
│                      数据采集架构                             │
├──────────────────┬──────────────────┬───────────────────────┤
│   Playwright爬虫  │ 多多进宝官方API   │    小红书 xhs库        │
│   （详情+图片）   │  （价格+佣金）    │    （用户评价）         │
├──────────────────┼──────────────────┼───────────────────────┤
│ • 详情图片URL     │ • 价格/优惠券     │ • 笔记正文             │
│ • 商品属性        │ • 销量           │ • 评论内容             │
│ • 成分表图片      │ • 佣金率         │ • 用户真实体验          │
│                  │ • 推广链接        │                       │
│                  │                  │                       │
│ 一次性低频采集    │ 每小时价格更新    │ 每日增量采集            │
│ （总量数百个）    │ 购买前生成推广链  │                       │
└──────────────────┴──────────────────┴───────────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   GPT-4V识别      │
                    │  详情图片中的      │
                    │  成分表/营养信息   │
                    └──────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   数据库(PG)      │
                    │                  │
                    │ • 商品基础信息    │
                    │ • 价格/佣金      │
                    │ • 成分/营养      │
                    │ • 优缺点标签     │
                    │ • 推广链接缓存   │
                    └──────────────────┘
```

### 1.2 为什么不用第三方API（万邦等）

| 问题 | 说明 |
|------|------|
| 数据来源不透明 | 万邦等也是爬虫抓取，存在同样的法律灰色地带 |
| 价格数据不可靠 | 有延迟，不是实时价格 |
| 额外成本 | ~¥0.03/次，MVP阶段几百个商品虽不贵，但没必要 |
| 依赖第三方 | 服务中断、接口变更会影响项目 |

**自己写Playwright爬虫**：数据可控、无额外成本、技术栈统一。

---

## 二、Playwright爬虫设计

### 2.1 核心策略

> **模拟真人、低频慢速、只采公开数据、不破解防护**

拼多多商品详情页通过 `window.rawData` 注入商品数据，Playwright可以执行JS直接读取。

### 2.2 能获取的数据

访问 `https://mobile.yangkeduo.com/goods.html?goods_id={id}`，提取 `window.rawData`：

| 数据项 | 来源字段 | 说明 |
|--------|----------|------|
| 商品标题 | `goodsInfo.goodsName` | 完整标题 |
| SKU规格 | `goodsInfo.skuInfo` | 规格+价格列表 |
| 轮播图 | `goodsInfo.gallery` | 商品主图 |
| **详情图片** | `goodsInfo.detailGallery` | **含成分表/营养分析的长图** |
| 店铺名 | `goodsInfo.mallName` | 店铺信息 |
| 服务标签 | `goodsInfo.serviceTags` | 24小时发货、假一赔十等 |

**不能获取的**（需其他方式补充）：
- ❌ 结构化属性（品牌/规格/产地不在HTML中，需LLM从标题提取）
- ❌ 销量（需多多进宝API）
- ❌ 价格（需多多进宝API，更准确）

### 2.3 爬虫实现

```python
# app/services/pdd_crawler.py

import random
import time
import asyncio
from playwright.async_api import async_playwright


class ConservativePDDCrawler:
    """
    保守策略拼多多详情页爬虫
    
    设计原则：
    - 只爬商品详情页（公开数据）
    - 模拟真实浏览器行为
    - 频率极低，避免触发风控
    - 遇到登录/验证码就跳过（不破解防护）
    """

    # 频率控制参数
    CRAWL_DELAY_MIN = 8        # 最小间隔（秒）
    CRAWL_DELAY_MAX = 15       # 最大间隔（秒）
    DAILY_LIMIT = 200          # 每日最多爬取商品数
    PAGE_TIMEOUT = 30000       # 页面加载超时（毫秒）

    def __init__(self):
        self.crawled_today = 0

    async def _create_browser(self):
        """创建浏览器实例（模拟iPhone）"""
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 "
                "Mobile/15E148 Safari/604.1"
            ),
            locale="zh-CN",
        )
        return playwright, browser, context

    async def crawl_product(self, goods_id: str) -> dict | None:
        """
        爬取单个商品详情页
        
        Returns:
            {
                "goods_id": str,
                "title": str,
                "detail_img_urls": [str],      # 详情图片（含成分表）
                "gallery_urls": [str],          # 轮播图
                "sku_list": [{spec, price}],    # SKU规格
                "mall_name": str,               # 店铺名
                "service_tags": [str],          # 服务标签
            }
            or None if failed
        """
        playwright, browser, context = None, None, None

        try:
            playwright, browser, context = await self._create_browser()
            page = await context.new_page()

            url = f"https://mobile.yangkeduo.com/goods.html?goods_id={goods_id}"
            
            response = await page.goto(
                url,
                wait_until="networkidle",
                timeout=self.PAGE_TIMEOUT,
            )

            # 检查是否被拦截
            if "login" in page.url:
                print(f"⚠️ {goods_id}: 需要登录，跳过")
                return None
            
            # 检查验证码
            verify_selector = await page.query_selector(
                ".verify-code, .captcha, [class*='verify']"
            )
            if verify_selector:
                print(f"⚠️ {goods_id}: 遇到验证码，跳过")
                return None

            # 提取 window.rawData
            raw_data = await page.evaluate("() => window.rawData || {}")
            store = raw_data.get("store", {})
            goods_info = store.get("goodsInfo", {})

            if not goods_info:
                print(f"⚠️ {goods_id}: 未获取到商品数据")
                return None

            # 提取详情图片
            detail_gallery = goods_info.get("detailGallery", [])
            detail_img_urls = [
                img.get("url") for img in detail_gallery if img.get("url")
            ]

            # 提取轮播图
            gallery = goods_info.get("gallery", [])
            gallery_urls = [
                img.get("url") for img in gallery if img.get("url")
            ]

            # 提取SKU
            sku_list = []
            for sku in goods_info.get("skuInfo", []):
                sku_list.append({
                    "spec": sku.get("specs", ""),
                    "group_price": sku.get("groupPrice", 0),
                    "normal_price": sku.get("normalPrice", 0),
                })

            return {
                "goods_id": goods_id,
                "title": goods_info.get("goodsName", ""),
                "detail_img_urls": detail_img_urls,
                "gallery_urls": gallery_urls,
                "sku_list": sku_list,
                "mall_name": goods_info.get("mallName", ""),
                "service_tags": goods_info.get("serviceTags", []),
            }

        except Exception as e:
            print(f"❌ {goods_id}: 爬取异常 - {e}")
            return None

        finally:
            if context:
                await context.close()
            if browser:
                await browser.close()
            if playwright:
                await playwright.stop()

    async def crawl_batch(
        self,
        goods_ids: list[str],
        progress_callback=None,
    ) -> list[dict]:
        """
        分批爬取多个商品
        
        Args:
            goods_ids: 拼多多商品ID列表
            progress_callback: 进度回调函数(current, total, result)
        
        Returns:
            成功爬取的结果列表
        """
        results = []
        total = min(len(goods_ids), self.DAILY_LIMIT)

        for i, goods_id in enumerate(goods_ids[:total]):
            if self.crawled_today >= self.DAILY_LIMIT:
                print(f"⚠️ 达到日限 {self.DAILY_LIMIT}，停止")
                break

            print(f"[{i+1}/{total}] 爬取 {goods_id}...")

            result = await self.crawl_product(goods_id)
            if result:
                results.append(result)
                self.crawled_today += 1

            if progress_callback:
                progress_callback(i + 1, total, result)

            # 随机间隔（最后一个不等待）
            if i < total - 1:
                delay = random.uniform(self.CRAWL_DELAY_MIN, self.CRAWL_DELAY_MAX)
                print(f"   等待 {delay:.1f}s...")
                await asyncio.sleep(delay)

        return results
```

### 2.4 风控规避检查清单

| 措施 | 实现 | 目的 |
|------|------|------|
| Playwright模拟浏览器 | 执行JS、渲染页面 | 不像requests被直接拦截 |
| iPhone User-Agent + 视口 | 模拟移动端访问 | 移动端反爬通常更宽松 |
| 8-15秒随机间隔 | `random.uniform(8, 15)` | 真人浏览速度 |
| 日限200个 | 硬编码限制 | 小规模，不对平台造成负担 |
| 遇到验证码跳过 | 不破解、不打码 | **法律红线**：不绕过防护措施 |
| 不爬列表页 | 只爬详情页 | 减少请求量，降低被封概率 |
| 使用代理池（可选） | 轮换IP | 进一步降低单IP频率 |

---

## 三、多多进宝API（价格+佣金）

### 3.1 职责范围

| 功能 | 接口 | 频率 |
|------|------|------|
| 商品价格/优惠券 | `pdd.ddk.goods.detail` | 每小时更新 |
| 销量 | `pdd.ddk.goods.detail` | 每小时更新 |
| 佣金比例 | `pdd.ddk.goods.detail` (`promotion_rate`) | 每小时更新 |
| 推广链接 | `pdd.ddk.goods.promotion.url.generate` | 用户点击前实时生成 |

### 3.2 推广链接生成（佣金核心）

```python
# app/services/pdd_client.py

async def generate_promotion_url(
    self,
    goods_sign: str,
    pid: str = None,
) -> dict:
    """
    生成多多进宝推广链接
    
    这是佣金追踪的唯一方式。
    用户必须通过此链接购买，佣金才会结算到你的账户。
    """
    params = self._build_params(
        "pdd.ddk.goods.promotion.url.generate",
        p_id=pid or self.pid,
        goods_sign_list=json.dumps([goods_sign]),
        generate_short_url="true",
        generate_we_app="true",
    )

    response = await self._request(params)
    
    url_list = response.get(
        "goods_promotion_url_generate_response", {}
    ).get("goods_promotion_url_list", [])

    if not url_list:
        raise Exception("推广链接生成失败")

    return {
        "short_url": url_list[0].get("short_url"),
        "mobile_url": url_list[0].get("mobile_url"),
        "we_app_url": url_list[0].get("we_app_web_view_url"),
    }
```

### 3.3 佣金获取流程

```
用户查看商品
     │
     ▼
前端调用 /products/{id}/promotion-url
     │
     ▼
后端调用多多进宝API ──► 生成带pid的推广链接
     │
     ▼
返回 short_url 给前端
     │
     ▼
用户点击"去拼多多购买"
     │
     ▼
跳转到 https://p.pinduoduo.com/xxxxx（带pid）
     │
     ▼
用户在拼多多完成购买
     │
     ▼
多多进宝平台 ──► 根据pid结算佣金 ──► 到你的推手账户
```

### 3.4 佣金规则

| 规则 | 说明 |
|------|------|
| 佣金比例 | 商家设定，宠物食品常见 10%-30% |
| 归因期 | 点击推广链接后 15 天内购买都算 |
| 结算时机 | 用户付款后佣金即划到账户，确认收货14天后可提现 |
| 退货处理 | 14天内退货→佣金返还；14天后→佣金不退 |

### 3.5 推广链接缓存

```python
# 推广链接缓存（Redis）
# key: pdd:promo:{goods_sign}:{pid}
# TTL: 12小时（链接通常24小时有效）

async def get_promotion_url_cached(self, goods_sign: str) -> str:
    cache_key = f"pdd:promo:{goods_sign}:{self.pid}"
    
    # 查缓存
    cached = await redis.get(cache_key)
    if cached:
        return cached
    
    # 生成新链接
    result = await self.generate_promotion_url(goods_sign)
    short_url = result["short_url"]
    
    # 缓存12小时
    await redis.setex(cache_key, 12 * 3600, short_url)
    
    return short_url
```

---

## 四、GPT-4V/Qwen-VL 成分表识别

### 4.1 识别流程

Playwright爬取的 `detail_img_urls` 中包含成分表/营养分析图片，用多模态LLM识别：

```python
# app/services/vision_service.py

import os
from openai import AsyncOpenAI


class QwenVLClient:
    """阿里云百炼 Qwen-VL-Plus 视觉模型客户端"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.model = "qwen-vl-plus"

    async def analyze_ingredient_image(self, image_url: str) -> dict:
        """
        识别宠物食品成分表图片
        
        Returns:
            {
                "type": "成分表" | "营养表" | "其他",
                "ingredients": ["成分1", "成分2", ...],
                "nutrition": {"粗蛋白": "xx%", "粗脂肪": "xx%", ...},
                "raw": "模型原始输出"
            }
        """
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                    {
                        "type": "text",
                        "text": (
                            "识别这张图片的内容。如果是宠物食品的成分表或营养分析表：\n"
                            "1. 提取'原料组成'或'成分'后面的所有成分列表\n"
                            "2. 提取'营养分析'或'营养成分'中的数值\n"
                            "3. 返回严格的JSON格式：\n"
                            '{"type": "成分表|营养表", '
                            '"ingredients": ["成分1", "成分2", ...], '
                            '"nutrition": {"粗蛋白": "xx%", "粗脂肪": "xx%", ...}}\n'
                            "如果不是成分表或营养表，返回："
                            '{"type": "其他"}\n'
                            "只输出JSON，不要其他文字。"
                        ),
                    },
                ],
            }],
            max_tokens=2000,
        )

        content = response.choices[0].message.content
        
        # 解析JSON
        import json
        import re
        
        # 尝试从回复中提取JSON
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        return {"type": "其他", "raw": content}

    async def batch_analyze(
        self,
        image_urls: list[str],
    ) -> dict:
        """
        批量分析详情图片，找到成分表和营养表
        
        Returns:
            {
                "ingredients": ["成分1", ...],
                "nutrition": {"粗蛋白": "xx%", ...},
            }
        """
        results = {"ingredients": [], "nutrition": {}}

        for url in image_urls:
            analysis = await self.analyze_ingredient_image(url)
            
            if analysis.get("type") == "成分表":
                results["ingredients"] = analysis.get("ingredients", [])
                results["nutrition"] = analysis.get("nutrition", {})
                break  # 找到成分表即可

        return results
```

### 4.2 成本

| 项目 | 价格 | MVP 50个商品估算 |
|------|------|-----------------|
| Qwen-VL-Plus | 0.0015元/千tokens | ~¥0.75（约450张图） |
| GPT-4o（备选） | $0.005/张 | ~$2.25 |

---

## 五、小红书评价采集

不变，同上一版设计。通过 `xhs` 开源库采集用户评价，LLM分析优缺点标签。

详细见本文档 **第六章**（同上一版）。

---

## 六、完整商品初始化流程

### 6.1 种子商品录入到完整信息的流程

```
运营录入种子商品（goods_id + 宠物类型）
         │
         ▼
┌──────────────────────┐
│  Step 1: Playwright   │
│  爬取详情页            │
│                       │
│  输入: goods_id        │
│  输出: title,          │
│        detail_img_urls │◄── 详情图片（含成分表）
│        gallery_urls    │
│        sku_list        │
│        mall_name       │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Step 2: LLM提取      │
│  从标题解析属性        │
│                       │
│  输入: title           │
│  输出: brand,          │
│        spec_weight,    │
│        spec_form,      │
│        age_range,      │
│        special_formula │
│        nutrition       │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Step 3: GPT-4V       │
│  识别成分表            │
│                       │
│  输入: detail_img_urls │
│  输出: ingredients,   │
│        nutrition      │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Step 4: 多多进宝API  │
│  获取价格+佣金        │
│                       │
│  输入: goods_id        │
│  输出: price,          │
│        coupon,         │
│        sales_tip,      │
│        promotion_rate  │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Step 5: 小红书采集   │
│  用户评价              │
│                       │
│  输入: title + brand   │
│  输出: reviews ──► LLM │
│        分析 pros/cons  │
└──────────┬────────────┘
           │
           ▼
    保存到数据库
```

### 6.2 代码实现

```python
# app/services/product_init_service.py

from app.services.pdd_crawler import ConservativePDDCrawler
from app.services.pdd_client import PinduoduoClient
from app.services.vision_service import QwenVLClient
from app.services.llm_service import extract_from_title


async def initialize_product(
    goods_id: str,
    pet_type: str,
    db,
) -> int:
    """
    初始化一个商品的完整信息
    
    流程:
        1. Playwright爬取详情页（图片+标题+SKU）
        2. LLM从标题提取属性
        3. GPT-4V识别成分表
        4. 多多进宝API获取价格+佣金
        5. 存入数据库
    
    Returns:
        新创建的商品ID
    """
    crawler = ConservativePDDCrawler()
    pdd_api = PinduoduoClient()
    vision = QwenVLClient()

    # Step 1: Playwright爬取详情页
    crawl_result = await crawler.crawl_product(goods_id)
    if not crawl_result:
        raise Exception(f"爬取商品 {goods_id} 失败")

    title = crawl_result["title"]

    # Step 2: LLM从标题提取属性
    llm_attrs = await extract_from_title(title)

    # Step 3: GPT-4V识别成分表
    ingredient_data = {"ingredients": [], "nutrition": {}}
    if crawl_result.get("detail_img_urls"):
        ingredient_data = await vision.batch_analyze(
            crawl_result["detail_img_urls"]
        )

    # Step 4: 多多进宝API获取价格+佣金
    # 先搜索获取goods_sign
    search_results = await pdd_api.search_goods(
        keyword=goods_id,
        page_size=10,
    )
    
    pdd_info = None
    for g in search_results:
        if str(g.get("goods_id")) == goods_id:
            pdd_info = g
            break

    # Step 5: 存入数据库
    product_id = await db.fetchval(
        """
        INSERT INTO products (
            goods_id, goods_name, pet_type,
            goods_image_url, gallery_urls, detail_img_urls,
            min_group_price, min_normal_price, coupon_discount,
            promotion_rate, sales_tip,
            brand, spec_weight, spec_form, origin,
            age_range, special_formula,
            ingredients, nutrition,
            status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING id
        """,
        goods_id,
        title,
        pet_type,
        crawl_result["gallery_urls"][0] if crawl_result["gallery_urls"] else "",
        json.dumps(crawl_result["gallery_urls"]),
        json.dumps(crawl_result["detail_img_urls"]),
        pdd_info["min_group_price"] if pdd_info else 0,
        pdd_info["min_normal_price"] if pdd_info else 0,
        pdd_info["coupon_discount"] if pdd_info else 0,
        pdd_info["promotion_rate"] if pdd_info else 0,
        pdd_info["sales_tip"] if pdd_info else "",
        llm_attrs.get("brand"),
        llm_attrs.get("spec_weight"),
        llm_attrs.get("spec_form"),
        llm_attrs.get("origin"),
        llm_attrs.get("age_range"),
        json.dumps(llm_attrs.get("special_formula", [])),
        json.dumps(ingredient_data.get("ingredients", [])),
        json.dumps(ingredient_data.get("nutrition", {})),
        "active",
    )

    return product_id
```

---

## 七、数据库表结构

```sql
-- 商品表
CREATE TABLE products (
    id                SERIAL PRIMARY KEY,
    
    -- === Playwright爬虫获取 ===
    goods_id          VARCHAR(64) UNIQUE NOT NULL,     -- 拼多多商品ID
    goods_name        VARCHAR(255) NOT NULL,           -- 标题
    goods_image_url   VARCHAR(512),                    -- 主图URL
    gallery_urls      JSONB DEFAULT '[]',              -- 轮播图（Playwright）
    detail_img_urls   JSONB DEFAULT '[]',              -- 详情图片（Playwright，含成分表）
    mall_name         VARCHAR(128),                    -- 店铺名（Playwright）
    service_tags      JSONB DEFAULT '[]',              -- 服务标签（Playwright）
    
    -- === LLM从标题提取 ===
    brand             VARCHAR(64),                     -- 品牌
    spec_weight       VARCHAR(32),                     -- 规格重量
    spec_form         VARCHAR(16),                     -- 形态
    origin            VARCHAR(64),                     -- 产地
    age_range         VARCHAR(32),                     -- 适用年龄
    special_formula   JSONB DEFAULT '[]',              -- 特殊配方
    nutrition_highlight VARCHAR(255),                  -- 营养亮点
    
    -- === GPT-4V识别详情图片 ===
    ingredients       JSONB DEFAULT '[]',              -- 成分表
    nutrition         JSONB DEFAULT '{}',              -- 营养分析值
    
    -- === 多多进宝API获取 ===
    min_group_price   INTEGER NOT NULL DEFAULT 0,      -- 拼团价（分）
    min_normal_price  INTEGER NOT NULL DEFAULT 0,      -- 单买价（分）
    coupon_discount   INTEGER DEFAULT 0,               -- 优惠券（分）
    promotion_rate    INTEGER DEFAULT 0,               -- 佣金比例（%）
    sales_tip         VARCHAR(64),                     -- 销量提示
    
    -- === 人工标注 ===
    pet_type          VARCHAR(16) NOT NULL,            -- 适用宠物
    category_id       INTEGER REFERENCES categories(id),
    status            VARCHAR(16) DEFAULT 'active',
    
    -- === 小红书评价聚合 ===
    pros              JSONB DEFAULT '[]',
    cons              JSONB DEFAULT '[]',
    recommend_rate    INTEGER,
    
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 多多进宝推广链接缓存（Redis也可用，PG兜底）
CREATE TABLE promotion_url_cache (
    id            SERIAL PRIMARY KEY,
    goods_id      VARCHAR(64) NOT NULL,
    pid           VARCHAR(64) NOT NULL,
    short_url     VARCHAR(256) NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(goods_id, pid)
);

-- 采集日志
CREATE TABLE collection_logs (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER REFERENCES products(id),
    source          VARCHAR(32) NOT NULL,           -- pdd_crawler / pdd_api / xiaohongshu
    collection_type VARCHAR(16) NOT NULL,           -- full / incremental
    items_count     INTEGER DEFAULT 0,
    status          VARCHAR(16) DEFAULT 'success',
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 八、成本估算

### MVP阶段（50个商品）

| 项目 | 次数 | 单价 | 总价 |
|------|------|------|------|
| Playwright爬虫 | 50个 | 免费 | ¥0 |
| Qwen-VL-Plus识别成分 | ~200张图 | 0.0015元/千tokens | ~¥0.5 |
| 多多进宝API | 免费 | 2000次/日 | ¥0 |
| 小红书xhs采集 | 免费 | Cookie方式 | ¥0 |
| **合计** | | | **~¥0.5** |

### 月度运营

| 项目 | 频率 | 费用 |
|------|------|------|
| Playwright爬虫 | 新增商品时 | ¥0 |
| 多多进宝价格更新 | 每小时 | ¥0（额度内） |
| 推广链接生成 | 用户点击时 | ¥0 |
| 小红书增量采集 | 每日 | ¥0 |
| **合计** | | **¥0** |

---

## 九、关键原则总结

| 数据源 | 用途 | 频率 | 成本 |
|--------|------|------|------|
| **Playwright爬虫** | 详情图片、标题、SKU | 一次性 | 免费 |
| **多多进宝API** | 价格、优惠券、佣金、推广链接 | 每小时/实时 | 免费 |
| **Qwen-VL-Plus** | 识别详情图片中的成分表 | 一次性 | ~¥0.5 |
| **小红书xhs** | 用户评价、优缺点 | 每日增量 | 免费 |

### 法律合规检查清单

- [x] 只爬公开可访问的商品详情页
- [x] 不绕过验证码、不破解防护
- [x] 频率极低（8-15秒间隔，日限200个）
- [x] 只采集商品信息，不采集用户数据
- [x] 用于信息聚合展示，不替代原平台

---

## 十、参考资料

- [拼多多开放平台文档](https://open.pinduoduo.com/)
- [多多进宝官网](https://jinbao.pinduoduo.com/)
- [Playwright Python文档](https://playwright.dev/python/)
- [阿里云百炼 Qwen-VL](https://help.aliyun.com/zh/dashscope/)
