# Delta Specification: Data Collection Module v3 Design Change

**Base Spec**: [spec.md](spec.md) (v2, fully implemented)
**Delta Source**: `data-collection-module-design-change.md` (v3)
**Created**: 2026-05-15
**Status**: Draft
**Branch**: `002-data-collection-module`

---

## 一、Change Summary

The v3 design change splits product data acquisition into two distinct phases — **discovery** (what to collect) and **enrichment** (how to get rich detail) — introduces **vision LLM ingredient/nutrition recognition** from product detail images, and adds a **promotion URL / commission system** via PDD Duoduo Jinbao.

### Architecture Shift: From 2-Source to 5-Source

| Aspect | v2 (Implemented) | v3 (New Design) |
|--------|-----------------|-----------------|
| Product discovery | PDD search API (basic info + goods_ids) | PDD search API **kept for discovery only** (basic info, goods_id, thumbnail) |
| Product details | PDD API (`pdd.ddk.goods.detail`) | **httpx scraper** with session cookies, extracts `window.rawData` from response HTML |
| Product images | PDD API (gallery URLs only) | httpx: gallery + **detail images** (ingredient tables) |
| Price/coupon/sales | PDD API | PDD API (unchanged) |
| Commission rate | Not collected | PDD API (`promotion_rate`) |
| Promotion URLs | Not implemented | PDD API (`pdd.ddk.goods.promotion.url.generate`) |
| Ingredient/nutrition | LLM from title text | LLM from title **+ Vision LLM from detail images** |
| XHS reviews | `xhs` library + LLM analysis | Unchanged |

**Login Flow**: `login_pdd.py` uses Playwright to open a browser window → user logs in manually → cookies are auto-exported to `pdd_cookies.json` → browser can close. The crawler uses `httpx` with those cookies for all subsequent requests — no browser runtime needed during production crawling.

**Key Design Principle**: 搜索策略负责"发现"（搜什么、搜多少），httpx+VLLM负责"深挖"（爬详情、识成分）。两者是正交职责，保留搜索策略功能。

---

## 二、User Story Changes

### US1 — Acquire Products (P1): MODIFIED (Add Enrichment Steps)

**What changed**: The original two-method acquisition (auto-discovery + manual seed) is **preserved**. The difference is in what happens AFTER a product is found/seeded: detail data now comes from httpx scraper + Vision LLM instead of PDD detail API.

#### Acceptance Scenarios (Delta)

**方式A — 自动发现: PRESERVED, with enrichment pipeline change**

The search strategy CRUD and PDD search API auto-discovery remain intact for **product discovery** — they return goods_ids and basic info (name, thumbnail). The change is in the downstream detail enrichment pipeline.

1. **Given** 运营人员配置搜索策略并点击"启动采集", **When** 系统调用拼多多搜索API, **Then** 系统逐页拉取商品列表（仅获取 goods_id、商品名、缩略图、价格区间等基本信息），按 goods_id 去重后创建商品记录（状态为"待采集"）
   - **UNCHANGED**: Search strategy + PDD search API for discovery
2. **Given** 搜索策略返回商品列表（已去重创建记录）, **When** 后台详情采集任务执行, **Then** 系统对每个"待采集"商品依次执行：httpx 爬详情页（标题/详情图/轮播图/SKU/店铺）→ Vision LLM 识别成分表 → 多多进宝 API 获取价格/佣金 → LLM 标题属性提取（与手动录入共享同一管线）
   - **CHANGED**: Detail enrichment pipeline now includes httpx + Vision LLM + PDD API (price only)
3. **Given** 自动发现任务运行中, **When** 运营人员查看进度, **Then** SSE 展示两阶段进度（阶段一：搜索发现 N 件 → 阶段二：详情采集完成 M/N 件）
   - **CHANGED**: Progress now shows two-phase pipeline (discovery + enrichment split)

**方式B — 手动录入: MODIFIED (pet_type added)**

