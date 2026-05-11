# API Contracts: Pet Supplies Assistant

**Base URL**: `https://api.petshop.example.com/v1`
**Authentication**: JWT Bearer token in `Authorization` header
**Content-Type**: `application/json`

## Common Response Format

### Success Response

```json
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Error Response

```json
{
  "code": 1001,
  "message": "参数错误",
  "detail": { "field": "price_min", "error": "must be positive" }
}
```

### Pagination Parameters

| Parameter | Type | Default | Constraints |
|-----------|------|---------|-------------|
| page | int | 1 | ≥ 1 |
| page_size | int | 20 | 1-100 |

---

## Authentication

### POST /auth/wechat-login

**Description**: WeChat mini program login, exchanges code for JWT token

**Request**:
```json
{
  "code": "string",           // Required: WeChat login code
  "encrypted_data": "string", // Optional: encrypted user data
  "iv": "string"              // Optional: initialization vector
}
```

**Response**:
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": 1718083200,
    "user": {
      "id": 1,
      "nickname": "猫奴小王",
      "avatar_url": "https://..."
    }
  }
}
```

**Error Codes**:
- 1001: Invalid code
- 1002: WeChat API error

---

## Categories

### GET /categories

**Description**: Get category tree for navigation

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| pet_type | string | No | Filter by pet type: cat, dog, bird, etc. |

**Response**:
```json
{
  "code": 0,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "猫粮",
        "pet_type": "cat",
        "icon": "https://...",
        "children": [
          { "id": 2, "name": "干粮", "pet_type": "cat", "level": 2 },
          { "id": 3, "name": "湿粮", "pet_type": "cat", "level": 2 }
        ]
      }
    ]
  }
}
```

---

## Products

### GET /products

**Description**: Product list with filtering, sorting, and pagination

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category_id | int | No | Category ID |
| pet_type | string | No | Pet type filter |
| brand | string | No | Brand filter |
| min_price | float | No | Minimum price |
| max_price | float | No | Maximum price |
| sort | string | No | Sort: rating_desc, price_asc, price_desc, newest |
| page | int | No | Page number |
| page_size | int | No | Items per page |

