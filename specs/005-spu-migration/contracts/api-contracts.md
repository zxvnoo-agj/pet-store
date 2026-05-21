# API Contracts: SPU 体系迁移（小程序端）

**Date**: 2026-05-21  
**Feature**: 005-spu-migration  
**Base Path**: `/api/v1/`

## Overview

本次迁移将所有面向小程序端的商品相关 API 从 `products` 体系切换为 `spus` 体系。Admin 端 API 不受影响（004 已创建 `/api/v1/admin/goods/*`）。

**关键变更**:
- `GET /products` → `GET /spus`
- `GET /products/{id}` → `GET /spus/{id}`
- `GET /products/{id}/reviews` → `GET /spus/{id}/reviews`
- 收藏、评价接口中的 `product_id` 字段改为 `spu_id`
- AI 助手内部检索逻辑切换，接口不变

---

## 1. SPU 列表（小程序端）

### 1.1 List SPUs

```
GET /api/v1/spus
```

Browse SPU catalog for mini-program. Returns paginated SPU list with basic info.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page (max 100) |
| category_id | int | optional | Filter by category ID |
| pet_type | string | optional | Filter: 'cat' or 'dog' |
| brand | string | optional | Filter by brand (exact match) |
| min_price | float | optional | Minimum price filter |
| max_price | float | optional | Maximum price filter |
| sort | string | 'updated_at' | Sort: 'price_asc' / 'price_desc' / 'rating' / 'updated_at' |

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
        "id": 40,
        "name": "干粮"
      },
      "price_min": 89.00,
      "price_max": 156.00,
      "currency": "CNY",
      "image_urls": ["https://..."],
      "rating": 4.5,
      "review_count": 128,
      "status": "active"
    }
  ],
  "total": 33,
  "page": 1,
  "page_size": 20
}
```

---

## 2. SPU 详情（小程序端）

### 2.1 Get SPU Detail

```
GET /api/v1/spus/{spu_id}
```

Retrieve complete SPU information for mini-program detail page.

**Response** (200):

```json
{
  "id": 1,
  "brand": "Royal Canin",
  "name": "Indoor Adult Cat Food",
  "model": "K36 2kg",
  "pet_type": "cat",
  "category": {
    "id": 40,
    "name": "干粮",
    "parent_id": 10
  },
  "description": "专为室内猫设计...",
  "ingredients": ["脱水家禽蛋白", "大米", "植物蛋白分离物"],
  "nutrition": {
    "粗蛋白": "≥32%",
    "粗脂肪": "≥15%",
    "粗纤维": "≤4%",
    "粗灰分": "≤8%"
  },
  "pros": ["高消化率", "减少粪便异味", "均衡热量"],
  "cons": ["含谷物", "中等蛋白质含量"],
  "extra_attrs": {
    "保质期": "18个月",
    "产地": "法国"
  },
  "price_min": 89.00,
  "price_max": 156.00,
  "currency": "CNY",
  "image_urls": ["https://example.com/image1.jpg"],
  "status": "active",
  "listing_count": 12,
  "is_favorited": false
}
```

**Error** (404):

```json
{
  "detail": "SPU with id 999 not found"
}
```

---

## 3. SPU Listings（多平台价格对比）

### 3.1 Get Listings for SPU

```
GET /api/v1/spus/{spu_id}/listings
```

Get e-commerce listings linked to a specific SPU for price comparison.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| platform | string | optional | Filter by platform ('pdd', 'taobao') |
| sort | string | 'price_asc' | Sort: 'price_asc' / 'price_desc' / 'sales' |

**Response** (200):

```json
{
  "items": [
    {
      "id": 101,
      "platform": "pdd",
      "shop_name": "Pet Paradise Store",
      "title": "Royal Canin K36 Indoor Cat Food 2kg Official",
      "price": 89.00,
      "original_price": 120.00,
      "url": "https://mobile.yangkeduo.com/goods.html?goods_id=123456789",
      "image_url": "https://img.pddpic.com/...",
      "sales_count": 1543,
      "promotion_url": "https://pdd.ddk..."  // ddk generated link
    }
  ],
  "total": 12
}
```

**Note**: If SPU has no listings, returns empty array with `total: 0`.

---

## 4. 搜索（小程序端）

### 4.1 Search SPUs

```
GET /api/v1/search
```

Search SPUs by keyword across name, brand, description, and ingredients.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| q | string | required | Search keyword |
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page (max 100) |
| category_id | int | optional | Filter by category |
| pet_type | string | optional | Filter: 'cat' or 'dog' |
| sort | string | 'relevance' | Sort: 'relevance' / 'price_asc' / 'price_desc' / 'rating' |

**Response** (200): Same schema as `GET /api/v1/spus`.

---

## 5. 收藏（迁移后）

### 5.1 Add to Favorites

```
POST /api/v1/favorites
```

**Request Body**:

```json
{
  "spu_id": 1
}
```

**Response** (201):

```json
{
  "id": 501,
  "spu_id": 1,
  "spu": {
    "id": 1,
    "brand": "Royal Canin",
    "name": "Indoor Adult Cat Food",
    "price_min": 89.00,
    "price_max": 156.00,
    "image_urls": ["https://..."]
  },
  "created_at": "2026-05-21T10:00:00Z"
}
```

### 5.2 Remove from Favorites

```
DELETE /api/v1/favorites/{spu_id}
```

**Response** (204): No content.

### 5.3 List User Favorites

```
GET /api/v1/favorites
```

**Response** (200):

```json
{
  "items": [
    {
      "id": 501,
      "spu_id": 1,
      "spu": {
        "id": 1,
        "brand": "Royal Canin",
        "name": "Indoor Adult Cat Food",
        "price_min": 89.00,
        "price_max": 156.00,
        "image_urls": ["https://..."]
      },
      "created_at": "2026-05-21T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

## 6. 评价（迁移后）

### 6.1 Get Reviews for SPU

```
GET /api/v1/spus/{spu_id}/reviews
```

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Items per page |
| sort | string | 'newest' | Sort: 'newest' / 'highest' / 'lowest' / 'helpful' |
| tag | string | optional | Filter by tag |

**Response** (200):

```json
{
  "items": [
    {
      "id": 1001,
      "spu_id": 1,
      "author": "CatLover99",
      "rating": 4.5,
      "content": "我家猫咪很爱吃，毛发也变好了...",
      "tags": ["适口性好", "毛发改善"],
      "helpful_count": 23,
      "created_at": "2026-05-20T10:00:00Z"
    }
  ],
  "total": 128,
  "summary": {
    "average_rating": 4.3,
    "rating_distribution": {
      "5": 68,
      "4": 35,
      "3": 15,
      "2": 6,
      "1": 4
    }
  }
}
```

### 6.2 Submit Review

```
POST /api/v1/reviews
```

**Request Body**:

```json
{
  "spu_id": 1,
  "rating": 4.5,
  "content": "我家猫咪很爱吃...",
  "tags": ["适口性好"]
}
```

**Response** (201): Returns created review with `status: "pending"` (awaiting LLM moderation).

---

## 7. AI 助手（迁移后）

### 7.1 Chat with AI Assistant

```
POST /api/v1/chat
```

Interface unchanged. Internally, AI assistant now queries `spus` table instead of `products`.

**Request Body**:

```json
{
  "session_id": "sess_123",
  "message": "3个月幼猫推荐什么猫粮？预算200元",
  "context": {
    "current_spu_id": null  // optional, if user is viewing a specific SPU
  }
}
```

**Response** (200 — SSE stream):

```json
{
  "type": "message",
  "role": "assistant",
  "content": "根据您的需求，我为您推荐以下幼猫粮...",
  "referenced_spus": [
    {
      "id": 2,
      "brand": "Royal Canin",
      "name": "Kitten Dry Food",
      "model": "K36 2kg",
      "price_min": 89.00,
      "price_max": 156.00,
      "image_urls": ["https://..."]
    }
  ]
}
```

**Note**: `referenced_products` field renamed to `referenced_spus`.

---

## 8. Removed Endpoints

The following endpoints are removed and replaced by the new SPU endpoints above:

| Old Endpoint | Replacement | Reason |
|-------------|-------------|--------|
| `GET /products` | `GET /spus` | Products table dropped |
| `GET /products/{id}` | `GET /spus/{id}` | Products table dropped |
| `GET /products/{id}/reviews` | `GET /spus/{id}/reviews` | Products table dropped |

---

## 9. Response Format

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

---

## 10. Admin API Compatibility

Admin endpoints created in 004 remain unchanged:
- `/api/v1/admin/goods/spus/*` — SPU management (admin)
- `/api/v1/admin/goods/listings/*` — Listing management (admin)
- `/api/v1/admin/goods/matching-queue/*` — Matching queue (admin)

These are separate from the mini-program public endpoints documented above.