1. **Given** 运营人员在管理后台打开"手动添加商品"页面, **When** 输入商品名称、拼多多商品链接 **和宠物类型（猫/狗）** 并提交, **Then** 系统创建商品记录（状态为"待采集"），并在后台任务队列中触发详情采集
   - **NEW**: `pet_type` field is now required at seed time (was optional/derived)
2. **Given** 商品状态为"待采集", **When** 后台详情采集任务执行, **Then** 系统执行与自动发现相同的五步管线：httpx 爬详情页 → LLM 标题提取 → Vision LLM 成分识别 → 多多进宝 API 价格/佣金 → 保存到数据库
   - **CHANGED**: Unified pipeline for both auto-discovery and manual seeding
3. **Given** `pdd_cookies.json` 中的 Cookie 已过期, **When** httpx 请求返回登录墙（`needLogin`）, **Then** 系统跳过该商品，标记为"采集失败"，记录"Cookie 过期"，运营人员需重新运行 `login_pdd.py` 导出新 Cookie
   - **NEW**: Cookie expiration failure mode
### US3 — Scheduled Price & Data Refresh (P2): MODIFIED

**What changed**: Hourly price refresh now also fetches `promotion_rate` from PDD API.

#### Modified Acceptance Scenarios

1. **Given** 系统正常运行, **When** 每小时价格更新定时任务触发, **Then** 系统遍历所有上架商品，通过多多进宝 API 获取最新拼团价、单买价、优惠券、销量、评价分 **和佣金比例** 并更新数据库
   - **CHANGED**: Added `promotion_rate` to fetched fields

Aspects unchanged from v2:
- Incremental XHS review collection at 3am daily
- Task overlap prevention
- Individual failure isolation

### US5 — Tag Aggregation (P3): UNCHANGED

No changes from v2.

---

### NEW User Story: Promotion URL & Commission (Priority: P1)

系统为每个商品生成带 PID 的多多进宝推广链接，用户在微信小程序中点击"去拼多多购买"时通过推广链接跳转，实现佣金追踪和结算。

**Why this priority**: 佣金是小程序的核心商业模式。没有推广链接，用户购买行为无法归因到推广账户，整个项目的收入模型无法成立。必须在商品上线前实现。

**Independent Test**: 对一个已有商品数据的商品，调用推广链接接口，验证返回的 short_url 可正常跳转到拼多多商品页（带 PID 参数）。

**Acceptance Scenarios**:

1. **Given** 用户在小程序商品详情页点击"去拼多多购买", **When** 前端请求推广链接, **Then** 后端调用多多进宝 `pdd.ddk.goods.promotion.url.generate` 生成带 PID 的推广链接（短链接+移动端链接+小程序链接），12小时内缓存复用
2. **Given** 推广链接已生成, **When** 用户点击链接跳转到拼多多, **Then** 用户在拼多多完成购买后，多多进宝平台根据 PID 将佣金计入推广账户
3. **Given** 推广链接缓存未过期, **When** 同商品同 PID 再次请求推广链接, **Then** 系统直接返回缓存的链接，不重复调用 API
4. **Given** 多多进宝 API 返回推广链接生成失败, **When** 前端请求推广链接, **Then** 系统返回错误提示，运营人员在管理后台可见失败日志

---

### NEW User Story: Vision LLM Ingredient Analysis (Priority: P1)

系统使用多模态视觉大模型（Qwen-VL-Plus / GPT-4V）自动识别拼多多商品详情图片中的成分表和营养分析表，提取结构化数据供前端展示。

**Why this priority**: 成分表和营养数据是宠物食品选购的核心决策依据。手动从图片中录入成分效率极低且易出错。视觉 LLM 能够自动化这一过程，是区别于纯电商平台的关键差异化功能。

**Independent Test**: 对一个已通过 httpx 爬取到详情图片的商品，触发视觉 LLM 分析，能在 2 分钟内看到提取的成分列表和营养分析值。

**Acceptance Scenarios**:

