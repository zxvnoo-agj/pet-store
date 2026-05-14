# Data Model: Data Collection & Enrichment Module

**Date**: 2026-05-14
**Feature**: 002-data-collection-module
**Based on**: Feature spec + research.md + Actual implemented database

## Summary of Changes

This feature introduces 4 new tables and modifies 2 existing tables. All changes are additive — no columns removed or repurposed.

### New Tables
| Table | Purpose |
|-------|---------|
| `search_strategies` | Saved PDD search configurations for auto-discovery |
| `external_products` | Maps internal products to PDD goods_id |
| `price_history` | Tracks price changes over time |
| `data_sources` | External data source configurations (PDD, XHS) |

### Modified Tables
| Table | Changes |
|-------|---------|
| `products` | Add collection status values to `status` CHECK constraint |
| `reviews` | Add 4 XHS-specific columns |
| `data_fetch_jobs` | Add 3 collection-related columns |

---

## Entity Relationship Diagram (New & Modified Only)

```
┌───────────────────┐       ┌──────────────────┐
│ search_strategies │       │   data_sources    │
├───────────────────┤       ├──────────────────┤
│ id (PK)           │──┐    │ id (PK)           │──────┐
│ data_source_id (FK)│─┘    │ name              │      │
│ name              │       │ platform          │      │
│ keywords (JSONB)  │       │ config (JSONB)    │      │
│ opt_id            │       │ is_active         │      │
│ price_min         │       │ sync_interval     │      │
│ price_max         │       │ last_sync_at      │      │
│ sort_type         │       │ created_at        │      │
│ max_items         │       │ updated_at        │      │
│ last_run_at       │       └──────────────────┘      │
│ last_result(JSONB)│                                  │
│ created_at        │       ┌──────────────────┐      │
│ updated_at        │       │ data_fetch_jobs  │      │
└───────────────────┘       ├──────────────────┤      │
                            │ id (PK)           │      │
┌───────────────────┐       │ data_source_id(FK)│◄────┘
│ external_products │       │ job_type          │
├───────────────────┤       │ status            │
│ id (PK)           │       │ collection_type   │  NEW
│ product_id (FK)   │────┐  │ cursor_value      │  NEW
│ source_id (FK)    │──┐ │  │ product_id (FK)   │  NEW
│ platform          │  │ │  │ params (JSONB)    │
│ external_id       │  │ │  │ result (JSONB)    │
│ external_url      │  │ │  │ error_message     │
│ pid               │  │ │  │ started_at        │
│ is_primary        │  │ │  │ completed_at      │
│ created_at        │  │ │  │ created_at        │
└───┬───────────────┘  │ │  └──────────────────┘
    │                  │ │
    ▼                  │ │
┌───────────┐          │ │  ┌──────────────┐
│ products  │◄─────────┘ │  │ price_history│
│ (existing)│◄───────────┘  ├──────────────┤
│ status    │ MODIFIED      │ id (PK)      │
│ specs.    │ MODIFIED      │ product_id(FK)│
│ ratings   │ MODIFIED      │ source_id(FK)│
└─────┬─────┘               │ price        │
      │                     │ recorded_at  │
      ▼                     └──────────────┘
┌───────────┐
│ reviews   │
│ (existing)│
│ +4 columns│ MODIFIED
└───────────┘
```

---

## New Tables

### search_strategies

Saved PDD search configurations for auto-discovery. Operators can re-execute saved strategies with one click.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| data_source_id | INTEGER | NOT NULL, FK → data_sources(id) | Which data source (PDD) |
| name | VARCHAR(64) | NOT NULL | Human-readable name (e.g., "猫粮-销量排序") |
| keywords | JSONB | DEFAULT '[]' | Search keywords array: `["猫粮", "幼猫"]` |
| opt_id | INTEGER | | PDD category opt ID |
| price_min | INTEGER | | Price floor (yuan, converted to fen for API) |
| price_max | INTEGER | | Price ceiling (yuan) |
| sort_type | INTEGER | DEFAULT 0 | 0=综合, 2=销量, 6=评价 |
| max_items | INTEGER | DEFAULT 100 | Max products per run |
| last_run_at | TIMESTAMPTZ | | Last execution time |
| last_result | JSONB | | Summary: `{"new": 25, "skipped": 12, "failed": 3}` |
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
| external_url | VARCHAR(512) | | PDD product page URL |
| pid | VARCHAR(64) | | Duoduo Jinbao promotion position ID |
| is_primary | BOOLEAN | DEFAULT TRUE | Whether this is the primary source for the product |
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
| group_price | DECIMAL(10,2) | | PDD group purchase price |
| single_price | DECIMAL(10,2) | | PDD single purchase price |
| coupon_discount | DECIMAL(10,2) | | Coupon discount amount |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Recording timestamp |

