# Data Model: SPU 体系迁移

**Date**: 2026-05-21  
**Feature**: 005-spu-migration  
**Based on**: Feature 005 spec + Feature 004 data model + Existing 001-003 data model

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-21 | Initial creation | Feature 005 design — delta migration from products to SPU |

## Summary of Changes

This feature introduces **3 modified tables** and **1 dropped table**. No new tables are created (spus/spu_listings already exist from 004).

### Modified Tables

| Table | Change | Reason |
|-------|--------|--------|
| `favorites` | `product_id` → `spu_id` | 收藏功能迁移至 SPU 体系 |
| `reviews` | `product_id` → `spu_id` | 评价功能迁移至 SPU 体系 |
| `chat_messages` | `referenced_products` → `referenced_spus` | AI 助手商品引用迁移至 SPU |

### Dropped Tables

| Table | Change | Reason |
|-------|--------|--------|
| `products` | DROP TABLE | 完全废弃，业务逻辑全部迁移至 spus |

---

## Modified Table: favorites

**Change**: `product_id` column renamed to `spu_id`, foreign key target changed.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| user_id | INTEGER | NOT NULL, FK → users.id ON DELETE CASCADE | User who favorited |
| **spu_id** | INTEGER | **NOT NULL, FK → spus.id ON DELETE CASCADE** | **SPU being favorited (was product_id)** |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Constraints**:
- `uq_user_product_favorite` → renamed to `uq_user_spu_favorite` on (user_id, spu_id)
- FK(spu_id) REFERENCES spus(id) ON DELETE CASCADE

**Migration SQL**:
```sql
-- Step 1: Drop old FK and unique constraint
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS fk_favorites_product_id;
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS uq_user_product_favorite;

-- Step 2: Rename column
ALTER TABLE favorites RENAME COLUMN product_id TO spu_id;

-- Step 3: Add new FK and unique constraint
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_spu_id 
  FOREIGN KEY (spu_id) REFERENCES spus(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD CONSTRAINT uq_user_spu_favorite 
  UNIQUE (user_id, spu_id);

-- Step 4: Update index
DROP INDEX IF EXISTS ix_favorites_product_id;
CREATE INDEX ix_favorites_spu_id ON favorites(spu_id);
```

---

## Modified Table: reviews

**Change**: `product_id` column renamed to `spu_id`, foreign key target changed.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| **spu_id** | INTEGER | **NOT NULL, FK → spus.id ON DELETE CASCADE** | **SPU being reviewed (was product_id)** |
| external_note_id | VARCHAR(64) | nullable, indexed | External platform note ID |
| author | VARCHAR(64) | nullable | Review author name |
| note_published_at | TIMESTAMPTZ | nullable | Original publish time |
| note_likes | INTEGER | nullable | Like count from source |
| user_id | INTEGER | FK → users.id | Local user ID (if authenticated) |
| rating | NUMERIC(2,1) | NOT NULL | Rating score |
| content | TEXT | NOT NULL | Review text |
| images | JSONB | DEFAULT '[]' | Review images |
| tags | JSONB | DEFAULT '[]' | Extracted tags |
| is_recommended | BOOLEAN | nullable | Whether reviewer recommends |
| source | VARCHAR(32) | DEFAULT 'user' | Source: 'user' / 'aggregated' |
| source_url | VARCHAR(256) | nullable | Original URL |
| helpful_count | INTEGER | DEFAULT 0 | Helpful votes |
| status | VARCHAR(16) | DEFAULT 'pending', indexed | 'pending' / 'approved' / 'rejected' |
| llm_review_result | JSONB | nullable | LLM moderation result |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Constraints**:
- FK(spu_id) REFERENCES spus(id) ON DELETE CASCADE
- CHECK(rating >= 0 AND rating <= 5)

**Migration SQL**:
```sql
-- Step 1: Drop old FK
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS fk_reviews_product_id;

-- Step 2: Rename column
ALTER TABLE reviews RENAME COLUMN product_id TO spu_id;

-- Step 3: Add new FK
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_spu_id 
  FOREIGN KEY (spu_id) REFERENCES spus(id) ON DELETE CASCADE;

-- Step 4: Update index
DROP INDEX IF EXISTS ix_reviews_product_id;
CREATE INDEX ix_reviews_spu_id ON reviews(spu_id);
```

---

## Modified Table: chat_messages

**Change**: JSONB column `referenced_products` renamed to `referenced_spus`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, auto-increment | Primary key |
| session_id | INTEGER | NOT NULL, FK → chat_sessions.id ON DELETE CASCADE | Parent session |
| role | VARCHAR(16) | NOT NULL | 'user' / 'assistant' / 'tool' |
| content | TEXT | NOT NULL | Message content |
| tool_calls | JSONB | nullable | Tool call metadata |
| tokens_used | INTEGER | nullable | Token consumption |
| **referenced_spus** | JSONB | **DEFAULT '[]'** | **Referenced SPU IDs (was referenced_products)** |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Migration SQL**:
```sql
-- Simple column rename (no FK, it's a JSONB array of IDs)
ALTER TABLE chat_messages RENAME COLUMN referenced_products TO referenced_spus;
```

---

## Dropped Table: products

