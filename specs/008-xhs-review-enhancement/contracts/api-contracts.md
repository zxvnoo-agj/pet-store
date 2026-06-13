# API Contracts: 小红书评论采集完善

**Feature**: 008-xhs-review-enhancement | **Date**: 2026-06-01

## Admin API

### 1. 触发 SPU 评论采集

```
POST /v1/admin/spus/{spu_id}/xhs-collect
Authorization: Bearer <admin_token>
```

**Response** (202 Accepted):

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "job_id": 123,
    "status": "pending",
    "message": "XHS review collection queued for SPU {spu_id}."
  }
}
```

**Errors**:

| Status | Code | Message |
|--------|------|---------|
| 404 | - | SPU not found |
| 409 | - | 该 SPU 已有进行中的采集任务，请稍后再试 |
| 401 | - | 未授权 |

---

### 2. 查询采集任务状态

```
GET /v1/admin/spus/{spu_id}/xhs-collect/status?job_id={job_id}
Authorization: Bearer <admin_token>
```

**Response** (200):

```json
{
  "code": 0,
  "data": {
    "job_id": 123,
    "status": "partial_success",
    "result": {
      "new": 15,
      "failed": 5,
      "errors": ["note_id=abc123: 请求超时", "note_id=def456: 请求超时"]
    },
    "started_at": "2026-06-01T10:00:00Z",
    "completed_at": "2026-06-01T10:01:30Z"
  }
}
```

**Status Values**: `pending` | `running` | `completed` | `partial_success` | `failed`

---

## Mini-Program API

### 3. 获取 SPU 评价（含 AI 总结 + 笔记列表）

```
GET /v1/spus/{spu_id}/reviews?page=1&page_size=20
Authorization: Bearer <user_token> (optional)
```

**Response** (200):

```json
{
  "code": 0,
  "data": {
    "ai_summary": {
      "overall_pros": ["颗粒大小适中", "适口性好"],
      "overall_cons": ["价格偏高"],
      "recommendation": "推荐",
      "recommend_rate": 0.85,
      "summary": "大部分用户反馈适口性好，猫咪爱吃，但价格偏高",
      "review_count": 15
    },
    "notes": [
      {
        "id": 42,
        "external_note_id": "abc123",
        "content": "给主子买了这款猫粮...",
        "author": "铲屎官小王",
        "note_likes": 328,
        "note_published_at": "2026-05-20T08:30:00Z",
        "source_url": "https://www.xiaohongshu.com/explore/abc123",
        "tags": ["适口性好", "颗粒大小适中"],
        "is_recommended": true,
        "comments": [
          "我家猫也爱吃这个！",
          "请问幼猫可以吃吗？",
          "价格多少"
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 15,
      "total_pages": 1
    }
  }
}
```

**Notes**:
- `ai_summary` 为 `null` 时表示尚未生成（评论数不足或采集后尚未生成）
- `comments` 为笔记的前10条评论，以字符串数组返回
- 笔记按 `note_likes` 降序排列

**Errors**:

| Status | Code | Message |
|--------|------|---------|
| 404 | - | SPU not found |

---

## Backward Compatibility

### Removed Endpoints

| Old Endpoint | Action |
|-------------|--------|
| `POST /v1/admin/collect/products/{product_id}/xhs-collect` | 移除，替换为 `POST /v1/admin/spus/{spu_id}/xhs-collect` |

### Removed Scheduler Job

| Old Job | Action |
|---------|--------|
| `daily_review_fetch` (CronTrigger hour=3) | 从 `scheduler/jobs.py` 中移除注册 |

### Unchanged Endpoints

所有其他 `/v1/admin/collect/*` 端点不受影响。
