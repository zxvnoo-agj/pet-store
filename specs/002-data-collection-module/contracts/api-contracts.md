# API Contracts: Data Collection & Enrichment Module

**Date**: 2026-05-14
**Feature**: 002-data-collection-module

## Overview

All new endpoints are under `/api/v1/admin/collect/` (admin-only, requires authentication). No changes to existing public-facing API endpoints.

---

## 1. Search Strategies

### 1.1 List Search Strategies

```
GET /api/v1/admin/collect/strategies
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page |
| data_source_id | int | optional | Filter by data source |

**Response** (200):
```json
{
  "items": [
    {
      "id": 1,
      "data_source_id": 1,
      "name": "猫粮-销量排序",
      "keywords": ["猫粮", "幼猫"],
      "opt_id": null,
      "price_min": 100,
      "price_max": 500,
      "sort_type": 2,
      "max_items": 100,
      "last_run_at": "2026-05-14T09:00:00Z",
      "last_result": {"new": 25, "skipped": 12, "failed": 3},
      "created_at": "2026-05-14T08:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20
}
```

### 1.2 Create Search Strategy

```
POST /api/v1/admin/collect/strategies
```

**Request Body**:
```json
{
  "data_source_id": 1,
  "name": "猫粮-销量排序",
  "keywords": ["猫粮", "幼猫"],
  "opt_id": null,
  "price_min": 100,
  "price_max": 500,
  "sort_type": 2,
  "max_items": 100
}
```

**Response** (201):
```json
{
  "id": 1,
  "data_source_id": 1,
  "name": "猫粮-销量排序",
  ...
}
```

### 1.3 Execute Search Strategy

```
POST /api/v1/admin/collect/strategies/{strategy_id}/execute
```

**Response** (202):
```json
{
  "job_id": 42,
  "status": "pending",
  "message": "Strategy execution started. Products will be discovered and enriched asynchronously."
}
```

### 1.4 Delete Search Strategy

```
DELETE /api/v1/admin/collect/strategies/{strategy_id}
```

**Response** (204): No content

---

## 2. Product Collection

### 2.1 Manual Seed Product

```
POST /api/v1/admin/collect/products/seed
```

**Request Body**:
```json
{
  "category_id": 2,
  "product_name": "皇家幼猫粮K36",
  "pdd_url": "https://mobile.yangkeduo.com/goods.html?goods_id=123456"
}
```

**Response** (201):
```json
{
  "product_id": 99,
  "status": "pending",
  "message": "Product seeded. Data collection will begin shortly."
}
```

**Error** (409):
```json
{
  "detail": "Product with goods_id 123456 already exists (product_id: 45)"
}
```

### 2.2 Get Product Collection Status

```
GET /api/v1/admin/collect/products?status=pending&page=1&page_size=20
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | optional | Filter: pending/enriching/active/failed |
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page |

**Response** (200):
```json
{
  "items": [
    {
      "product_id": 99,
      "name": "皇家幼猫粮K36",
      "status": "enriching",
      "brand": null,
      "source_platform": "pdd",
      "created_at": "2026-05-14T09:05:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

### 2.3 Retry Failed Product Collection

```
POST /api/v1/admin/collect/products/{product_id}/retry
```

**Response** (200):
```json
{
  "product_id": 99,
  "status": "pending",
  "message": "Product collection retry triggered."
}
```

### 2.4 Get Auto-Discovery Progress (SSE)

```
GET /api/v1/admin/collect/products/discovery-progress?job_id={job_id}
```

**Response** (200): Server-Sent Events stream

```
event: progress
data: {"found": 45, "new": 25, "skipped": 12, "failed": 3, "stage": "searching"}

event: progress
data: {"found": 45, "new": 25, "skipped": 12, "failed": 3, "stage": "enriching"}

event: complete
data: {"found": 45, "new": 25, "skipped": 12, "failed": 3, "total_time_seconds": 184}
```

---

## 3. Collection Jobs (Logs)

### 3.1 List Collection Jobs

```
GET /api/v1/admin/collect/jobs
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | |
| page_size | int | 20 | |
| status | string | optional | pending/running/completed/failed |
| job_type | string | optional | discovery/detail/price/review |
| data_source_id | int | optional | Filter by data source |

**Response** (200):
```json
{
  "items": [
    {
      "id": 42,
      "data_source_id": 1,
      "data_source_name": "拼多多多多进宝",
      "job_type": "discovery",
      "collection_type": "full",
      "status": "completed",
      "product_id": null,
      "params": {"strategy_id": 1, "keyword": "猫粮"},
      "result": {"found": 100, "new": 45, "skipped": 52, "failed": 3},
      "error_message": null,
      "started_at": "2026-05-14T09:00:00Z",
      "completed_at": "2026-05-14T09:05:30Z",
      "created_at": "2026-05-14T09:00:00Z"
    }
  ],
  "total": 28,
  "page": 1,
  "page_size": 20,
  "failed_count": 3
}
```

Note: `failed_count` in response enables the admin badge counter.

### 3.2 Get Job Detail

```
GET /api/v1/admin/collect/jobs/{job_id}
```

**Response** (200): Single job object with all fields including `error_message`.

### 3.3 Retry Failed Job

```
POST /api/v1/admin/collect/jobs/{job_id}/retry
```

**Response** (200):
```json
{
  "new_job_id": 55,
  "status": "pending",
  "message": "Job retry queued."
}
```

---

## 4. XHS Reviews

### 4.1 Trigger XHS Collection for Product

```
POST /api/v1/admin/collect/products/{product_id}/xhs-collect
```

**Response** (202):
```json
{
  "job_id": 48,
  "status": "pending",
  "message": "XHS review collection queued for product 99."
}
```

### 4.2 Get XHS-sourced Reviews (Admin)

```
GET /api/v1/admin/reviews?source=crawled&product_id={product_id}
```

**Response** (200): Same structure as existing admin reviews endpoint, but includes `author`, `external_note_id`, `note_published_at`, `note_likes` fields visible only to admin.

---

## 5. Data Sources

### 5.1 List Data Sources

```
GET /api/v1/admin/collect/sources
```

**Response** (200):
```json
{
  "items": [
    {
      "id": 1,
      "name": "拼多多多多进宝",
      "platform": "pdd",
      "is_active": true,
      "last_sync_at": "2026-05-14T10:00:00Z",
      "sync_interval_minutes": 60
    },
    {
      "id": 2,
      "name": "小红书",
      "platform": "xiaohongshu",
      "is_active": true,
      "last_sync_at": "2026-05-14T03:30:00Z",
      "sync_interval_minutes": 1440
    }
  ]
}
```

### 5.2 Update Data Source Config

```
PATCH /api/v1/admin/collect/sources/{source_id}
```

**Request Body** (partial update):
```json
{
  "is_active": true,
  "config": {
    "cookie": "<new_cookie_value>",
    "backup_cookie": "<backup_cookie_value>"
  }
}
```

**Response** (200): Updated data source object.

---

## Public API Behavior (No Changes)

Existing public endpoints continue to work unchanged:

- `GET /api/v1/products/` — Products with status='active' only; enriched `specifications` and `ratings` fields included
- `GET /api/v1/products/{id}/reviews` — Reviews sourced from 'crawled' included; `author` field stripped from response (FR-017)
- `GET /api/v1/search/` — Search includes newly collected products

## SSE Streaming Contract

The auto-discovery progress endpoint uses Server-Sent Events:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Types**:
- `progress` — Incremental progress update during collection
- `complete` — Job finished successfully
- `error` — Job failed with error message