1. **Given** 商品已通过 httpx 爬取到 `detail_img_urls`（详情图片列表）, **When** 视觉 LLM 分析任务触发, **Then** 系统逐张识别详情图片，查找成分表或营养分析表
2. **Given** 视觉 LLM 识别到成分表图片, **When** 提取完成, **Then** 系统输出原料组成列表（如 `["鸡肉", "糙米", "鸡油", ...]`）和营养分析数值（如 `{"粗蛋白": "≥32%", "粗脂肪": "≥15%", ...}`）
3. **Given** 所有详情图片均不包含成分表或营养表, **When** 视觉 LLM 分析完成, **Then** 系统记录 `type: "其他"`，成分表和营养字段保持空值
4. **Given** 视觉 LLM 返回格式异常（非 JSON 或缺少字段）, **When** 解析失败, **Then** 系统使用默认空值填充并记录警告日志

---

## 三、Functional Requirements Delta

### Modified Requirements

| FR | Change | Detail |
|----|--------|--------|
| FR-001 | **PRESERVED** | Search strategies (keywords, category ID, price range, sort type, max items) remain for **product discovery via PDD search API** — only returns basic info (goods_id, name, thumbnail, price range). No functional change. |
| FR-001a | **MODIFIED** | SSE real-time progress now shows **two-phase progress**: Phase 1 (search discovery: found N items) → Phase 2 (detail enrichment: M/N items enriched via httpx+VLLM+PDD API pipeline) |
| FR-001b | **MODIFIED** | Manual seeding now requires `pet_type` field in addition to PDD link |
| FR-002 | **MODIFIED** | PDD API scope **reduced to price/commission/sales**: PDD detail API now only fetches group/single price, coupon, sales_tip, eval_score/count, **promotion_rate**. Product detail data (images, SKU, mall, service tags) comes from httpx scraper. |
| FR-003 | **MODIFIED** | LLM title-based field extraction supplemented by **vision LLM** extraction from detail images for ingredients/nutrition |
| FR-009 | **MODIFIED** | Hourly price update now also fetches **promotion_rate** from PDD API |
| FR-014 | **MODIFIED** | Rate limits now per-source: httpx 8-15s inter-request delay; PDD API 2000/day shared between search + price refresh + promotion URL; XHS unchanged |

### New Requirements

- **FR-018**: System MUST use an HTTP client with PDD session cookies to send GET requests to PDD mobile product detail pages (`mobile.yangkeduo.com/goods.html?goods_id={id}`) for products in PENDING/ENRICHING state, extracting `window.rawData` from the HTML response for: detail images (containing ingredient tables), gallery images, SKU specs, mall name, and service tags
- **FR-018a**: The HTTP client MUST simulate iPhone mobile browser (iOS Safari User-Agent, zh-CN locale) and enforce conservative rate limits: 8-15 second random delay between requests; MUST detect login walls by checking `store.initDataObj.needLogin` in the extracted data and skip gracefully (no bypass attempt); session cookies are loaded from `pdd_cookies.json` (generated by `login_pdd.py` via Playwright browser login)
- **FR-019**: System MUST use a multimodal vision LLM (Qwen-VL-Plus or equivalent) to analyze product detail images and extract ingredient lists and nutrition analysis values in structured JSON format
- **FR-019a**: Vision LLM analysis MUST be triggered automatically as part of the product enrichment pipeline after httpx crawling, before product status transitions to ACTIVE
- **FR-020**: System MUST generate PDD Duoduo Jinbao promotion URLs (`pdd.ddk.goods.promotion.url.generate`) with PID when end users request purchase links, returning short/mobile/WeChat-mini-program URLs
- **FR-021**: System MUST cache promotion URLs with 12-hour TTL to avoid redundant PDD API calls; cache keyed on `(goods_sign, pid)`; PostgreSQL as primary store with optional Redis acceleration
- **FR-022**: Product enrichment pipeline MUST execute in fixed order: httpx crawl → LLM title extraction → Vision LLM ingredient analysis → PDD API price/commission → save; each step can fail independently without blocking subsequent steps (degraded completion)

### Removed from v2

- ~~PDD detail API as source of product images/title/SKU/mall~~ → Replaced by httpx scraper with session cookies
- ~~PDD search API as source of full product details~~ → PDD search API now for discovery only (goods_id + basic info)

