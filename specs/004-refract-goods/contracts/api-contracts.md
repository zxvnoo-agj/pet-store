# API Contracts: Goods Module SPU Refactor

**Date**: 2026-05-20  
**Feature**: 004-refract-goods  
**Base Path**: `/api/v1/admin/goods/`

## Overview

All endpoints are admin-only (requires authentication via `Authorization: Bearer <token>`). These endpoints provide SPU management, listing aggregation, and matching queue operations.

---

## 1. SPU Management

### 1.1 List SPUs

```
GET /api/v1/admin/goods/spus
```

Browse aggregated product catalog. Returns one entry per SPU with consolidated price range and listing count.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page (max 100) |
| brand | string | optional | Filter by brand name (substring match) |
| category_id | int | optional | Filter by category ID |
| pet_type | string | optional | Filter: 'cat' or 'dog' |
| q | string | optional | Search in name and model (full-text) |
| status | string | optional | Filter: 'active' / 'inactive' / 'draft' |

**Response** (200):

```json
{
  "items": [
    {
      "id": 1,
      "brand": "Royal Canin",
      "name": "Indoor Adult Cat Food",
      "model": "K36 2kg",
      "pet_type": "cat",
      "category": {
        "id": 3,
        "name": "Dry Cat Food"
      },
      "price_min": 89.00,
      "price_max": 156.00,
      "currency": "CNY",
      "listing_count": 12,
      "image_urls": ["https://..."],
      "status": "active",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-20T14:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

### 1.2 Get SPU Detail

```
GET /api/v1/admin/goods/spus/{spu_id}
```

Retrieve complete SPU information including detailed attributes.

**Response** (200):

```json
{
  "id": 1,
  "brand": "Royal Canin",
  "name": "Indoor Adult Cat Food",
  "model": "K36 2kg",
  "pet_type": "cat",
  "category": {
    "id": 3,
    "name": "Dry Cat Food",
    "pet_type": "cat"
  },
  "description": "Specially formulated for indoor cats...",
  "ingredients": ["Dehydrated poultry protein", "Rice", "Vegetable protein isolate"],
  "nutrition": {
    "protein": "32%",
    "fat": "15%",
    "fiber": "4.1%",
    "ash": "7.5%"
  },
  "pros": ["High digestibility", "Reduces stool odor", "Balanced calories"],
  "cons": ["Contains grains", "Mid-tier protein content"],
  "extra_attrs": {
    "shelf_life": "18 months",
    "origin": "France"
  },
  "price_min": 89.00,
  "price_max": 156.00,
  "currency": "CNY",
  "image_urls": ["https://example.com/image1.jpg"],
  "status": "active",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-20T14:30:00Z"
}
```

**Error** (404):

```json
{
  "detail": "SPU with id 999 not found"
}
```

### 1.3 Create SPU

```
POST /api/v1/admin/goods/spus
```

Create a new SPU master record.

**Request Body**:

```json
{
  "category_id": 3,
  "brand": "Royal Canin",
  "name": "Indoor Adult Cat Food",
  "model": "K36 2kg",
  "pet_type": "cat",
  "description": "Specially formulated for indoor cats...",
  "ingredients": ["Dehydrated poultry protein", "Rice"],
  "nutrition": {
    "protein": "32%",
    "fat": "15%"
  },
  "pros": ["High digestibility"],
  "cons": ["Contains grains"],
  "extra_attrs": {
    "shelf_life": "18 months"
  },
  "image_urls": ["https://example.com/image1.jpg"],
  "status": "active"
}
```

**Required Fields**: `category_id`, `brand`, `name`, `model`, `pet_type`

**Response** (201): Returns the created SPU object (same schema as GET detail).

**Error** (409) — Duplicate SPU:

```json
{
  "detail": "SPU with same brand, category, name, and model already exists",
  "existing_spu_id": 42
}
```

### 1.4 Update SPU

```
PUT /api/v1/admin/goods/spus/{spu_id}
```

Update SPU information. All fields are optional; only provided fields are updated.

**Request Body** (partial update allowed):

```json
{
  "description": "Updated description...",
  "nutrition": {
    "protein": "33%",
    "fat": "14%"
  },
  "pros": ["High digestibility", "Grain-free option available"]
}
```

**Response** (200): Returns updated SPU object.

**Error** (404):

```json
{
  "detail": "SPU with id 999 not found"
}
```

### 1.5 Delete SPU

```
DELETE /api/v1/admin/goods/spus/{spu_id}
```

Delete an SPU and all its linked listings (CASCADE).

**Response** (204): No content.

**Error** (404):

```json
{
  "detail": "SPU with id 999 not found"
}
```

---

## 2. SPU Listing Management

### 2.1 List Listings for SPU

```
GET /api/v1/admin/goods/spus/{spu_id}/listings
```

Get all e-commerce listings linked to a specific SPU.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page (max 100) |
| platform | string | optional | Filter by platform ('pdd', 'taobao') |
| sort | string | 'price_asc' | Sort: 'price_asc' / 'price_desc' / 'updated_at' |

**Response** (200):

```json
{
  "items": [
    {
      "id": 101,
      "spu_id": 1,
      "platform": "pdd",
      "shop_name": "Pet Paradise Store",
      "goods_id": "123456789",
      "title": "Royal Canin K36 Indoor Cat Food 2kg Official",
      "price": 89.00,
      "original_price": 120.00,
      "url": "https://mobile.yangkeduo.com/goods.html?goods_id=123456789",
      "image_url": "https://img.pddpic.com/...",
      "sales_count": 1543,
      "match_confidence": 0.94,
      "match_status": "linked",
      "last_synced_at": "2026-05-20T12:00:00Z",
      "created_at": "2026-05-18T10:00:00Z",
      "updated_at": "2026-05-20T12:00:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

### 2.2 Manually Link Listing to SPU

```
POST /api/v1/admin/goods/listings/{listing_id}/link
```

Manually assign an unmatched listing to an SPU (from review queue).

**Request Body**:

```json
{
  "spu_id": 1,
  "match_confidence": 1.0
}
```

**Response** (200):

```json
{
  "listing_id": 205,
  "spu_id": 1,
  "match_status": "linked",
  "message": "Listing successfully linked to SPU"
}
```

### 2.3 Unlink Listing

```
POST /api/v1/admin/goods/listings/{listing_id}/unlink
```

Remove a listing from its current SPU (mark as unmatched).

**Response** (200):

```json
{
  "listing_id": 205,
  "previous_spu_id": 1,
  "match_status": "unmatched",
  "message": "Listing unlinked from SPU"
}
```

---

## 3. Matching Queue

### 3.1 Get Matching Queue

```
GET /api/v1/admin/goods/matching-queue
```

Retrieve listings awaiting manual review, grouped by confidence tier.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| tier | string | 'all' | Filter: 'all' / 'candidate' (60-84%) / 'unmatched' (<60%) |
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page (max 100) |

**Response** (200):

```json
{
  "candidates": {
    "total": 45,
    "items": [
      {
        "id": 301,
        "platform": "pdd",
        "shop_name": "Cat Food Mart",
        "title": "Royal Canin Indoor K36 2kg Free Shipping",
        "price": 95.00,
        "url": "https://...",
        "match_confidence": 0.78,
        "suggested_spu": {
          "id": 1,
          "brand": "Royal Canin",
          "name": "Indoor Adult Cat Food",
          "model": "K36 2kg",
          "confidence": 0.78
        },
        "created_at": "2026-05-20T10:00:00Z"
      }
    ]
  },
  "unmatched": {
    "total": 23,
    "items": [
      {
        "id": 401,
        "platform": "pdd",
        "shop_name": "New Shop",
        "title": "Unknown Brand Cat Food 5kg Special Offer",
        "price": 45.00,
        "url": "https://...",
        "match_confidence": 0.32,
        "created_at": "2026-05-20T11:00:00Z"
      }
    ]
  }
}
```

### 3.2 Bulk Confirm Matches

```
POST /api/v1/admin/goods/matching-queue/confirm
```

Bulk confirm candidate matches (move from 'candidate' to 'linked').

**Request Body**:

```json
{
  "listing_ids": [301, 302, 303]
}
```

**Response** (200):

```json
{
  "processed": 3,
  "linked": 3,
  "failed": 0,
  "details": [
    {"listing_id": 301, "status": "linked", "spu_id": 1},
    {"listing_id": 302, "status": "linked", "spu_id": 2},
    {"listing_id": 303, "status": "linked", "spu_id": 1}
  ]
}
```

### 3.3 Bulk Reject Matches

```
POST /api/v1/admin/goods/matching-queue/reject
```

Bulk reject candidate matches (mark as 'rejected').

**Request Body**:

```json
{
  "listing_ids": [301, 302]
}
```

**Response** (200): Same schema as confirm.

---

## 4. Data Import & Matching

### 4.1 Trigger Listing Import

```
POST /api/v1/admin/goods/listings/import
```

Import new listings from external data source and run auto-matching.

**Request Body**:

```json
{
  "source": "pdd_ddk",
  "keyword": "cat food",
  "max_results": 100
}
```

**Response** (200):

```json
{
  "job_id": "job_12345",
  "status": "started",
  "message": "Import and matching job started",
  "estimated_duration": "2-5 minutes"
}
```

### 4.2 Get Import/Matching Job Status

```
GET /api/v1/admin/goods/jobs/{job_id}
```

**Response** (200):

```json
{
  "job_id": "job_12345",
  "status": "completed",
  "result": {
    "total_imported": 100,
    "auto_linked": 65,
    "candidates": 20,
    "unmatched": 15,
    "high_confidence_count": 65,
    "medium_confidence_count": 20,
    "low_confidence_count": 15
  },
  "started_at": "2026-05-20T10:00:00Z",
  "completed_at": "2026-05-20T10:03:00Z"
}
```

---

## 5. AI-Assisted SPU Entry

### 5.1 Parse Ingredients from Image

```
POST /api/v1/admin/goods/spus/parse-ingredients
```

Upload a product packaging image to extract ingredient list using vision LLM.

**Request Body**:

```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response** (200):

```json
{
  "ingredients": [
    "脱水鸡肉",
    "大米",
    "玉米蛋白粉",
    "鸡油",
    "鱼油"
  ]
}
```

**Error** (400):

```json
{
  "detail": "image_base64 is required"
}
```

### 5.2 Parse Nutrition from Image or Text

```
POST /api/v1/admin/goods/spus/parse-nutrition
```

Extract structured nutrition data from an image or convert text description to JSON.

**Request Body** (image mode):

```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Request Body** (text mode):

```json
{
  "text": "粗蛋白≥32%，粗脂肪≥15%，粗纤维≤4%，粗灰分≤8%，水分≤10%，钙≥1.0%，总磷≥0.8%，牛磺酸≥0.1%"
}
```

**Response** (200):

```json
{
  "nutrition": {
    "粗蛋白": "≥32%",
    "粗脂肪": "≥15%",
    "粗纤维": "≤4%",
    "粗灰分": "≤8%",
    "水分": "≤10%",
    "钙": "≥1.0%",
    "总磷": "≥0.8%",
    "牛磺酸": "≥0.1%"
  }
}
```

**Error** (400):

```json
{
  "detail": "Either image_base64 or text is required"
}
```

### 5.3 Generate Pros & Cons

```
POST /api/v1/admin/goods/spus/generate-pros-cons
```

Analyze ingredients and nutrition data to generate product pros and cons.

**Request Body**:

```json
{
  "ingredients": ["脱水鸡肉", "大米", "玉米蛋白粉", "鸡油", "鱼油"],
  "nutrition": {
    "粗蛋白": "≥32%",
    "粗脂肪": "≥15%",
    "粗纤维": "≤4%"
  }
}
```

**Response** (200):

```json
{
  "pros": [
    "高蛋白含量（≥32%）",
    "含鱼油有助于毛发健康",
    "低粗纤维易消化"
  ],
  "cons": [
    "含谷物（大米）可能不适合敏感体质",
    "使用植物蛋白粉"
  ]
}
```

**Error** (400):

```json
{
  "detail": "At least one of ingredients or nutrition is required"
}
```

---

## 6. Integration Notes

### 6.1 Response Format

All endpoints use the standard `ApiResponse` wrapper:

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

Error responses:

```json
{
  "code": 404,
  "message": "error",
  "data": null,
  "detail": "SPU with id 999 not found"
}
```

### 6.2 Pagination

List endpoints return paginated results:

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

### 6.3 Existing Endpoint Compatibility

No changes to existing endpoints:
- `/api/v1/admin/products/*` — Continue to work as before (001/002 product management)
- `/api/v1/admin/collect/*` — Continue to work as before (002/003 collection pipeline)
- `/api/v1/products/*` (public) — Continue to work as before (mini-program API)

The new `/api/v1/admin/goods/*` endpoints are additive and do not conflict with existing routes.
