# Data Model: Goods Module SPU Refactor

**Date**: 2026-05-20  
**Feature**: 004-refract-goods  
**Based on**: Feature spec + research.md + Existing 001/002/003 data model

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-20 | Initial creation | Feature 004 design |
| 2026-05-21 | AI-assisted entry (no schema changes) | Added vision LLM for ingredient/nutrition extraction and text LLM for pros/cons generation — pure service layer, no DB changes |

## Summary of Changes

This feature introduces **2 new tables** and **1 modified table**. No existing tables are dropped.

### New Tables

| Table | Purpose |
|-------|---------|
| `spus` | Canonical product definitions (brand + category + name + model). Core of the SPU aggregation. |
| `spu_listings` | E-commerce seller listings linked to an SPU. Multiple listings per SPU. |

### Modified Tables

| Table | Change | Reason |
|-------|--------|--------|
| `products` | No schema changes | Existing table preserved for 001/002 backward compatibility. New SPUs are created independently. |

---

## New Table: spus

Canonical product master data. One row per unique product identity (brand × category × name × model).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| category_id | INTEGER | NOT NULL, FK → categories.id | Product category |
| brand | VARCHAR(64) | NOT NULL, indexed | Brand name (e.g., "Royal Canin") |
| name | VARCHAR(255) | NOT NULL, indexed | Product name (e.g., "Indoor Adult Cat Food") |
| model | VARCHAR(128) | NOT NULL | Model/spec identifier (e.g., "K36 2kg") |
| pet_type | VARCHAR(16) | NOT NULL, DEFAULT 'cat', indexed | 'cat' or 'dog' |
| description | TEXT | nullable | Long-form product description |
| ingredients | JSONB | DEFAULT '[]' | List of ingredients (e.g., ["Chicken", "Rice", "Corn"]) |
| nutrition | JSONB | DEFAULT '{}' | Nutrition facts (e.g., {"protein": "32%", "fat": "15%"}) |
| pros | JSONB | DEFAULT '[]' | List of advantages (e.g., ["High protein", "Grain-free"]) |
| cons | JSONB | DEFAULT '[]' | List of disadvantages |
| extra_attrs | JSONB | DEFAULT '{}' | Extensible key-value store for category-specific attributes |
| price_min | NUMERIC(10,2) | nullable | Computed minimum price across linked listings |
| price_max | NUMERIC(10,2) | nullable | Computed maximum price across linked listings |
| currency | VARCHAR(8) | DEFAULT 'CNY' | Currency code |
| image_urls | JSONB | DEFAULT '[]' | Primary product images (manually curated) |
| status | VARCHAR(16) | DEFAULT 'active', indexed | 'active' / 'inactive' / 'draft' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `uq_spus_brand_category_name_model` UNIQUE on (brand, category_id, name, model) — prevents duplicate SPUs
- `ix_spus_brand` on brand (filter by brand)
- `ix_spus_category_id` on category_id (filter by category)
- `ix_spus_pet_type` on pet_type (filter by pet type)
- `ix_spus_status` on status (filter active SPUs)
- `ix_spus_created_at` on created_at (time-range queries)

**Constraints**:
- UNIQUE(brand, category_id, name, model) — core SPU identity
- CHECK(pet_type IN ('cat', 'dog'))

---

## New Table: spu_listings

Individual e-commerce seller listings linked to an SPU. Multiple listings per SPU (different shops, prices).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| spu_id | INTEGER | NOT NULL, FK → spus.id, indexed | Parent SPU |
| platform | VARCHAR(32) | NOT NULL, indexed | E-commerce platform (e.g., 'pdd', 'taobao') |
| shop_name | VARCHAR(128) | NOT NULL | Seller shop name |
| goods_id | VARCHAR(64) | nullable, indexed | Platform-specific goods ID (e.g., PDD goods_id) |
| title | VARCHAR(512) | NOT NULL | Original listing title from platform |
| price | NUMERIC(10,2) | NOT NULL | Current price |
| original_price | NUMERIC(10,2) | nullable | Original/market price (for discount display) |
| url | VARCHAR(2048) | NOT NULL | Product detail page URL |
| image_url | VARCHAR(2048) | nullable | Listing thumbnail image |
| sales_count | INTEGER | nullable | Monthly sales (if available) |
| match_confidence | NUMERIC(5,4) | nullable | Matching confidence score (0.0-1.0) |
| match_status | VARCHAR(16) | DEFAULT 'linked', indexed | 'linked' / 'candidate' / 'unmatched' / 'rejected' |
| last_synced_at | TIMESTAMPTZ | nullable | Last price update timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | First linked timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `ix_spu_listings_spu_id` on spu_id (fast lookup of listings by SPU)
- `ix_spu_listings_platform` on platform (filter by platform)
- `ix_spu_listings_goods_id` on goods_id (deduplication + match lookup)
- `ix_spu_listings_match_status` on match_status (filter by match state)
- `ix_spu_listings_created_at` on created_at (time-range queries)
- UNIQUE(platform, goods_id) — prevents duplicate listings from same platform

**Constraints**:
- FK(spu_id) REFERENCES spus(id) ON DELETE CASCADE
- CHECK(price >= 0)
- CHECK(match_confidence >= 0 AND match_confidence <= 1)

---

## Entity Relationship Diagram

