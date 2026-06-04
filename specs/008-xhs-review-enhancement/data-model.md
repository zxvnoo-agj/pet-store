# Data Model: 小红书评论采集完善

**Feature**: 008-xhs-review-enhancement | **Date**: 2026-06-01

## Entity Changes

### 1. SPU (spus) — MODIFY

| Column | Type | Change | Description |
|--------|------|--------|-------------|
| `ai_review_summary` | JSONB | **NEW** (nullable) | LLM 聚合分析后的综合总结，可为 NULL（未生成或评论数不足） |

**`ai_review_summary` JSON Schema**:

```json
{
  "overall_pros": ["string"],       // 整体优点标签数组
  "overall_cons": ["string"],       // 整体缺点标签数组
  "recommendation": "string",       // "推荐" | "不推荐" | "中性"
  "recommend_rate": 0.85,           // 推荐占比 (0.0–1.0)
  "summary": "string",              // 一句话总结 (≤50字)
  "generated_at": "2026-06-01T12:00:00Z",  // ISO 8601
  "review_count": 15                // 分析时基于的评论数
}
```

**Validation Rules**:
- `overall_pros`, `overall_cons`: 数组，每项 4-20 字符
- `recommendation`: 枚举值
- `recommend_rate`: 0.0–1.0
- `generated_at`: UTC datetime

### 2. Review (reviews) — UNCHANGED

Review 表已有完整字段，无需修改：

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer PK | 主键 |
| `spu_id` | Integer FK | 关联 SPU |
| `external_note_id` | String(64) | 小红书笔记唯一标识（去重依据） |
| `author` | String(64) | 笔记作者昵称 |
| `note_published_at` | DateTime | 笔记发布时间 |
| `note_likes` | Integer | 笔记点赞数 |
| `content` | Text | 笔记正文内容 |
| `images` | JSONB | 笔记图片 URL 数组 |
| `comments` | JSONB | 评论内容数组（已有字段，存储前10条） |
| `tags` | JSONB | 优缺点标签数组（LLM 分析结果） |
| `is_recommended` | Boolean | 推荐态度（LLM 判断） |
| `source` | String(32) | 来源标识 "crawled" |
| `source_url` | String(256) | 小红书原文链接 |
| `llm_review_result` | JSONB | LLM 单条分析完整结果 |
| `status` | String(16) | "approved" / "pending" |

**Query Pattern** (mini-program):
```sql
SELECT * FROM reviews
WHERE spu_id = {id} AND status = 'approved'
ORDER BY note_likes DESC
LIMIT 20 OFFSET {offset}
```

### 3. DataFetchJob (data_fetch_jobs) — UNCHANGED

采集任务状态跟踪，现有字段满足需求：

| Column | Type | Description |
|--------|------|-------------|
| `status` | String | **扩展现有的 pending/running/completed/failed → 新增 `partial_success`** |
| `result` | JSONB | `{"new": N, "failed": M, "errors": [...]}` |
| `error_message` | Text | 全局错误信息 |

**State Transitions**:

```
pending → running → completed       (全部成功)
                  → partial_success  (部分成功，有失败笔记)
                  → failed           (全部失败或认证错误)
```

## Relationships

```
Spu (1) ──< (N) Review     # 一个 SPU 有多条小红书笔记
Spu (1) ──< (N) DataFetchJob  # 一个 SPU 可被多次采集
```

## Migration

```python
# Alembic migration
def upgrade():
    op.add_column('spus', sa.Column(
        'ai_review_summary',
        postgresql.JSONB,
        nullable=True,
        server_default=None
    ))
```

No data migration needed — existing SPU records default to NULL.
