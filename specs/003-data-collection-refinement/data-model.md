# Data Model: Data Collection Refinement

**Date**: 2026-05-17
**Feature**: 003-data-collection-refinement
**Based on**: Feature spec + research.md + Existing 002 data model

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-17 | Initial creation | Feature 003 design |

## Summary of Changes

This feature introduces 1 new table. No existing tables are modified (FR-009 — existing product attribute columns remain unchanged). No existing columns are removed or repurposed.

### New Tables

| Table | Purpose |
|-------|---------|
| `crawled_products` | Stores raw crawled product data imported from third-party crawler txt files. Used for goods_id matching and LLM extraction during enrichment. |

### Modified Tables

None. Existing product enrichment is handled through the service layer (conditional dispatch: matched → 003 pipeline, unmatched → 002 pipeline).

---

## New Table: crawled_products

Stores the raw and semi-structured output from the third-party crawler tool. Each record corresponds to one product entry from a JSONL txt file. The `goods_id` is the unique key — re-importing the same goods_id updates the existing record (FR-002).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| goods_id | VARCHAR(64) | NOT NULL, UNIQUE, indexed | PDD goods_id, unique key for matching with discovered products |
| title | VARCHAR(512) | nullable | Product title from crawled page |
| raw_content | TEXT | NOT NULL | Original JSONL line content (full raw JSON object) |
| raw_text | TEXT | nullable | Extracted plain text content, cleaned from HTML (for LLM input) |
| raw_html | TEXT | nullable | Raw HTML content from crawled page |
| images | JSONB | DEFAULT '[]' | List of product image URLs extracted from crawled content |
| crawl_timestamp | TIMESTAMPTZ | nullable | When the crawler captured this data (from `crawled_at` field) |
| file_source | VARCHAR(512) | nullable | Source txt file name this record was imported from |
| import_status | VARCHAR(16) | DEFAULT 'active' | Record status: 'active' (valid), 'invalid' (parse error) |
| import_error | TEXT | nullable | Error message if import_status is 'invalid' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | First import timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update/overwrite timestamp |

**Indexes**:
- `uq_crawled_products_goods_id` UNIQUE on goods_id (deduplication + fast lookup)
- `ix_crawled_products_goods_id` on goods_id (already covered by unique constraint)
- `ix_crawled_products_import_status` on import_status (filter valid records)
- `ix_crawled_products_created_at` on created_at (time-range queries)

**Constraints**:
- `goods_id` is NOT NULL and UNIQUE

---

## Relationship to Existing Entities

```
┌───────────────────┐
│  crawled_products  │  (NEW - 003)
├───────────────────┤
│ id (PK)            │
│ goods_id (UNIQUE)  │──┐  Matched by goods_id during enrichment
│ raw_content        │  │
│ raw_text           │  │
│ raw_html           │  │
│ images (JSONB)     │  │
│ crawl_timestamp    │  │
│ file_source        │  │
│ import_status      │  │
│ import_error       │  │
│ created_at         │  │
│ updated_at         │  │
└───────────────────┘  │
                       │  goods_id lookup (no FK — loose coupling)
                       ▼
┌───────────────────┐       ┌──────────────────┐
│ external_products │       │    products       │
│ (002 - existing)  │       │ (001/002 existing)│
├───────────────────┤       ├──────────────────┤
│ product_id (FK)   │──────►│ id (PK)           │
│ external_id       │       │ status            │
│ platform          │       │ brand, spec_form,  │
│ ...               │       │ age_range, etc.   │
└───────────────────┘       └──────────────────┘
                                   ▲
                                   │ FK (from data_fetch_jobs)
┌───────────────────┐              │
│ data_fetch_jobs   │              │
│ (002 - existing)  │──────────────┘
├───────────────────┤
│ job_type          │  NEW value: "enrich_match" for 003 enrichment tracking
│ status            │
│ result (JSONB)    │
│ ...               │
└───────────────────┘
```

**Key Design Decisions**:
1. **Loose coupling with external_products**: `crawled_products.goods_id` matches against `external_products.external_id` (which stores PDD goods_id) at query time. No FK constraint — the crawler may capture products that haven't been discovered by strategy search yet.
2. **No product FK**: `crawled_products` does not reference `products.id` directly. The match is done via goods_id during enrichment, and results are written to the `products` table. This keeps the crawled data independent of product lifecycle.
3. **Upsert on import**: When re-importing a goods_id that already exists in `crawled_products`, all fields are updated (FR-002: "覆盖旧数据"). The primary key `id` stays the same; `updated_at` is refreshed.

---

## Enrichment Flow Data Relationships

```
TXT File Import                  Strategy Search (002)
     │                                   │
     ▼                                   ▼
crawled_products              external_products
(goods_id=123)                (external_id=123, product_id=99)
     │                                   │
     │         MATCH QUERY               │
     └─────────────┬─────────────────────┘
                   │ SELECT cp.* FROM crawled_products cp
                   │ WHERE cp.goods_id = ep.external_id
                   │
                   ▼
              Enrichment Flow (003)
              ├─► LLM extraction from cp.raw_text + cp.images
              ├─► PDD goods.detail API for remaining fields
              └─► Write to products table (product_id=99)
                       │
                       ▼
                   products.status = "active"
```

---

## Migration Plan

**Alembic Migration**: `i1a2b3c4d5e6_crawled_products.py`

```python
# Operations:
# 1. CREATE TABLE crawled_products (11 columns + indexes)
# 2. No ALTER TABLE operations needed (no existing tables modified)
```

**Rollback**: `DROP TABLE crawled_products` — clean rollback with no data loss risk (table only contains imported crawl data, can be re-imported).

---

## Extensions to Existing Entity: data_fetch_jobs

No schema changes to `data_fetch_jobs`. The existing `job_type` VARCHAR(32) column accommodates a new value:

| job_type | Description | Used By |
|----------|-------------|---------|
| `enrich_match` | 003 enrichment task (match + LLM extract + goods.detail) | NEW — 003 |

The existing `result` JSONB column stores enrichment summary:
```json
{
  "total_discovered": 100,
  "matched": 45,
  "unmatched": 55,
  "llm_success": 40,
  "llm_partial": 3,
  "llm_failed": 2,
  "detail_success": 43,
  "detail_failed": 0
}
```

The existing `params` JSONB column stores enrichment context:
```json
{
  "strategy_id": 1,
  "search_job_id": 42
}
```

No new columns needed — the existing schema fully accommodates 003's logging requirements (FR-011).