```
┌───────────────────┐         ┌───────────────────┐
│      spus         │         │   spu_listings    │
├───────────────────┤         ├───────────────────┤
│ id (PK)           │◄────────┤ id (PK)           │
│ category_id (FK)  │   1:N   │ spu_id (FK)       │
│ brand             │         │ platform          │
│ name              │         │ shop_name         │
│ model             │         │ goods_id          │
│ pet_type          │         │ title             │
│ description       │         │ price             │
│ ingredients       │         │ url               │
│ nutrition         │         │ match_confidence  │
│ pros              │         │ match_status      │
│ cons              │         │ last_synced_at    │
│ extra_attrs       │         │ created_at        │
│ price_min         │         │ updated_at        │
│ price_max         │         └───────────────────┘
│ currency          │
│ image_urls        │
│ status            │
│ created_at        │
│ updated_at        │
└───────────────────┘
         │
         │ FK
         ▼
┌───────────────────┐
│    categories     │
├───────────────────┤
│ id (PK)           │
│ name              │
│ pet_type          │
│ parent_id         │
│ ...               │
└───────────────────┘
```

---

## Relationship to Existing Entities

```
┌───────────────────┐
│      spus         │  (NEW - 004)
├───────────────────┤
│ id (PK)           │
│ brand, name, model│
│ price_min/max     │
└───────────────────┘
         ▲
         │ 1:N
┌───────────────────┐
│   spu_listings    │  (NEW - 004)
├───────────────────┤
│ id (PK)           │
│ spu_id (FK)       │
│ platform          │
│ shop_name         │
│ price             │
│ url               │
└───────────────────┘
         ▲
         │ Populated from
         │
┌───────────────────┐       ┌───────────────────┐
│    products       │       │ crawled_products  │
│ (001/002 existing)│       │ (003 existing)    │
├───────────────────┤       ├───────────────────┤
│ id (PK)           │       │ id (PK)           │
│ ...               │       │ goods_id          │
└───────────────────┘       │ raw_content       │
                            └───────────────────┘

┌───────────────────┐
│    categories     │  (existing, shared)
├───────────────────┤
│ id (PK)           │
│ name              │
│ pet_type          │
└───────────────────┘
```

**Key Design Decisions**:
1. **SPU as new table**: `spus` is a new table rather than extending `products`. This preserves 001/002 functionality while enabling the new aggregation model.
2. **Listing ownership**: Each `spu_listing` belongs to exactly one SPU. Unlinked listings (from matching queue) are stored with `spu_id = NULL` temporarily, then updated when matched.
3. **Price materialization**: `spus.price_min` and `spus.price_max` are materialized (not computed on every query) for performance. Updated via trigger or application logic when listings change.
4. **Match status lifecycle**: `match_status` tracks the matching state: 'candidate' (medium confidence, in review queue) → 'linked' (confirmed) or 'rejected' (admin declined).

---

## Price Recalculation Flow

When a listing's price changes or a new listing is linked:

```
Trigger: listing price updated / new listing linked / listing unlinked
    │
    ▼
┌─────────────────────┐
│  Recalculate prices │  SQL:
│  for parent SPU     │  UPDATE spus
│                     │  SET price_min = (
│                     │    SELECT MIN(price) 
│                     │    FROM spu_listings 
│                     │    WHERE spu_id = ? AND match_status = 'linked'
│                     │  ),
│                     │  price_max = (
│                     │    SELECT MAX(price) 
│                     │    FROM spu_listings 
│                     │    WHERE spu_id = ? AND match_status = 'linked'
│                     │  ),
│                     │  updated_at = NOW()
│                     │  WHERE id = ?
└─────────────────────┘
```

---

## Migration Plan

**Alembic Migration**: `004_refract_goods_spu.py`

```python
# Operations:
# 1. CREATE TABLE spus (18 columns + indexes)
# 2. CREATE TABLE spu_listings (16 columns + indexes)  
# 3. CREATE INDEX ix_spu_listings_spu_id ON spu_listings(spu_id)
# 4. No ALTER TABLE on existing tables (products unchanged)
```

**Rollback**: 
- `DROP TABLE spu_listings` — cascades to all linked listings
- `DROP TABLE spus` — cascades to all SPUs
- Existing `products` table unaffected

---

## Data Integrity Rules

1. **SPU Uniqueness**: No two SPUs can share the same (brand, category_id, name, model) combination.
2. **Listing Deduplication**: No two listings can share the same (platform, goods_id) combination.
3. **Price Consistency**: `spus.price_min` ≤ `spus.price_max` always (enforced by recalculation logic).
4. **Currency Consistency**: All listings linked to an SPU should use the same currency as the SPU (enforced at application level).

---

## Query Patterns

### 1. SPU List with Price Range (Primary Admin View)

```sql
SELECT s.id, s.brand, s.name, s.model, s.pet_type,
       s.price_min, s.price_max, s.currency,
       c.name as category_name,
       COUNT(sl.id) as listing_count
FROM spus s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN spu_listings sl ON s.id = sl.spu_id AND sl.match_status = 'linked'
WHERE s.status = 'active'
GROUP BY s.id, c.name
ORDER BY s.updated_at DESC
LIMIT 20 OFFSET 0;
```

### 2. SPU Detail with Listings

```sql
-- SPU header
SELECT * FROM spus WHERE id = ?;

-- Linked listings
SELECT * FROM spu_listings 
WHERE spu_id = ? AND match_status = 'linked'
ORDER BY price ASC;
```

### 3. Matching Queue (Medium Confidence)

```sql
SELECT sl.*, s.brand as suggested_brand, s.name as suggested_name
FROM spu_listings sl
LEFT JOIN spus s ON sl.spu_id = s.id
WHERE sl.match_status = 'candidate'
ORDER BY sl.match_confidence DESC
LIMIT 50;
```

### 4. Unmatched Listings (Low Confidence)

```sql
SELECT * FROM spu_listings 
WHERE match_status = 'unmatched'
ORDER BY created_at DESC
LIMIT 50;
```