---

## 四、Data Model Delta

### products Table — Storage Strategy: Two-Tier (Top-Level + JSONB)

**Design Decision**: Fields are split by query pattern — frequently queried/filtered fields become top-level columns (indexable); display-only bulk data remains in JSONB.

#### Tier 1: Top-Level Columns (queryable, indexed)

| Column | Type | Source | Index | Description |
|--------|------|--------|-------|-------------|
| `goods_name` | VARCHAR(255) NOT NULL | httpx `goodsInfo.goodsName` | GIN (pg_trgm) | Product display name (searchable) |
| `brand` | VARCHAR(64) | LLM title extraction | BTREE | Brand name (filterable) |
| `spec_form` | VARCHAR(16) | LLM title extraction | BTREE | Form: dry/wet/freeze-dried/etc. (filterable) |
| `age_range` | VARCHAR(32) | LLM title extraction | BTREE | Target age range (filterable) |
| `mall_name` | VARCHAR(128) | httpx `mallName` | BTREE | Store name (filterable) |
| `pet_type` | VARCHAR(16) NOT NULL | Operator input | BTREE | Target pet: 'cat' / 'dog' (filterable) |
| `promotion_rate` | INTEGER DEFAULT 0 | PDD API | — | Commission percentage |
| `min_group_price` | INTEGER DEFAULT 0 | PDD API | BTREE | Group purchase price (sortable) |
| `min_normal_price` | INTEGER DEFAULT 0 | PDD API | — | Single purchase price |

#### Tier 2: JSONB Columns (display-only, no filtering needed)

| Column | Type | Content |
|--------|------|---------|
| `specifications` (existing, extended) | JSONB | `{"spec_weight": "2kg", "origin": "法国", "shelf_life": "18个月", "special_formula": ["无谷", "低敏"], "nutrition_highlight": "粗蛋白≥36%", "goods_eval_score": 4.7, "goods_eval_count": 3200, "coupon_discount": 20.00, "sales_tip": "已拼1.2万件"}` |
| `gallery_urls` | JSONB DEFAULT '[]' | `["https://...img1", "https://...img2"]` |
| `detail_img_urls` | JSONB DEFAULT '[]' | `["https://...detail1", "https://...detail2"]` |
| `service_tags` | JSONB DEFAULT '[]' | `["24小时发货", "假一赔十"]` |
| `ingredients` | JSONB DEFAULT '[]' | `["鸡肉", "糙米", "鸡油", ...]` |
| `nutrition` | JSONB DEFAULT '{}' | `{"粗蛋白": "≥32%", "粗脂肪": "≥15%"}` |
| `ratings` (existing, extended) | JSONB | `{"overall": 4.5, "recommend_rate": 85}` |

**Migration note**: `brand`, `spec_form`, `age_range` already exist in `specifications` JSONB (v2 implementation). Migration extracts them to top-level columns — a one-time data migration is required for existing products.

### New Table: `promotion_url_cache`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PK | |
| `goods_id` | VARCHAR(64) | NOT NULL | PDD goods_id |
| `pid` | VARCHAR(64) | NOT NULL | Promotion position ID |
| `short_url` | VARCHAR(256) | NOT NULL | Generated short URL |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Cache expiry (now + 12h) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| | | **UNIQUE**(goods_id, pid) | |

### Table `search_strategies`: PRESERVED

The `search_strategies` table remains **unchanged**. It stores PDD search configurations for auto-discovery — the PDD search API is still used to find products and get their goods_ids + basic info. The downstream enrichment pipeline (httpx + Vision LLM) is an independent, pluggable layer that processes whatever goods_ids are discovered.

### Table `external_products`: PRESERVED

The `external_products` table continues to serve as the canonical mapping between internal products and PDD goods_id. The `pid` field (promotion position ID) already exists in the v2 schema and is used for promotion URL generation.

---

## 五、API Contract Delta

### New Endpoints

#### 5.1 Generate Promotion URL

