# API Contracts: Data Collection Refinement

**Date**: 2026-05-17
**Feature**: 003-data-collection-refinement

## Overview

All new endpoints are under `/api/v1/admin/collect/` (admin-only, requires authentication). These extend the existing admin collection API from Feature 002. No changes to existing public-facing or admin API endpoints.

---

## 1. Crawled Product Import

### 1.1 Import TXT Files

```
POST /api/v1/admin/collect/crawled/import
```

Triggers synchronous import of all `.txt` files from the `pet-store/pdd/` directory into the `crawled_products` table. Each file is parsed as JSONL; each line is one product record. Encoding is auto-detected (UTF-8 primary, GBK fallback).

**Request Body**: (optional)
```json
{
  "max_files": 200
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| max_files | int | 200 | Maximum files to process in this import (protection against large batches) |

**Response** (200):
```json
{
  "total_files": 50,
  "new_records": 30,
  "updated_records": 15,
  "failed_files": 5,
  "failed_details": [
    {"file": "product_42.txt", "reason": "goods_id缺失", "line": 1},
    {"file": "product_88.txt", "reason": "编码检测失败", "line": null},
    {"file": "batch_2026.txt", "reason": "JSON解析错误", "line": 3}
  ],
  "duration_seconds": 42.5
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| total_files | int | Total txt files found in directory |
| new_records | int | New goods_id records inserted |
| updated_records | int | Existing records updated (overwrite) |
| failed_files | int | Files that could not be fully parsed |
| failed_details | array | Per-file failure info (file name, reason, line number if applicable) |
| duration_seconds | float | Total import execution time |

**Error** (400):
```json
{
  "detail": "No .txt files found in pet-store/pdd/ directory"
}
```

**Error** (403):
```json
{
  "detail": "Insufficient permissions"
}
```

### 1.2 List Crawled Products

```
GET /api/v1/admin/collect/crawled/products
```

Browse the crawled product database. Supports filtering and pagination.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page (max 100) |
| goods_id | string | optional | Exact goods_id filter |
| import_status | string | optional | Filter: 'active' / 'invalid' |
| file_source | string | optional | Filter by source file name (substring match) |

**Response** (200):
```json
{
  "items": [
    {
      "id": 1,
      "goods_id": "123456789",
      "title": "皇家猫粮K36 2kg",
      "images": ["https://img.pddpic.com/xxx.jpg"],
      "crawl_timestamp": "2026-05-17T10:00:00",
      "file_source": "batch_001.txt",
      "import_status": "active",
      "created_at": "2026-05-17T10:05:00",
      "updated_at": "2026-05-17T10:05:00"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

### 1.3 Get Crawled Product Detail

```
GET /api/v1/admin/collect/crawled/products/{goods_id}
```

Retrieve full details of a single crawled product record, including raw content.

**Response** (200):
```json
{
  "id": 1,
  "goods_id": "123456789",
  "title": "皇家猫粮K36 2kg",
  "raw_content": "{\"goods_id\":\"123456789\",\"title\":\"...\"}",
  "raw_text": "皇家猫粮K36 2kg 商品描述...",
  "raw_html": "<html>...</html>",
  "images": ["https://img.pddpic.com/xxx.jpg"],
  "crawl_timestamp": "2026-05-17T10:00:00",
  "file_source": "batch_001.txt",
  "import_status": "active",
  "import_error": null,
  "created_at": "2026-05-17T10:05:00",
  "updated_at": "2026-05-17T10:05:00"
}
```

**Error** (404):
```json
{
  "detail": "Crawled product with goods_id 123456789 not found"
}
```

---

## 2. Product Enrichment (Re-Match)

### 2.1 Manual Re-Match Product

```
POST /api/v1/admin/collect/products/{product_id}/rematch
```

Manually trigger re-matching for a single product (FR-012). The system re-queries `crawled_products` for the product's goods_id, and if found, executes the full enrichment flow (LLM extract + goods.detail). Used for products that were previously "pending" and now have crawled data available, or for retrying failed enrichments.

**Response** (200):
```json
{
  "product_id": 99,
  "goods_id": "123456789",
  "matched": true,
  "status": "enriching",
  "message": "Product matched in crawled database. Enrichment started."
}
```

**Response when unmatched** (200):
```json
{
  "product_id": 100,
  "goods_id": "999999999",
  "matched": false,
  "status": "pending",
  "message": "Product not found in crawled database. Status remains pending."
}
```

**Error** (404):
```json
{
  "detail": "Product 99 not found"
}
```

**Error** (400):
```json
{
  "detail": "Product 99 does not have a linked goods_id in external_products"
}
```

---

## 3. Enrichment Logs

### 3.1 List Enrichment Logs

```
GET /api/v1/admin/collect/enrichment/logs
```

View enrichment task execution logs (FR-013). These are `data_fetch_jobs` records with `job_type = 'enrich_match'`. Reuses the existing collection jobs infrastructure from Feature 002.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page |
| status | string | optional | pending/completed/failed |
| date_from | string | optional | ISO 8601 date filter (start) |
| date_to | string | optional | ISO 8601 date filter (end) |

**Response** (200):
```json
{
  "items": [
    {
      "id": 142,
      "job_type": "enrich_match",
      "status": "completed",
      "params": {
        "strategy_id": 1,
        "search_job_id": 42
      },
      "result": {
        "total_discovered": 100,
        "matched": 45,
        "unmatched": 55,
        "llm_success": 40,
        "llm_partial": 3,
        "llm_failed": 2,
        "detail_success": 43,
        "detail_failed": 0,
        "llm_field_completion_rate": 0.85
      },
      "error_message": null,
      "started_at": "2026-05-17T10:06:00Z",
      "completed_at": "2026-05-17T10:08:30Z",
      "created_at": "2026-05-17T10:06:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20
}
```

**Result JSONB Schema** (`result` field for `job_type = 'enrich_match'`):
```json
{
  "total_discovered": 100,
  "matched": 45,
  "unmatched": 55,
  "llm_success": 40,
  "llm_partial": 3,
  "llm_failed": 2,
  "detail_success": 43,
  "detail_failed": 0,
  "llm_field_completion_rate": 0.85
}
```

### 3.2 Get Enrichment Log Detail

```
GET /api/v1/admin/collect/enrichment/logs/{job_id}
```

Retrieve full detail of a single enrichment task, including per-product breakdown.

**Response** (200):
```json
{
  "id": 142,
  "job_type": "enrich_match",
  "status": "completed",
  "params": {
    "strategy_id": 1,
    "search_job_id": 42
  },
  "result": {
    "total_discovered": 100,
    "matched": 45,
    "unmatched": 55,
    "llm_success": 40,
    "llm_partial": 3,
    "llm_failed": 2,
    "detail_success": 43,
    "detail_failed": 0,
    "llm_field_completion_rate": 0.85,
    "products": [
      {
        "goods_id": "123456789",
        "product_id": 99,
        "match_status": "matched",
        "llm_status": "success",
        "llm_fields_extracted": ["brand", "spec_weight", "spec_form", "age_range"],
        "llm_fields_missing": ["shelf_life", "top_8_ingredients"],
        "detail_status": "success",
        "final_status": "active"
      },
      {
        "goods_id": "987654321",
        "product_id": 100,
        "match_status": "matched",
        "llm_status": "partial",
        "llm_fields_extracted": ["brand", "spec_form"],
        "llm_fields_missing": ["spec_weight", "origin", "shelf_life", "age_range", "special_formula", "top_8_ingredients", "nutrition_highlight"],
        "detail_status": "success",
        "final_status": "active"
      }
    ]
  },
  "error_message": null,
  "started_at": "2026-05-17T10:06:00Z",
  "completed_at": "2026-05-17T10:08:30Z",
  "created_at": "2026-05-17T10:06:00Z"
}
```

## 4. Integration Notes

### Existing 002 Endpoints (No Changes)

All existing 002 admin collection endpoints continue to work unchanged:

- `POST /api/v1/admin/collect/strategies/{id}/execute` — After strategy execution completes, 003's enrichment hook runs automatically. The existing SSE progress endpoint continues to work.
- `GET /api/v1/admin/collect/products?status=pending` — Now includes products marked pending by 003's matching step.
- `POST /api/v1/admin/collect/products/{id}/retry` — Existing retry can be used as fallback; the new `POST .../rematch` endpoint specifically targets the crawled-DB matching path.
- `GET /api/v1/admin/collect/jobs` — Now includes `job_type = 'enrich_match'` records.

### Pipeline Selection Logic (Service Layer)

When a product needs enrichment, the service layer dispatches based on crawled database availability:

```python
# Pseudocode for enrichment dispatch
if crawled_products_service.is_matched(goods_id):
    # 003 pipeline: crawled content → LLM → goods.detail
    await enrichment_service.enrich_from_crawled(product_id, goods_id)
else:
    # 002 pipeline fallback: PDD detail API → LLM from title
    await collection_service.enrich_from_pdd(product_id)
```

This dispatch logic is internal to the service layer — no API changes needed for clients.
