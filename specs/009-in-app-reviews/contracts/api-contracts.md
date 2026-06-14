# API Contracts: 自建用户评价功能

**Feature**: 009-in-app-reviews | **Date**: 2026-06-14

All responses follow the existing `ApiResponse` envelope:

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "pagination": null
}
```

## 1. Mini-program: list real reviews

```http
GET /v1/spus/{spu_id}/reviews?page=1&page_size=20
Authorization: Bearer <optional user token>
```

**Behavior**:
- Returns all approved sources ordered by `created_at DESC`.
- If authenticated, includes the current user's own pending/rejected user review in `my_review` so the UI can render an "审核中" or rejected placeholder.
- Keeps `ai_summary` at the top level.

**Response `data`**:

```json
{
  "ai_summary": {
    "overall_pros": ["适口性好"],
    "overall_cons": ["价格偏高"],
    "recommendation": "推荐",
    "recommend_rate": 0.82,
    "summary": "整体反馈稳定，适合多数猫咪作为主食。",
    "generated_at": "2026-06-14T10:00:00Z",
    "review_count": 28
  },
  "reviews": [
    {
      "id": 101,
      "spu_id": 12,
      "rating": 5,
      "content": "家里猫吃了两周，便便状态比较稳定。",
      "tags": ["适口性好"],
      "is_recommended": true,
      "source": "user",
      "source_label": "用户评价",
      "source_url": null,
      "author": "微信用户",
      "status": "approved",
      "created_at": "2026-06-14T09:30:00Z"
    }
  ],
  "my_review": {
    "id": 109,
    "spu_id": 12,
    "rating": 4,
    "content": "刚提交，等审核。",
    "is_recommended": true,
    "source": "user",
    "source_label": "用户评价",
    "status": "pending",
    "created_at": "2026-06-14T10:30:00Z"
  },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 50,
    "total_pages": 3
  }
}
```

## 2. Mini-program: submit user review

```http
POST /v1/spus/{spu_id}/reviews
Authorization: Bearer <required user token>
Content-Type: application/json
```

**Request**:

```json
{
  "rating": 5,
  "content": "分享你的使用体验、踩过的坑或推荐理由。",
  "is_recommended": true
}
```

**Validation**:
- `rating`: required, 1-5
- `content`: required, 1-500 chars
- `is_recommended`: optional
- Duplicate `(spu_id, current_user_id, source=user)` returns `409`
- Sensitive-word hit returns `400`

**Success Response `data`**:

```json
{
  "review": {
    "id": 109,
    "spu_id": 12,
    "rating": 5,
    "content": "分享你的使用体验、踩过的坑或推荐理由。",
    "is_recommended": true,
    "source": "user",
    "source_label": "用户评价",
    "status": "pending",
    "created_at": "2026-06-14T10:30:00Z"
  },
  "message": "评价已提交，审核通过后将公开展示。"
}
```

## 3. Admin: list reviews

```http
GET /v1/admin/reviews?page=1&page_size=20&status=pending&source=user&spu_id=12
Authorization: Bearer <admin token>
```

**Query Parameters**:
- `status`: optional, `pending | approved | rejected`
- `source`: optional, `user | xhs_manual | xhs_auto | admin_seed`
- `spu_id`: optional
- `page`, `page_size`

**Response `data`**:

```json
{
  "reviews": [
    {
      "id": 109,
      "spu_id": 12,
      "spu_name": "全价主食猫条（鸡肉乳鸽味）",
      "user_id": 88,
      "rating": 5,
      "content": "家里猫比较爱吃。",
      "is_recommended": true,
      "source": "user",
      "source_label": "用户评价",
      "status": "pending",
      "reject_reason": null,
      "created_at": "2026-06-14T10:30:00Z"
    }
  ]
}
```

## 4. Admin: approve review

```http
POST /v1/admin/reviews/{review_id}/approve
Authorization: Bearer <admin token>
```

**Response `data`**:

```json
{
  "review": {
    "id": 109,
    "status": "approved"
  }
}
```

## 5. Admin: reject review

```http
POST /v1/admin/reviews/{review_id}/reject
Authorization: Bearer <admin token>
Content-Type: application/json
```

**Request**:

```json
{
  "reason": "包含不适合公开展示的信息"
}
```

**Validation**:
- `reason` is required and stored for audit.

## 6. Admin: create seeded/manual review

```http
POST /v1/admin/reviews
Authorization: Bearer <admin token>
Content-Type: application/json
```

**Request**:

```json
{
  "spu_id": 12,
  "rating": 4,
  "content": "运营整理的真实使用反馈摘要。",
  "is_recommended": true,
  "source": "admin_seed",
  "source_url": null,
  "external_note_id": null,
  "author": "运营整理"
}
```

**Rules**:
- `source` may be `admin_seed` or `xhs_manual`.
- Created records default to `approved`.
- For `xhs_manual`, `source_url` should be provided when available.

## 7. Admin: regenerate SPU review summary

```http
POST /v1/admin/spus/{spu_id}/reviews/summary/regenerate
Authorization: Bearer <admin token>
```

**Behavior**:
- Aggregates all approved review sources.
- Updates `spus.ai_review_summary`.

**Response `data`**:

```json
{
  "summary": {
    "overall_pros": ["适口性好"],
    "overall_cons": ["价格偏高"],
    "recommendation": "推荐",
    "recommend_rate": 0.82,
    "summary": "整体反馈稳定，适合多数猫咪作为主食。",
    "generated_at": "2026-06-14T10:45:00Z",
    "review_count": 28
  }
}
```
