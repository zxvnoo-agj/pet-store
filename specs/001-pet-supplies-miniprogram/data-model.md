# Data Model: Pet Supplies Assistant

**Date**: 2026-05-11
**Source**: Feature specification + design document

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │   products   │       │  categories  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │◄─────│ id (PK)      │
│ openid (UQ)  │  │    │ category_id  │──────│ name         │
│ nickname     │  │    │ name         │       │ pet_type     │
│ avatar       │  │    │ brand        │       │ parent_id    │───┐
│ pet_types    │  │    │ price_range  │       │ level        │   │
│ profile      │  │    │ image_urls   │       │ sort_order   │   │
│ created_at   │  │    │ pros (JSONB) │       └──────────────┘   │
│ updated_at   │  │    │ cons (JSONB) │                          │
└──────────────┘  │    │ description  │       ┌──────────────┐   │
                  │    │ source_url   │       │  categories  │   │
                  │    │ status       │       │ (parent)     │◄──┘
                  │    │ created_at   │       └──────────────┘
                  │    └──────────────┘
                  │           │
                  │    ┌──────┴──────┐
                  │    │             │
                  │    ▼             ▼
                  │ ┌──────────┐  ┌──────────┐
                  │ │ reviews  │  │favorites │
                  │ ├──────────┤  ├──────────┤
                  └►│ user_id  │  │ user_id  │
                    │ product_id│  │ product_id│
                    │ rating   │  │ created_at│
                    │ content  │  └──────────┘
                    │ tags     │
                    │ status   │
                    └──────────┘

┌──────────────┐       ┌──────────────┐
│chat_sessions │◄─────│chat_messages │
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │
│ user_id      │       │ session_id   │
│ title        │       │ role         │
│ model        │       │ content      │
│ created_at   │       │ tool_calls   │
│ updated_at   │       │ tokens_used  │
└──────────────┘       │ created_at   │
                       └──────────────┘
