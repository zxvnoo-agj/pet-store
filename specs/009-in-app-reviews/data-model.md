# Data Model: 自建用户评价功能

**Feature**: 009-in-app-reviews | **Date**: 2026-06-14

## Entity Changes

### 1. Review (`reviews`) — MODIFY

Canonical record for all SPU review content.

| Column | Type | Change | Description |
|--------|------|--------|-------------|
| `spu_id` | Integer FK | existing, required | Associated SPU. All 009 queries are SPU-based. |
| `user_id` | Integer FK nullable | existing | Required for `source=user`; null allowed for external/admin sources. |
| `rating` | Numeric(2,1) | existing | User/admin rating, valid range 1-5. |
| `content` | Text | existing | Text review content, 1-500 chars for new user/admin submissions. |
| `is_recommended` | Boolean nullable | existing | Optional recommendation marker. |
| `source` | String(32) | formalize enum | `user`, `xhs_manual`, `xhs_auto`, `admin_seed`. |
| `source_url` | String nullable | existing | External source URL, mainly XHS manual/auto. |
| `external_note_id` | String nullable | existing | External note ID, mainly XHS manual/auto dedupe. |
| `status` | String(16) | formalize enum | `pending`, `approved`, `rejected`. |
| `reject_reason` | String/Text nullable | new or metadata | Required when admin rejects a review. |
| `llm_review_result` | JSONB nullable | existing | Per-review analysis/moderation output. |
| `created_at` / `updated_at` | DateTime | existing | Sort newest first by `created_at`. |

**Source Values**:

| Value | Label | Created By | Default Status |
|-------|-------|------------|----------------|
| `user` | 用户评价 | Mini-program user | `pending` |
| `xhs_manual` | 小红书 | Admin manual import | `approved` or admin-selected |
| `xhs_auto` | 小红书 | XHS auto collection | `approved` after collection analysis |
| `admin_seed` | 运营整理 | Admin form | `approved` |

**Validation Rules**:
- `rating` must be between 1 and 5.
- `content` is required and must be <= 500 characters for new submissions.
- `source` must be one of the four source values above.
- `status` must be `pending`, `approved`, or `rejected`.
- `source=user` requires `user_id`.
- `source=user` submissions must be unique per `(spu_id, user_id)`.
- `status=rejected` requires `reject_reason`.
- New user submissions must pass local sensitive-word matching.

**Recommended Indexes / Constraints**:

```sql
CHECK (source IN ('user', 'xhs_manual', 'xhs_auto', 'admin_seed'));
CHECK (status IN ('pending', 'approved', 'rejected'));
CHECK (rating >= 1 AND rating <= 5);
CREATE UNIQUE INDEX uq_reviews_user_spu
  ON reviews (spu_id, user_id)
  WHERE source = 'user' AND user_id IS NOT NULL;
CREATE INDEX ix_reviews_spu_status_created
  ON reviews (spu_id, status, created_at DESC);
CREATE INDEX ix_reviews_source_status
  ON reviews (source, status);
```

### 2. SPU (`spus`) — MODIFY BEHAVIOR

| Field | Change | Description |
|-------|--------|-------------|
| `ai_review_summary` | behavior update | Generated from all approved reviews for the SPU, not only XHS auto/crawled reviews. |

**AI Summary Input Rules**:
- Include all `Review.status == approved`.
- Include `source` label in prompt context.
- Exclude pending/rejected reviews.
- Skip generation if review count is below existing minimum threshold unless admin explicitly allows a forced summary.

### 3. User (`users`) — UNCHANGED

Existing mini-program user entity is used to authenticate submissions and enforce one review per SPU.

## State Transitions

```text
User submission:
draft form -> pending -> approved
                      -> rejected (requires reject_reason)

Admin seed:
form -> approved

XHS auto:
collection result -> approved

XHS manual:
import form -> approved
```

## Query Patterns

### Mini-program review list

```sql
SELECT *
FROM reviews
WHERE spu_id = :spu_id
  AND status = 'approved'
ORDER BY created_at DESC
LIMIT :page_size OFFSET :offset;
```

If authenticated, also fetch current user's own non-approved review for that SPU:

```sql
SELECT *
FROM reviews
WHERE spu_id = :spu_id
  AND user_id = :current_user_id
  AND source = 'user'
  AND status IN ('pending', 'rejected')
LIMIT 1;
```

### Admin review list

```sql
SELECT *
FROM reviews
WHERE (:status IS NULL OR status = :status)
  AND (:source IS NULL OR source = :source)
  AND (:spu_id IS NULL OR spu_id = :spu_id)
ORDER BY created_at DESC
LIMIT :page_size OFFSET :offset;
```

## Migration Notes

- Existing 008 auto-collected rows with `source='crawled'` should be migrated to `source='xhs_auto'`.
- Historical rows with `source='user'` but `external_note_id IS NOT NULL` should be reviewed; a conservative migration can map them to `xhs_auto` only when `external_note_id` or `source_url` clearly indicates XHS.
- Do not delete tables. All changes should be additive or constraint-backed with a reversible migration.