**Response**:
```json
{
  "code": 0,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "皇家猫粮 K36",
        "brand": "皇家",
        "price_range": { "min": 128.0, "max": 458.0 },
        "image_urls": ["https://..."],
        "ratings": {
          "overall": 4.5,
          "cost_performance": 4.0,
          "quality": 4.6,
          "taste": 4.3
        },
        "pros": ["营养均衡", "适口性好"],
        "cons": ["价格偏高"],
        "review_count": 234
      }
    ]
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### GET /products/{id}

**Description**: Get detailed product information

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Product ID |

**Response**:
```json
{
  "code": 0,
  "data": {
    "product": {
      "id": 1,
      "name": "皇家猫粮 K36",
      "brand": "皇家",
      "price_range": { "min": 128.0, "max": 458.0 },
      "image_urls": ["https://..."],
      "ratings": {
        "overall": 4.5,
        "cost_performance": 4.0,
        "quality": 4.6,
        "taste": 4.3
      },
      "pros": ["营养均衡", "适口性好", "易消化"],
      "cons": ["价格偏高", "包装易破"],
      "category": { "id": 1, "name": "猫粮" },
      "description": "专为室内成猫设计的营养均衡猫粮...",
      "ingredients": ["鸡肉粉", "大米", "玉米蛋白粉"],
      "specifications": { "weight": "2kg", "origin": "法国" },
      "favorite_count": 156,
      "source_url": "https://jd.com/...",
      "review_count": 234
    }
  }
}
```

### GET /products/{id}/reviews

**Description**: Get product reviews

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Product ID |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| rating | int | No | Filter by rating (1-5) |
| sort | string | No | latest, most_helpful, highest, lowest |
| page | int | No | Page number |
| page_size | int | No | Items per page |

**Response**:
```json
{
  "code": 0,
  "data": {
    "reviews": [
      {
        "id": 1,
        "user": { "nickname": "猫奴小王", "avatar": "https://..." },
        "rating": 5,
        "content": "我家猫咪特别爱吃，吃完毛色变亮了！",
        "images": ["https://..."],
        "tags": ["适口性好", "毛色变亮"],
        "is_recommended": true,
        "helpful_count": 23,
        "created_at": "2026-04-15T10:30:00Z"
      }
    ],
    "summary": {
      "rating_distribution": { "5": 120, "4": 80, "3": 24, "2": 6, "1": 4 },
      "top_tags": ["适口性好", "营养均衡", "性价比高"],
      "recommend_rate": 0.87
    }
  }
}
```

### POST /products/{id}/reviews

**Description**: Submit a product review (requires authentication)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Product ID |

**Request**:
```json
{
  "rating": 5,
  "content": "评价内容...",
  "images": ["base64_or_url"],
  "tags": ["适口性好"],
  "is_recommended": true
}
```

**Response**:
```json
{
  "code": 0,
  "data": {
    "review": {
      "id": 101,
      "status": "pending",
      "message": "评价已提交，正在审核中"
    }
  }
}
```

**Error Codes**:
- 1002: Unauthorized (not logged in)
- 1004: Rate limited (too many reviews)

### POST /products/{id}/favorite

**Description**: Toggle favorite status (requires authentication)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Product ID |

**Response**:
```json
{
  "code": 0,
  "data": {
    "is_favorited": true
  }
}
```

### GET /products/compare

**Description**: Compare multiple products (2-4 items)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ids | string | Yes | Comma-separated product IDs: "1,2,3" |

**Response**:
```json
{
  "code": 0,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "皇家猫粮 K36",
        "brand": "皇家",
        "price_range": { "min": 128, "max": 458 },
        "ratings": { "overall": 4.5 },
        "pros": ["营养均衡"],
        "cons": ["价格偏高"]
      }
    ],
    "comparison": {
      "dimensions": ["品牌", "价格区间", "适口性", "营养均衡", "性价比"]
    }
  }
}
```

---

## Search

### GET /search

**Description**: Global search with suggestions

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search keywords |
| pet_type | string | No | Pet type filter |

**Response**:
```json
{
  "code": 0,
  "data": {
    "suggestions": ["幼猫 干粮 推荐", "幼猫 干粮 皇家"],
    "products": [...],
    "categories": [{ "id": 2, "name": "干粮" }],
    "brands": ["皇家", "渴望", "爱肯拿"]
  }
}
```

---

## Chat (AI Agent)

### POST /chat/sessions

**Description**: Create a new chat session

**Request**:
```json
{
  "title": "可选标题",
  "system_prompt": "可选自定义系统提示"
}
```

**Response**:
```json
{
  "code": 0,
  "data": {
    "session_id": 1,
    "title": "新对话",
    "created_at": "2026-05-10T08:00:00Z"
  }
}
```

### GET /chat/sessions

**Description**: List user's chat sessions (requires authentication)

**Response**:
```json
{
  "code": 0,
  "data": {
    "sessions": [
      {
        "id": 1,
        "title": "3个月幼猫吃什么粮",
        "message_count": 12,
        "updated_at": "2026-05-10T10:00:00Z"
      }
    ]
  }
}
```

### GET /chat/sessions/{id}/messages

**Description**: Get chat session message history

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Session ID |

**Response**:
```json
{
  "code": 0,
  "data": {
    "messages": [
      {
        "id": 1,
        "role": "user",
        "content": "3个月幼猫推荐什么猫粮？",
        "created_at": "2026-05-10T10:00:00Z"
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "对于3个月幼猫，建议选择...",
        "tool_calls": [...],
        "created_at": "2026-05-10T10:00:05Z"
      }
    ]
  }
}
```

### POST /chat/stream

**Description**: Send message to AI assistant (SSE streaming)

**Request**:
```json
{
  "session_id": 1,
  "content": "3个月幼猫吃什么粮好？",
  "context": {
    "current_product_id": null,
    "pet_type": "cat"
  }
}
```

**Response**: Server-Sent Events stream

```
event: thinking
data: {"message": "正在分析您的需求..."}