```
GET /api/v1/products/{product_id}/promotion-url
```
**Auth**: Public (mini program users)

**Response** (200):
```json
{
  "short_url": "https://p.pinduoduo.com/xxxxx",
  "mobile_url": "https://mobile.yangkeduo.com/...",
  "we_app_url": "https://...",
  "cached": true
}
```

### Modified Endpoints

#### 5.2 Manual Seed Product (MODIFIED)

```
POST /api/v1/admin/collect/products/seed
```

**Request Body** (v3):
```json
{
  "category_id": 2,
  "product_name": "皇家幼猫粮K36",
  "pdd_url": "https://mobile.yangkeduo.com/goods.html?goods_id=123456",
  "pet_type": "cat"
}
```

**NEW field**: `pet_type` (required, values: `"cat"` | `"dog"`)

#### 5.3 SSE Discovery Progress (MODIFIED)

```
GET /api/v1/admin/collect/products/discovery-progress?job_id={job_id}
```

**Response** (200): Server-Sent Events with **two-phase** progress

```
event: progress
data: {"phase": "discovery", "found": 100, "new": 45, "skipped": 55, "failed": 0}

event: progress
data: {"phase": "enrichment", "total": 45, "completed": 12, "failed": 1}

event: complete
data: {"found": 100, "new": 45, "enriched": 44, "failed": 1, "total_time_seconds": 350}
```

### Preserved Endpoints (No Changes)

| Endpoint | Status |
|----------|--------|
| `GET /api/v1/admin/collect/strategies` | UNCHANGED — search strategy list |
| `POST /api/v1/admin/collect/strategies` | UNCHANGED — create strategy |
| `POST /api/v1/admin/collect/strategies/{id}/execute` | UNCHANGED — execute strategy (now triggers two-phase pipeline) |
| `DELETE /api/v1/admin/collect/strategies/{id}` | UNCHANGED — delete strategy |
| All collection job / monitoring endpoints | UNCHANGED |
| All XHS review endpoints | UNCHANGED |
| All data source config endpoints | UNCHANGED |

---

## 六、Product Initialization Pipeline (v3)

### Two-Phase Architecture: Discovery → Enrichment

```
Phase 1: DISCOVERY (how to find products)
═══════════════════════════════════════════

    ┌─────────────────────────┐      ┌─────────────────────────┐
    │  Search Strategy Auto-  │      │  Manual Seed            │
    │  Discovery              │      │  (goods_id + pet_type)  │
    │                         │      │                         │
    │  PDD Search API →       │      │                         │
    │  goods_id list +        │      │                         │
    │  basic info             │      │                         │
    └───────────┬─────────────┘      └───────────┬─────────────┘
                │                                 │
                └─────────────┬───────────────────┘
                              │
                              ▼
                    Products created
                    status → PENDING
                              │
Phase 2: ENRICHMENT (how to get rich detail)
═══════════════════════════════════════════
                              │
            ┌─────────────────┴──────────────────┐
            │  For each PENDING product:          │
            └─────────────────┬──────────────────┘
                              │
                              ▼
┌──────────────────────┐
│  Step 1: httpx 爬取   │  NEW (replaces Playwright)
│  带 Cookie 直接请求    │
│                       │
│  输入: goods_id        │
│  输出: title,          │
│        gallery_urls    │
│        detail_img_urls │
│        mall_name       │
│        service_tags    │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Step 2: LLM 提取     │  UNCHANGED from v2
│  从标题解析属性        │
│                       │
│  输入: title           │
│  输出: brand,          │
│        spec_weight,    │
│        spec_form,      │
│        age_range,      │
│        special_formula │
│        nutrition_      │
│        highlight       │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Step 3: Vision LLM   │  NEW
│  识别成分表            │
│                       │
│  输入: detail_img_urls │
│  输出: ingredients,   │
│        nutrition      │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│  Step 4: 多多进宝 API  │  MODIFIED (price/commission only)
│  获取价格+佣金         │
│                       │
│  输入: goods_id        │
│  输出: min_group_price  │
│        min_normal_price │
│        coupon_discount  │
│        promotion_rate   │  NEW
│        sales_tip        │
│        goods_sign       │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────┐
│  Step 5: XHS 评价采集  │  UNCHANGED (async, non-blocking)
│  用户评价              │
│                       │
│  输入: title + brand   │
│  输出: reviews ──► LLM │
│        analysis        │
└──────────┬────────────┘
           │
           ▼
     保存到数据库
     status → ACTIVE
```