```

## Core Entities

### users

Stores WeChat mini program user information.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| openid | VARCHAR(64) | NOT NULL, UNIQUE | WeChat openid |
| unionid | VARCHAR(64) | | WeChat unionid (for multi-app) |
| nickname | VARCHAR(64) | | User nickname |
| avatar_url | VARCHAR(256) | | Avatar image URL |
| pet_types | JSONB | DEFAULT '[]' | Pet types user owns: `["cat", "dog"]` |
| profile | JSONB | DEFAULT '{}' | Extended info (years of pet ownership, etc.) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: `idx_users_openid` on openid

### categories

Hierarchical product classification by pet type and product type.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| name | VARCHAR(64) | NOT NULL | Category name (e.g., "Cat Food", "Dog Toys") |
| pet_type | VARCHAR(32) | NOT NULL | Pet type: cat/dog/bird/fish/reptile/small_pet |
| parent_id | INTEGER | FK → categories(id) | Parent category (supports 2-level hierarchy) |
| level | INTEGER | DEFAULT 1 | Hierarchy level: 1=primary, 2=secondary |
| icon | VARCHAR(128) | | Icon URL or CSS class |
| sort_order | INTEGER | DEFAULT 0 | Display order weight |
| is_active | BOOLEAN | DEFAULT TRUE | Whether category is active |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

**Sample Data**:
```
(1, '猫粮', 'cat', null, 1, 'icon-cat-food', 1, true)
(2, '干粮', 'cat', 1, 2, null, 1, true)
(3, '湿粮', 'cat', 1, 2, null, 2, true)
(4, '狗粮', 'dog', null, 1, 'icon-dog-food', 2, true)
```

### products

Core product catalog with structured attributes.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| category_id | INTEGER | NOT NULL, FK → categories(id) | Product category |
| name | VARCHAR(128) | NOT NULL | Product name |
| brand | VARCHAR(64) | | Brand name |
| price_min | DECIMAL(10,2) | | Minimum price |
| price_max | DECIMAL(10,2) | | Maximum price |
| currency | VARCHAR(8) | DEFAULT 'CNY' | Currency code |
| image_urls | JSONB | DEFAULT '[]' | Product image URLs array |
| pros | JSONB | DEFAULT '[]' | Pros tags: `["High protein", "Good taste"]` |
| cons | JSONB | DEFAULT '[]' | Cons tags: `["Expensive", "Fragile packaging"]` |
| ratings | JSONB | DEFAULT '{}' | Multi-dimensional ratings: `{"overall": 4.5, ...}` |
| description | TEXT | | Product description |
| ingredients | JSONB | DEFAULT '[]' | Ingredient list (for food products) |
| specifications | JSONB | DEFAULT '{}' | Key-value specs |
| source_url | VARCHAR(256) | | External e-commerce link (JD/Taobao) |
| source_platform | VARCHAR(32) | | Source platform name |
| status | VARCHAR(16) | DEFAULT 'active' | active/inactive/deleted |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**:
- `idx_products_category` on category_id
- `idx_products_brand` on brand
- `idx_products_pet_type` on categories.pet_type (for pet type filtering)

### reviews

User reviews with structured tags and moderation status.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| product_id | INTEGER | NOT NULL, FK → products(id), ON DELETE CASCADE | Reviewed product |
| user_id | INTEGER | FK → users(id), nullable | Reviewer (null for anonymous/crawled) |
| rating | DECIMAL(2,1) | NOT NULL, CHECK (1-5) | Star rating (1-5) |
| content | TEXT | NOT NULL | Review text |
| images | JSONB | DEFAULT '[]' | Review image URLs |
| tags | JSONB | DEFAULT '[]' | Extracted tags: `["Good taste", "Shiny coat"]` |
| is_recommended | BOOLEAN | | Whether user recommends |
| source | VARCHAR(32) | DEFAULT 'user' | user/crawled |
| source_url | VARCHAR(256) | | Original review URL (if crawled) |
| helpful_count | INTEGER | DEFAULT 0 | Number of "helpful" votes |
| status | VARCHAR(16) | DEFAULT 'pending' | pending/approved/rejected |
| llm_review_result | JSONB | | LLM moderation result |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**:
- `idx_reviews_product` on product_id
- `idx_reviews_rating` on rating
- `idx_reviews_status` on status (for moderation queue)

### favorites

User's saved products.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| user_id | INTEGER | NOT NULL, FK → users(id), ON DELETE CASCADE | User |
| product_id | INTEGER | NOT NULL, FK → products(id), ON DELETE CASCADE | Saved product |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

**Constraints**: UNIQUE(user_id, product_id)

### chat_sessions

AI conversation sessions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| user_id | INTEGER | FK → users(id), nullable | Session owner (null for anonymous) |
| title | VARCHAR(128) | | Session title (auto-generated or user-edited) |
| model | VARCHAR(32) | DEFAULT 'gpt-4o' | LLM model used |
| system_prompt | TEXT | | Custom system prompt for session |
| metadata | JSONB | DEFAULT '{}' | Extended info (token usage, etc.) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### chat_messages

Individual messages within chat sessions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| session_id | INTEGER | NOT NULL, FK → chat_sessions(id), ON DELETE CASCADE | Parent session |
| role | VARCHAR(16) | NOT NULL, CHECK IN ('user', 'assistant', 'system', 'tool') | Message role |
| content | TEXT | NOT NULL | Message content |
| tool_calls | JSONB | | Tool call records: `[{"tool": "search_products", ...}]` |
| tokens_used | INTEGER | | Token consumption |
| referenced_products | JSONB | DEFAULT '[]' | Product IDs mentioned: `[1, 2, 3]` |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

**Indexes**: `idx_chat_messages_session` on (session_id, created_at)

## Data Collection Entities

### data_sources

External data source configurations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| name | VARCHAR(64) | NOT NULL | Source name: jd/taobao/xiaohongshu |
| type | VARCHAR(32) | NOT NULL | Source type: ecommerce/social |
| api_endpoint | VARCHAR(256) | | API URL |
| api_key | VARCHAR(256) | | API key (encrypted) |
| config | JSONB | DEFAULT '{}' | Additional config parameters |
| is_active | BOOLEAN | DEFAULT TRUE | Whether source is active |
| last_fetch_at | TIMESTAMPTZ | | Last collection time |
| fetch_count | INTEGER | DEFAULT 0 | Number of collections |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

### fetch_logs

Data collection task logs.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| task_name | VARCHAR(128) | NOT NULL | Task name |
| source_id | INTEGER | FK → data_sources(id) | Data source |
| status | VARCHAR(16) | NOT NULL | success/failed/partial |
| items_fetched | INTEGER | DEFAULT 0 | Number of items collected |
| items_new | INTEGER | DEFAULT 0 | Number of new items |
| items_updated | INTEGER | DEFAULT 0 | Number of updated items |
| error_message | TEXT | | Error message |
| started_at | TIMESTAMPTZ | | Start time |
| completed_at | TIMESTAMPTZ | | Completion time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

### external_products

Mapping between internal products and external platform products.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| product_id | INTEGER | FK → products(id) | Internal product |
| source_id | INTEGER | FK → data_sources(id) | Data source |
| external_id | VARCHAR(128) | NOT NULL | External platform product ID |
| external_url | VARCHAR(512) | | External product URL |
| external_name | VARCHAR(256) | | External platform product name |
| current_price | DECIMAL(10,2) | | Current price |
| original_price | DECIMAL(10,2) | | Original price |
| sales_count | INTEGER | | Sales volume |
| last_sync_at | TIMESTAMPTZ | | Last sync time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

**Constraints**: UNIQUE(product_id, source_id)

### price_history

Historical price records for trend analysis.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| product_id | INTEGER | FK → products(id) | Product |
| source_id | INTEGER | FK → data_sources(id) | Data source |
| price | DECIMAL(10,2) | NOT NULL | Price at recording time |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Recording time |

**Indexes**: `idx_price_history_product` on (product_id, recorded_at)

## Validation Rules

### products
- price_min ≤ price_max (if both present)
- ratings.overall must be between 0 and 5
- status must be one of: active, inactive, deleted
- category_id must reference an active category

### reviews
- rating must be between 1 and 5
- content minimum length: 5 characters
- status must be one of: pending, approved, rejected
- product_id must reference an active product

### chat_messages
- role must be one of: user, assistant, system, tool
- session_id must reference an existing session
- content cannot be empty

## State Transitions

### Review Moderation Flow

```
┌─────────┐    LLM review     ┌──────────┐    Admin review    ┌─────────┐
│ PENDING │ ────────────────► │ APPROVED │ ────────────────► │ PUBLISHED│
└─────────┘                   └──────────┘                   └─────────┘
     │                             │
     │ LLM rejected                │ Admin rejected
     ▼                             ▼