**Action**: Complete removal of the `products` table and all dependent objects.

**Prerequisites before DROP**:
1. Verify `products` table is empty or data is no longer needed
2. All foreign keys from other tables to `products` must be removed first (favorites, reviews already migrated above)
3. Application code no longer references `Product` model

**Migration SQL**:
```sql
-- Step 1: Drop all remaining FKs to products (if any)
-- (favorites and reviews already handled above)

-- Step 2: Drop the table
DROP TABLE IF EXISTS products CASCADE;
```

---

## Entity Relationship Diagram (Post-Migration)

```
┌───────────────────┐         ┌───────────────────┐
│      spus         │◄────────┤   spu_listings    │
├───────────────────┤   1:N   ├───────────────────┤
│ id (PK)           │         │ id (PK)           │
│ category_id (FK)  │         │ spu_id (FK)       │
│ brand             │         │ platform          │
│ name              │         │ shop_name         │
│ model             │         │ goods_id          │
│ pet_type          │         │ title             │
│ description       │         │ price             │
│ ingredients       │         │ match_status      │
│ nutrition         │         └───────────────────┘
│ pros              │
│ cons              │         ┌───────────────────┐
│ extra_attrs       │◄────────┤    favorites      │
│ price_min         │   1:N   ├───────────────────┤
│ price_max         │         │ id (PK)           │
│ status            │         │ user_id (FK)      │
│ created_at        │         │ spu_id (FK)       │
│ updated_at        │         └───────────────────┘
└───────────────────┘
         │
         │ 1:N
         ▼
┌───────────────────┐
│     reviews       │
├───────────────────┤
│ id (PK)           │
│ spu_id (FK)       │
│ rating            │
│ content           │
│ ...               │
└───────────────────┘
         ▲
         │ N:1
┌───────────────────┐
│  chat_messages    │
├───────────────────┤
│ id (PK)           │
│ session_id (FK)   │
│ role              │
│ referenced_spus   │
│ ...               │
└───────────────────┘
```

---

## Query Patterns (Post-Migration)

### 1. SPU List with Favorite Count (Mini-Program Home)

```sql
SELECT s.id, s.brand, s.name, s.model, s.pet_type,
       s.price_min, s.price_max, s.currency,
       s.image_urls, s.status,
       c.name as category_name
FROM spus s
LEFT JOIN categories c ON s.category_id = c.id
WHERE s.status = 'active'
ORDER BY s.updated_at DESC
LIMIT 20 OFFSET 0;
```

### 2. User Favorites List

```sql
SELECT s.id, s.brand, s.name, s.model, s.pet_type,
       s.price_min, s.price_max, s.image_urls
FROM favorites f
JOIN spus s ON f.spu_id = s.id
WHERE f.user_id = ?
ORDER BY f.created_at DESC;
```

### 3. SPU Reviews

```sql
SELECT r.id, r.rating, r.content, r.tags, r.helpful_count,
       r.created_at, u.nickname as author_name
FROM reviews r
LEFT JOIN users u ON r.user_id = u.id
WHERE r.spu_id = ? AND r.status = 'approved'
ORDER BY r.created_at DESC
LIMIT 20 OFFSET 0;
```

### 4. SPU Search (Full-Text)

```sql
SELECT s.id, s.brand, s.name, s.model, s.pet_type,
       s.price_min, s.price_max, s.image_urls
FROM spus s
WHERE s.status = 'active'
  AND (
    s.name ILIKE '%keyword%'
    OR s.brand ILIKE '%keyword%'
    OR s.description ILIKE '%keyword%'
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(s.ingredients) AS ingredient
      WHERE ingredient ILIKE '%keyword%'
    )
  )
ORDER BY s.updated_at DESC
LIMIT 20 OFFSET 0;
```

---

## Migration Plan

**Alembic Migration**: `005_spu_migration.py`

Operations in order:
1. **favorites**: Rename `product_id` → `spu_id`, update FK, update unique constraint, update index
2. **reviews**: Rename `product_id` → `spu_id`, update FK, update index
3. **chat_messages**: Rename `referenced_products` → `referenced_spus`
4. **products**: `DROP TABLE products CASCADE`

**Rollback**:
- Cannot rollback `products` table drop (data loss)
- Can rollback column renames by reversing the ALTER operations
- **Recommendation**: Take database backup before migration

---

## Data Integrity Rules

1. **Favorite Uniqueness**: No duplicate (user_id, spu_id) pairs.
2. **Review Association**: Every review must link to an existing SPU.
3. **Chat Message References**: `referenced_spus` JSONB array should only contain valid spu_ids (enforced at application level).
4. **Cascade Deletes**: Deleting an SPU cascades to its favorites and reviews.

---

## Compatibility Notes

- **Historical Chat Sessions**: Messages created before migration have `referenced_spus` column (previously `referenced_products`). Since `products` table is dropped, old references are invalid. Application code should handle missing SPU lookups gracefully.
- **API Compatibility**: Old `/products/*` endpoints are removed. Mini-program must update all API calls to `/spus/*`.
- **Frontend Routes**: Mini-program page routes remain structurally the same (e.g., `/pages/product/detail`), only the `id` parameter changes from `product_id` to `spu_id`.