**Key**: Steps 1-4 are synchronous per-product. Step 5 (XHS) is triggered asynchronously and does not block the status transition to ACTIVE.

---

## 七、New Infrastructure Dependencies

| Dependency | Purpose | v2 Status |
|------------|---------|-----------|
| `httpx` (Python) | HTTP client for PDD page scraping with session cookies | **NEW** |
| `playwright` (Python) | Browser login + cookie export (login_pdd.py only, not used in crawler) | **NEW** |
| `playwright chromium` | Browser binary for login script (~150MB, dev-only) | **NEW** |
| Qwen-VL-Plus (阿里云百炼) | Vision LLM for ingredient recognition | **NEW** |
| Redis (optional, PG fallback) | Promotion URL cache | **NEW** |
| `openai` (Python, for Qwen-VL) | Vision LLM API client | **NEW** |

---

## 八、Edge Cases (Delta)

**New edge cases from HTTP scraping:**
- PDD session cookies expire → crawler detects `needLogin` in response data, product marked FAILED, operator re-runs `login_pdd.py` to refresh cookies
- PDD changes `window.rawData` structure → crawler returns empty result, product marked as FAILED with "data extraction error"  
- PDD anti-bot blocks HTTP client (TLS fingerprint) → If detected, can fall back to Playwright CDP approach (previous architecture)
- No daily browser quota → rate-limited only by inter-request delay (8-15s), unlike Playwright's 200/day hard limit

**New edge cases from vision LLM:**
- Vision LLM API rate limit / quota exhausted → Remaining images skipped, ingredients/nutrition fields left empty, product still transitions to ACTIVE
- Image URL expired (CDN TTL) → Vision LLM receives 404, skips image, continues to next
- Image is not a food product (e.g., toy, supplement) → Vision LLM returns `type: "其他"`, no ingredients/nutrition populated

**Modified edge case (from v2):**
- PDD API daily quota (2000 calls) is now shared between three consumers: search discovery, price refresh, and promotion URL generation. The system prioritizes price refresh > promotion URL > search discovery when quota is low.

---

## 九、Success Criteria Delta

### Modified Criteria

| SC | Change |
|----|--------|
| SC-001 | **MODIFIED**: An operator can seed a product (goods_id + pet_type) and see it fully populated (httpx data + LLM extraction + vision LLM ingredients + PDD price) within 15 minutes |
| SC-002 | **MODIFIED**: 90% of httpx crawl attempts complete successfully |
| SC-006 | **MODIFIED**: Hourly price + commission updates complete for all active products (up to 500) within 30 minutes |

### New Criteria

- **SC-011**: Vision LLM ingredient recognition achieves 80% extraction rate for products that actually contain ingredient images in their detail gallery
- **SC-012**: Promotion URL generation completes in under 2 seconds for cached URLs, under 5 seconds for fresh API calls
- **SC-013**: HTTP fetch of a single product detail page completes in under 10 seconds (including 8-15s inter-request delay)

---

## 十、Assumptions Delta

### New Assumptions

- PDD session cookies, once exported to `pdd_cookies.json`, remain valid for the lifetime of the PDD login session (typically several days to weeks)
- `login_pdd.py` (Playwright-based) is only needed when cookies expire — regular crawling uses `httpx` with no browser required
- PDD mobile product pages continue to expose `window.rawData` with the current structure; if PDD changes this, the scraper will need updates
- Qwen-VL-Plus (via 阿里云百炼 DASHSCOPE_API_KEY) is available and the API key is configured
- Redis is available for promotion URL caching; PostgreSQL acts as fallback if Redis is unavailable
- The mini program frontend can handle the new `/products/{id}/promotion-url` endpoint without modification to existing flows
- Search strategies (PDD search API for discovery) remain the primary product acquisition method; the downstream enrichment pipeline (httpx + Vision LLM) is transparent to the discovery layer
- `pet_type` is a top-level required field rather than derived from LLM analysis or stored in JSONB