event: tool_call
data: {"tool": "search_products", "args": {"pet_type": "cat", "max_price": 200}}

event: tool_result
data: {"tool": "search_products", "result": [...]}

event: message
data: {"content": "根据您的需求...", "is_complete": false}

event: done
data: {"message_id": 42, "tokens_used": 256}
```

### POST /chat/sessions/{id}/clear

**Description**: Clear chat session history

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | int | Session ID |

**Response**:
```json
{
  "code": 0,
  "data": { "success": true }
}
```

---

## User Profile

### GET /users/me

**Description**: Get current user profile (requires authentication)

**Response**:
```json
{
  "code": 0,
  "data": {
    "user": {
      "id": 1,
      "nickname": "猫奴小王",
      "avatar_url": "https://...",
      "pet_types": ["cat"],
      "profile": { "years": 3 }
    }
  }
}
```

### PUT /users/me

**Description**: Update user profile (requires authentication)

**Request**:
```json
{
  "nickname": "新昵称",
  "pet_types": ["cat", "dog"],
  "profile": { "years": 5 }
}
```

**Response**:
```json
{
  "code": 0,
  "data": {
    "user": {
      "id": 1,
      "nickname": "新昵称",
      "pet_types": ["cat", "dog"]
    }
  }
}
```

### GET /users/me/favorites

**Description**: Get user's favorite products (requires authentication)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | int | No | Page number |
| page_size | int | No | Items per page |

**Response**:
```json
{
  "code": 0,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "皇家猫粮 K36",
        "brand": "皇家",
        "price_range": { "min": 128, "max": 458 },
        "image_urls": ["https://..."],
        "ratings": { "overall": 4.5 }
      }
    ]
  },
  "pagination": { ... }
}
```

---

## Admin APIs (H5 Backend)

### GET /admin/products

**Description**: List all products for admin (requires admin role)

**Query Parameters**: Same as /products plus:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |

### POST /admin/products

**Description**: Create new product (requires admin role)

**Request**:
```json
{
  "name": "新品猫粮",
  "brand": "品牌名",
  "category_id": 1,
  "price_min": 100,
  "price_max": 200,
  "description": "产品描述",
  "pros": ["优点1"],
  "cons": ["缺点1"]
}
```

### PUT /admin/products/{id}

**Description**: Update product (requires admin role)

### GET /admin/reviews/pending

**Description**: Get pending reviews for moderation (requires admin role)

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number |
| page_size | int | Items per page |

**Response**:
```json
{
  "code": 0,
  "data": {
    "reviews": [
      {
        "id": 101,
        "product": { "id": 1, "name": "皇家猫粮" },
        "user": { "id": 5, "nickname": "用户" },
        "rating": 5,
        "content": "评价内容",
        "llm_review_result": {
          "approved": false,
          "reason": "包含敏感内容"
        },
        "created_at": "2026-05-10T10:00:00Z"
      }
    ]
  }
}
```

### POST /admin/reviews/{id}/approve

**Description**: Approve a pending review (requires admin role)

### POST /admin/reviews/{id}/reject

**Description**: Reject a pending review (requires admin role)

**Request**:
```json
{
  "reason": "包含广告内容"
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| 0 | Success | 200 |
| 1001 | Invalid parameters | 400 |
| 1002 | Unauthorized | 401 |
| 1003 | Resource not found | 404 |
| 1004 | Rate limited | 429 |
| 2001 | Agent service busy | 503 |
| 2002 | Agent token insufficient | 402 |
| 5000 | Internal server error | 500 |

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| General APIs | 100 requests/minute |
| AI Chat (/chat/stream) | 20 requests/minute |
| Review submission | 5 requests/minute |
| Search | 30 requests/minute |
