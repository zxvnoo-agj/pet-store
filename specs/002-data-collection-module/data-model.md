# Data Model: Data Collection & Enrichment Module

**Date**: 2026-05-17 (updated from 2026-05-14)
**Feature**: 002-data-collection-module
**Based on**: Feature spec + research.md + Actual implemented database (backend/app/models/*.py + alembic migrations)

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-17 | Corrected to match actual implementation | Original design assumed JSONB-only enrichment; actual implementation promoted frequently-queried fields to indexed top-level columns for query performance |

## Summary of Changes

This feature introduces 5 new tables and modifies 3 existing tables. All changes are additive — no columns removed or repurposed.

### New Tables
| Table | Purpose |
|-------|---------|
| `data_sources` | External data source configurations (PDD, XHS) |
| `search_strategies` | Saved PDD search configurations for auto-discovery |
| `external_products` | Maps internal products to PDD goods_id |
| `price_history` | Tracks price changes over time |
| `promotion_url_cache` | Caches PDD promotion short URLs by goods_sign+pid |

### Modified Tables
| Table | Changes |
|-------|---------|
| `products` | Add 12 top-level columns + TSVECTOR for FTS + extend source_url; extend status values |
| `reviews` | Add 4 XHS-specific columns (external_note_id, author, note_published_at, note_likes) |
| `data_fetch_jobs` | Add 3 collection-related columns (collection_type, product_id, cursor_value) |

---

## Entity Relationship Diagram

```
┌───────────────────┐       ┌──────────────────┐
│ search_strategies │       │   data_sources    │
├───────────────────┤       ├──────────────────┤
│ id (PK)           │──┐    │ id (PK)           │──────┐
│ data_source_id(FK)│─┘    │ name              │      │
│ name              │       │ platform          │      │
│ keywords (JSONB)  │       │ config (JSONB)    │      │
│ opt_id            │       │ is_active         │      │
│ price_min         │       │ sync_interval_    │      │
│ price_max         │       │   minutes         │      │
│ sort_type         │       │ last_sync_at      │      │
│ max_items         │       │ created_at        │      │
│ brand_filter(JSONB)│      │ updated_at        │      │
│ last_run_at       │       └──────────────────┘      │
│ last_result(JSONB)│                                  │
│ created_at        │       ┌──────────────────┐      │
│ updated_at        │       │ data_fetch_jobs  │      │
└───────────────────┘       ├──────────────────┤      │
                            │ id (PK)           │      │
┌───────────────────┐       │ data_source_id(FK)│◄────┘
│ external_products │       │ job_type          │
├───────────────────┤       │ status            │
│ id (PK)           │       │ collection_type   │
│ product_id (FK)   │────┐  │ product_id (FK)   │
│ source_id (FK)    │──┐ │  │ cursor_value      │
│ platform          │  │ │  │ params (JSONB)    │
│ external_id       │  │ │  │ result (JSONB)    │
│ external_url(2048)│  │ │  │ error_message     │
│ pid               │  │ │  │ started_at        │
│ is_primary        │  │ │  │ completed_at      │
│ created_at        │  │ │  │ created_at        │
└───┬───────────────┘  │ │  └──────────────────┘
    │                  │ │
    ▼                  │ │
┌───────────┐          │ │  ┌──────────────┐
│ products  │◄─────────┘ │  │ price_history│
│ (MODIFIED)│◄───────────┘  ├──────────────┤
│ +12 cols  │               │ id (PK)      │
│ +search   │               │ product_id(FK)│
│  _vector  │               │ source_id(FK)│
└─────┬─────┘               │ price        │
      │                     │ group_price  │
      ▼                     │ single_price │
┌───────────┐               │ coupon_      │
│ reviews   │               │   discount   │
│ (MODIFIED)│               │ recorded_at  │
│ +4 cols   │               └──────────────┘
└─────┬─────┘
      │
      ▼
┌───────────────────┐
│ promotion_url_cache│
│ (NEW)             │
│ id (PK)           │
│ goods_sign        │
│ pid               │
│ short_url         │
│ mobile_url        │
│ we_app_url        │
│ expires_at        │
│ created_at        │
└───────────────────┘
```

---

## New Tables

### data_sources

External data source configurations for PDD, XHS, and potentially other platforms.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| name | VARCHAR(64) | NOT NULL | Display name (e.g., "拼多多多多进宝") |
| platform | VARCHAR(32) | NOT NULL | Platform identifier: 'pdd', 'xiaohongshu', etc. |
| config | JSONB | DEFAULT '{}' | API keys, endpoints, cookies |
| is_active | BOOLEAN | DEFAULT true | Whether this source is enabled |
| last_sync_at | TIMESTAMPTZ | nullable | Last successful sync time |
| sync_interval_minutes | INTEGER | DEFAULT 60 | Sync interval in minutes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### search_strategies

Saved PDD search configurations for auto-discovery. Operators can re-execute saved strategies with one click.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| data_source_id | INTEGER | NOT NULL, FK → data_sources(id) | Which data source (PDD) |
| name | VARCHAR(64) | NOT NULL | Human-readable name (e.g., "猫粮-销量排序") |
| keywords | JSONB | DEFAULT '[]' | Search keywords array: `["猫粮", "幼猫"]` |
| opt_id | INTEGER | nullable | PDD category opt ID |
| price_min | INTEGER | nullable | Price floor (yuan) |
| price_max | INTEGER | nullable | Price ceiling (yuan) |
| sort_type | INTEGER | DEFAULT 0 | 0=综合, 2=销量, 6=评价 |
| max_items | INTEGER | DEFAULT 100 | Max products per run |
| brand_filter | JSONB | DEFAULT '[]' | Brand filter list: `["皇家", "冠能"]` |
| last_run_at | TIMESTAMPTZ | nullable | Last execution time |
| last_result | JSONB | nullable | Summary: `{"new": 25, "skipped": 12, "failed": 3}` |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: `ix_search_strategies_ds` on data_source_id

### external_products

Maps internal products to PDD external identifiers. One product can have one primary external mapping.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| product_id | INTEGER | NOT NULL, FK → products(id), ON DELETE CASCADE | Internal product |
| source_id | INTEGER | NOT NULL, FK → data_sources(id) | Data source (PDD) |
| platform | VARCHAR(32) | NOT NULL, DEFAULT 'pdd' | Platform identifier |
| external_id | VARCHAR(64) | NOT NULL | PDD goods_id |
| external_url | VARCHAR(2048) | nullable | PDD product page URL (extended from 512) |
| pid | VARCHAR(64) | nullable | Duoduo Jinbao promotion position ID |
| is_primary | BOOLEAN | DEFAULT true | Whether this is the primary source for the product |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints**: UNIQUE(product_id, platform, external_id)
**Indexes**: `ix_external_products_external_id` on (platform, external_id)

### price_history

Tracks product price changes over time for trend analysis.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| product_id | INTEGER | NOT NULL, FK → products(id), ON DELETE CASCADE | Product |
| source_id | INTEGER | NOT NULL, FK → data_sources(id) | Data source |
| price | DECIMAL(10,2) | NOT NULL | Current price at recording time (group price after coupon) |
| group_price | DECIMAL(10,2) | nullable | PDD group purchase price |
| single_price | DECIMAL(10,2) | nullable | PDD single purchase price |
| coupon_discount | DECIMAL(10,2) | nullable | Coupon discount amount |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Recording timestamp |

**Indexes**: `ix_price_history_product` on (product_id, recorded_at DESC)

### promotion_url_cache

Caches PDD promotion short URLs keyed by goods_sign + pid. Used to avoid repeated API calls for the same product+promoter combination.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| goods_sign | VARCHAR(64) | NOT NULL | PDD goods sign (product fingerprint) |
| pid | VARCHAR(64) | NOT NULL | Promotion position ID |
| short_url | VARCHAR(256) | NOT NULL | Generated short promotion URL |
| mobile_url | VARCHAR(512) | nullable | Mobile-optimized URL |
| we_app_url | VARCHAR(512) | nullable | WeChat mini program URL |
| expires_at | TIMESTAMPTZ | NOT NULL | Cache expiry time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints**: UNIQUE(goods_sign, pid) as `uq_promotion_cache_goods_pid`

---

## Modified Tables

### products (MODIFIED)

**Existing table** (`backend/app/models/product.py`). Original columns from Feature 001: `id`, `category_id`, `name`, `brand`, `price_min`, `price_max`, `currency`, `image_urls`, `pros`, `cons`, `ratings`, `description`, `ingredients`, `specifications`, `source_url`, `source_platform`, `status`, `created_at`, `updated_at`.

#### New Top-Level Columns (12 added)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| goods_name | VARCHAR(255) | nullable | Original PDD goods title (raw) |
| spec_form | VARCHAR(16) | nullable | Product form: 干粮/湿粮/冻干/零食/罐头/保健品/用品/玩具 |
| age_range | VARCHAR(32) | nullable | Applicable age: "幼猫(4-12月)", "成猫", "全阶段" |
| mall_name | VARCHAR(128) | nullable | PDD store name |
| pet_type | VARCHAR(16) | 'cat' | Pet type: 'cat', 'dog', etc. |
| promotion_rate | INTEGER | 0 | PDD promotion commission rate (percent, e.g., 20 = 20%) |
| min_group_price | INTEGER | 0 | Minimum group purchase price (fen) |
| min_normal_price | INTEGER | 0 | Minimum single purchase price (fen) |
| gallery_urls | JSONB | '[]' | Product gallery image URLs |
| detail_img_urls | JSONB | '[]' | Product detail page image URLs |
| service_tags | JSONB | '[]' | Service tags: ["退货包运费", "极速退款"] |
| nutrition | JSONB | '{}' | Nutrition details: `{"粗蛋白": "≥36%", "粗脂肪": "≥18%"}` |
| search_vector | TSVECTOR | nullable | PostgreSQL full-text search vector (auto-generated by trigger) |

**Indexes** (new):
- `ix_products_goods_name` on goods_name
- `ix_products_spec_form` on spec_form
- `ix_products_age_range` on age_range
- `ix_products_mall_name` on mall_name
- `ix_products_pet_type` on pet_type
- `ix_products_search_vector` GIN index on search_vector (full-text search)
- `ix_products_status` on status (existing)

#### Column Modifications

| Field | Before | After | Reason |
|-------|--------|-------|--------|
| source_url | VARCHAR(256) | VARCHAR(2048) | PDD URLs can exceed 256 chars |
| brand | VARCHAR(64) nullable | (unchanged) | Data migration: extracted from `specifications -> 'brand'` to top-level column for indexing |

#### Status Values

The `status` column (VARCHAR(16), default 'pending') accepts these values:

```
PENDING  ──► ENRICHING ──► ACTIVE ──► INACTIVE
   ▲            │             │
   │            ▼             │
   └── FAILED ◄──             │
   (manual retry)             ▼
                          DELETED
```

- `pending`: Product record created, awaiting data collection
- `enriching`: Data fetch or LLM extraction in progress
- `active`: All data collected and ready for display
- `failed`: Data collection failed; manual retry returns to pending
- `inactive`: Operator manually deactivated
- `deleted`: Soft-deleted

#### JSONB Column Usage (Existing Columns Retained)

The `specifications` JSONB column still stores supplementary structured data that doesn't need indexed queries:

```json
{
  "group_price": 79.90,
  "single_price": 99.00,
  "coupon_discount": 20.00,
  "coupon_start_time": "2026-05-01",
  "coupon_end_time": "2026-05-31",
  "sales_tip": "已拼1.2万件",
  "goods_eval_score": 4.7,
  "goods_eval_count": 3200,
  "mall_cps": 4.8,
  "spec_weight": "2kg",
  "origin": "法国",
  "shelf_life": "18个月",
  "special_formula": ["无谷", "低敏"],
  "nutrition_highlight": "粗蛋白≥36%，添加益生菌"
}
```

The `ratings` JSONB column:

```json
{
  "overall": 4.5,
  "recommend_rate": 85
}
```

### reviews (MODIFIED)

**Existing table** (`backend/app/models/review.py`) — 4 new columns added:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| external_note_id | VARCHAR(64) | nullable, indexed | XHS note ID for deduplication |
| author | VARCHAR(64) | nullable | XHS note author (stored, filtered from public API per FR-017) |
| note_published_at | TIMESTAMPTZ | nullable | When the XHS note was originally published |
| note_likes | INTEGER | nullable | Like count on the XHS note |

**Existing columns used for XHS data**:
- `source` = `'crawled'` for XHS-sourced reviews
- `source_url` = XHS note URL (VARCHAR(256))
- `llm_review_result` JSONB stores LLM analysis output:
  ```json
  {
    "confidence": 0.85,
    "cat_mood": "很爱吃",
    "summary": "猫咪非常喜欢，颗粒大小适中"
  }
  ```
- `tags` JSONB = extracted pros/cons tags from LLM
- `is_recommended` = recommendation stance
- `content` = note body text
- `images` = note image URLs
- `rating` = derived from recommendation (5 for recommended, 1 for not, 3 for neutral)

**Indexes**:
- `ix_reviews_external_note_id` on external_note_id

### data_fetch_jobs (MODIFIED)

**Existing table** (`backend/app/models/data_source.py`) — 3 columns added:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| collection_type | VARCHAR(16) | DEFAULT 'full' | 'full' or 'incremental' |
| cursor_value | TIMESTAMPTZ | nullable | Timestamp cursor for incremental sync |
| product_id | INTEGER | nullable, FK → products(id) | Product targeted by this job (null for batch jobs) |

**Existing columns**: `id`, `data_source_id` (FK → data_sources), `job_type`, `status`, `params`, `result`, `error_message`, `started_at`, `completed_at`, `created_at`

---

## Migration History

The following Alembic migrations implement the above changes (in order):

| # | Revision | Description |
|---|----------|-------------|
| 1 | `6b16b5c8d143` | Initial schema: categories, users, products, reviews, chat_sessions, chat_messages, favorites |
| 2 | `7a2f3e8b9c4d` | Add `is_admin` to users |
| 3 | `b4d8e2f6a0c3` | Add performance indexes |
| 4 | `a3b7c1d9e5f2` | Add full-text search (search_vector + trigger + GIN index) |
| 5 | `c5e1f3a7b9d2` | Add data collection tables (data_sources, search_strategies, external_products, price_history, data_fetch_jobs) + XHS columns on reviews + seed data_sources |
| 6 | `d9a8f0e2b7c1` | Add collection_type, product_id, cursor_value to data_fetch_jobs |
| 7 | `e1f2a3b4c5d6` | Delta v3: 8 top-level product columns (goods_name, spec_form, age_range, mall_name, pet_type, promotion_rate, min_group_price, min_normal_price) + 4 JSONB columns (gallery_urls, detail_img_urls, service_tags, nutrition) + promotion_url_cache table + data migration from specs JSONB |
| 8 | `f2a3b4c5d6e7` | Extend products.source_url from 256 to 2048 |
| 9 | `g1a2b3c4d5e6` | Extend external_products.external_url from 512 to 2048 |
| 10 | `h1a2b3c4d5e6` | Add brand_filter JSONB to search_strategies |

---

## Updates from Original Design (2026-05-14)

The following changes were made during implementation that deviate from the original design document. This document (2026-05-17) reflects the actual implemented state.

| Aspect | Original Design | Actual Implementation | Rationale |
|--------|-----------------|----------------------|-----------|
| products: spec_form, age_range, mall_name | Stored in `specifications` JSONB | Top-level VARCHAR columns with indexes | Frequently filtered and queried; JSONB path queries are slower |
| products: pet_type | Not in design | Top-level VARCHAR(16) DEFAULT 'cat' | Needed for multi-pet filtering |
| products: goods_name | Not in design | Top-level VARCHAR(255) | Raw searchable PDD title separate from cleaned `name` |
| products: promotion_rate | Not in design | Top-level INTEGER DEFAULT 0 | Commission rate needed for promotion URL generation |
| products: min_group_price, min_normal_price | In specifications JSONB as group_price/single_price | Top-level INTEGER columns (fen) | Price range queries need indexed columns |
| products: gallery_urls, detail_img_urls | In image_urls or not specified | Separate JSONB columns | Distinct from main image_urls; gallery for listing, detail for product page content |
| products: service_tags | Not in design | JSONB DEFAULT '[]' | PDD service badges ("退货包运费" etc.) |
| products: nutrition | Not in design | JSONB DEFAULT '{}' | LLM-extracted nutrition facts separate from ingredients |
| products: source_url | VARCHAR(256) | VARCHAR(2048) | PDD URLs with tracking params exceed 256 |
| products: search_vector | Not in design | TSVECTOR with GIN index + auto-update trigger | Full-text search on name+brand+description |
| products: brand extraction | Manual fill | Data migration from specs JSONB to top-level | Original data stored brand in JSONB; extracted for indexing |
| search_strategies: brand_filter | Not in design | JSONB DEFAULT '[]' | Needed to filter auto-discovery by brand |
| external_products: external_url | VARCHAR(512) | VARCHAR(2048) | PDD product URLs with all params exceed 512 |
| data_sources: sync_interval | Field named `sync_interval` | Field named `sync_interval_minutes` | Clarifies unit in column name |
| promotion_url_cache | Not in design | New table (5 columns) | Avoids redundant PDD API calls for same goods_sign+pid pairs |