### Retained Assumptions (from v2)

- PDD Duoduo Jinbao API credentials and daily 2000-call quota remain sufficient
- XHS cookie-based auth continues to work
- LLM service is shared between v2 and v3 features

---

## 十一、Delta Tasks Overview

New tasks required to implement the v3 changes (detailed task breakdown deferred to delta-tasks.md):

| Phase | Description | Est. Tasks |
|-------|-------------|------------|
| D1 | Add httpx + vision LLM dependencies (`httpx`, `openai`) to `requirements.txt` | 2 |
| D2 | Create `pdd_crawler.py` — httpx-based scraper for PDD `window.rawData` | 1 |
| D3 | Create `vision_service.py` — Qwen-VL-Plus client for ingredient/nutrition extraction | 1 |
| D4 | Create `promotion_url_service.py` — promotion URL generation + 12h PostgreSQL cache | 1 |
| D5 | Modify `collection_service.py` — insert httpx (Step 1) + Vision LLM (Step 3) into enrichment pipeline | 1 |
| D6 | Modify hourly price refresh job — add `promotion_rate` to fetched fields | 1 |
| D7 | Add `GET /api/v1/products/{id}/promotion-url` public endpoint | 1 |
| D8 | Add `pet_type` field to product seed API schema + admin seed form UI | 2 |
| D9 | Database migration: new columns on `products` (goods_name, gallery_urls, detail_img_urls, mall_name...), new `promotion_url_cache` table | 1 |
| D10 | Update SSE discovery progress to report two-phase progress (discovery + enrichment) | 1 |
| D11 | Add tests for PDD crawler, vision LLM, promotion URL service | 3 |
| | **Total** | **~15** |

---

## Clarifications

### Session 2026-05-16 (httpx 改版)

- Q: Playwright 有检测风险怎么办？→ A: **改用 httpx + Cookie**。Playwright 仅在 `login_pdd.py` 登录时使用，爬虫用 `httpx` 直接请求（无浏览器特征），PDD 无法检测自动化。
- Q: Cookie 过期了怎么办？→ A: 重跑 `login_pdd.py` 重新登录导出。`save_session.py` 提供 CDP 方式从运行中浏览器提取 Cookie 作为备选。
- Q: `pdd_crawler.py` 不再需要 Playwright？→ A: 正确。爬虫用 `httpx.AsyncClient` + Cookie，通过正则提取 `window.rawData`。Playwright 依赖仅保留在 `login_pdd.py` 和 `save_session.py`。

### Session 2026-05-15

- Q: Should `search_strategies` be removed? → A: 保留。搜索策略负责 PDD 搜索 API 发现商品，httpx+VLLM 负责详情深挖，两者正交。
- Q: Should new enrichment fields be top-level columns or JSONB? → A: **分层策略** — 高频查询/筛选字段升顶层并建索引（goods_name, brand, spec_form, age_range, mall_name, pet_type, promotion_rate, prices），大块展示数据留 JSONB（specifications, gallery_urls, detail_img_urls, service_tags, ingredients, nutrition）。

### Resolved Questions

| # | Question | Status | Decision |
|---|----------|--------|----------|
| Q1 | Should `search_strategies` be removed? | ✅ **RESOLVED** | 保留搜索策略功能 |
| Q2 | JSONB vs top-level columns for LLM-extracted fields? | ✅ **RESOLVED** | 分层策略：brand/spec_form/age_range 升顶层；spec_weight/origin/special_formula 留 JSONB |
| Q3 | JSONB vs top-level for httpx scraper fields? | ✅ **RESOLVED** | 分层策略：goods_name/mall_name 升顶层；gallery_urls/detail_img_urls/service_tags 留 JSONB |