**Indexes**: `ix_price_history_product` on (product_id, recorded_at DESC)

---

## Modified Tables

### products (MODIFIED)

**Existing table** (`backend/app/models/product.py`) — changes:

1. **Extend `status` CHECK constraint**: Add collection lifecycle values.
   - **Before**: `CHECK (status IN ('active', 'inactive', 'deleted'))`
   - **After**: `CHECK (status IN ('pending', 'enriching', 'active', 'failed', 'inactive', 'deleted'))`

2. **`specifications` JSONB — new keys populated by PDD API and LLM**:
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
     "mall_name": "皇家宠物食品旗舰店",
     "mall_cps": 4.8,
     "spec_weight": "2kg",
     "spec_form": "干粮",
     "origin": "法国",
     "shelf_life": "18个月",
     "age_range": "幼猫(4-12月)",
     "special_formula": ["无谷", "低敏"],
     "nutrition_highlight": "粗蛋白≥36%，添加益生菌"
   }
   ```

3. **`ratings` JSONB — new key**:
   ```json
   {
     "overall": 4.5,
     "recommend_rate": 85
   }
   ```

**Column-level changes**: NONE. All enrichment data goes into existing JSONB columns. The `status` values are extended via CHECK constraint update only.

**State Machine**:
```
PENDING  ──► ENRICHING ──► ACTIVE ──► INACTIVE
   ▲            │             │
   │            ▼             │
   └── FAILED ◄──             │
   (manual retry)             ▼
                          DELETED
```

### reviews (MODIFIED)

**Existing table** (`backend/app/models/review.py`) — 4 new columns added:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| external_note_id | VARCHAR(64) | nullable, UNIQUE | XHS note ID for deduplication |
| author | VARCHAR(64) | nullable | XHS note author (stored, filtered from public API per FR-017) |
| note_published_at | TIMESTAMPTZ | nullable | When the XHS note was originally published |
| note_likes | INTEGER | nullable | Like count on the XHS note |

**Existing columns used for XHS data**:
- `source` = `'crawled'` for XHS-sourced reviews
- `source_url` = XHS note URL
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
- `ix_reviews_external_note_id` on external_note_id (UNIQUE where not null)

### data_fetch_jobs (MODIFIED)

**Existing table** (`backend/app/models/data_source.py`) — DataFetchJob model. 3 new columns:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| collection_type | VARCHAR(16) | DEFAULT 'full' | 'full' or 'incremental' |
| cursor_value | TIMESTAMPTZ | nullable | Timestamp cursor for incremental sync |
| product_id | INTEGER | nullable, FK → products(id) | Product targeted by this job (null for batch jobs) |

---

## Migration Strategy

### Step 1: Schema Migration (Alembic)
1. Create `search_strategies` table
2. Create `external_products` table
3. Create `price_history` table
4. ALTER `reviews` — add 4 new columns
5. ALTER `data_fetch_jobs` — add 3 new columns
6. ALTER `products` — modify CHECK constraint for status
7. Create indexes

### Step 2: Seed Data
1. Insert PDD data source record into `data_sources`:
   ```
   name='拼多多多多进宝', platform='pdd', config={
     "client_id": "<from env>",
     "client_secret": "<from env>",
     "pid": "<from env>",
     "api_url": "https://gw-api.pinduoduo.com/api/router"
   }
   ```
2. Insert XHS data source record:
   ```
   name='小红书', platform='xiaohongshu', config={
     "cookie": "<from env>",
     "backup_cookie": "<from env>"
   }
   ```

### Step 3: Rollback
All changes are additive. Rollback drops new tables/columns and reverts the CHECK constraint. No data loss for existing tables.

---

## Validation Rules (New)

### external_products
- `platform` must be 'pdd' (only PDD supported in MVP)
- `external_id` must be non-empty
- (product_id, platform, external_id) must be unique

### search_strategies
- `name` must be non-empty, max 64 chars
- `data_source_id` must reference an active data source
- At least one of `keywords` or `opt_id` must be set

### price_history
- `price` must be >= 0
- `product_id` must reference an existing product
- `recorded_at` defaults to NOW() if not specified

### data_fetch_jobs (extended)
- `collection_type` must be 'full' or 'incremental'
- `cursor_value` required when `collection_type` = 'incremental'

### reviews (extended)
- `external_note_id` must be unique when not null
- `note_published_at` must be in the past when set
- `note_likes` must be >= 0 when set