┌─────────┐                   ┌─────────┐
│ REJECTED│                   │ REJECTED│
└─────────┘                   └─────────┘
```

### Product Status Flow

```
┌─────────┐     deactivate     ┌──────────┐
│ ACTIVE  │ ─────────────────► │ INACTIVE │
└─────────┘                    └──────────┘
     │                               │
     │ delete                        │ delete
     ▼                               ▼
┌─────────┐
│ DELETED │
└─────────┘
```

## Indexes Strategy

### Query Patterns & Indexes

1. **Product browsing by category**: `idx_products_category`
2. **Product filtering by brand**: `idx_products_brand`
3. **Pet type filtering**: `idx_products_pet_type` (on categories)
4. **Review retrieval by product**: `idx_reviews_product`
5. **Review filtering by rating**: `idx_reviews_rating`
6. **Chat history retrieval**: `idx_chat_messages_session`
7. **Price trend queries**: `idx_price_history_product`
8. **User lookup by openid**: `idx_users_openid`
9. **Moderation queue**: `idx_reviews_status`

### Full-Text Search

PostgreSQL full-text search on:
- products.name
- products.description
- products.brand
- reviews.content

Consider adding Meilisearch for advanced search features (fuzzy matching, typo tolerance) in Phase 2.

## Data Volume Estimates

| Entity | Initial (MVP) | Growth (monthly) |
|--------|--------------|------------------|
| users | 1,000 | +500 |
| products | 500 | +200 |
| categories | 50 | +10 |
| reviews | 5,000 | +2,000 |
| chat_sessions | 2,000 | +1,000 |
| chat_messages | 20,000 | +10,000 |
| favorites | 3,000 | +1,500 |

## Migration Strategy

1. **Phase 1 (MVP)**: Core entities only (users, categories, products, reviews, favorites, chat_sessions, chat_messages)
2. **Phase 2**: Add data collection entities (data_sources, fetch_logs, external_products, price_history)
3. **Phase 3**: Add vector storage (pgvector extension, product embeddings)
