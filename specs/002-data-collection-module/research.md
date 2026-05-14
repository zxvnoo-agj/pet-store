# Research: Data Collection & Enrichment Module

**Date**: 2026-05-14
**Feature**: 002-data-collection-module

## Research Topics

### 1. PDD Duoduo Jinbao API Integration

**Decision**: Build custom async client using `aiohttp` with MD5-based signature algorithm as specified in data-collection-module-design.md Section 2.

**Rationale**: The PDD API uses a proprietary MD5-based signature scheme. No existing Python SDK supports Duoduo Jinbao specifically. The design doc provides complete reference implementation (Section 2.2-2.7) covering:
- Signature generation (`client_secret + sorted_params + client_secret` → MD5 uppercase)
- Endpoints: `pdd.ddk.goods.search` (auto-discovery), `pdd.ddk.goods.detail` (detail fetch), `pdd.goods.opt.get` (category lookup)
- Rate limiting: 2s interval, exponential backoff, max 3 retries
- Data normalization: price from cents to yuan, field mapping

**Alternatives considered**: 
- `pdd-sdk` Python library — but it targets older PDD APIs, not Duoduo Jinbao
- Requests library — rejected in favor of aiohttp for async compatibility with FastAPI

**API Call Budget**: 2000 calls/day. Approximate allocation:
- Search (auto-discovery): ~200 calls/day (pages × categories)
- Detail fetch (new products): ~100 calls/day
- Hourly price refresh (500 products): ~500 calls/day (batched)
- Buffer: ~200 calls for retries and manual operations

### 2. Xiaohongshu (XHS) Data Collection

**Decision**: Use the `xhs` Python library (`from xhs import XHS`) as referenced in the design doc, with cookie-based authentication and proxy rotation.

**Rationale**: 
- `xhs` library supports note search by keyword, note detail fetch, and comment retrieval
- Cookie-based auth is the standard approach for XHS data
- Support for `SearchSortType.HOT` (initial full collection) and `SearchSortType.TIME` (incremental)

**Alternatives considered**:
- Direct HTTP API scraping — more fragile due to XHS anti-bot measures
- Official XHS API — requires partner status, not available for MVP
- Playwright/browser automation — too heavy for server-side scheduled tasks

**Risk**: Cookie expiry and anti-bot detection. Mitigations:
- FR-016: Backup account support with credential rotation
- 2-week cookie refresh cycle
- Proxy pool rotation (optional, configurable)

### 3. LLM Field Extraction & Review Analysis

**Decision**: Reuse the existing LangChain + LLM infrastructure from Feature 001 for both product field extraction and review analysis.

**Rationale**:
- Feature 001 already provisions LLM access
- Design doc Sections 3.2-3.3 provide complete prompts for product extraction
- Design doc Section 5.1 provides the review analysis prompt
- Temperature=0.1 for extraction (deterministic), 0.3 for analysis (balanced)
- Max 3000 chars input for product descriptions (truncation avoids context limits)

**Alternatives considered**:
- Rule-based extraction (regex patterns) — insufficient accuracy for natural language product descriptions
- Fine-tuned smaller model — higher upfront cost, not justified for MVP
- Separate LLM service — adds operational complexity without benefit

**Token Cost Estimate** (per product, gpt-4o-mini pricing):
- Product extraction: ~800 input + ~300 output tokens
- Per-review analysis: ~600 input + ~200 output tokens
- Per-product aggregation: ~400 input + ~200 output tokens
- Monthly estimate (500 products, 30 reviews each): ~$15-25 USD

### 4. Scheduler Architecture

**Decision**: APScheduler 3.x with AsyncIOScheduler for in-process job scheduling.

**Rationale**:
- Design doc Section 6 specifies APScheduler
- AsyncIOScheduler is compatible with FastAPI's async event loop
- In-process scheduling avoids separate worker infrastructure for MVP
- Job store in PostgreSQL via SQLAlchemyJobStore for persistence

**Job Schedule**:
| Job | Trigger | Purpose |
|-----|---------|---------|
| `hourly_price_update` | Cron `*/60` (every hour) | Update PDD prices, coupons, sales |
| `daily_review_fetch` | Cron `hour=3, minute=0` | Incremental XHS review collection |
| `daily_tag_aggregation` | Cron `hour=4, minute=0` | Aggregate review tags to products |

**Alternatives considered**:
- Celery + Redis — overkill for MVP (3 jobs), adds Redis dependency beyond caching
- External cron + scripts — less integrated with the application lifecycle
- Temporal/Prefect — enterprise-grade workflow engines, not justified for MVP

**Risk**: Scheduler runs in the same process as API server; long-running collection tasks could impact API latency. Mitigation: run collection in background asyncio tasks; consider extracting to separate worker process if needed.

### 5. Search Strategy Model

**Decision**: New `search_strategies` table for persisted search configurations.

**Rationale**: Clarification Q3 established strategies should be saved for manual re-execution. A dedicated table allows:
- Multiple named strategies per data source
- Parameter storage (keywords, category_id, price range, sort type, max items)
- Tracking last execution time and result summary
- One-click re-execution from admin UI

**Schema**:
- id, name, data_source_id (FK), keywords (JSONB array), opt_id, price_min, price_max, sort_type, max_items, last_run_at, last_result (JSONB: new/skipped/failed counts), created_at, updated_at

### 6. Data Model Reconciliation — Actual Implementation vs 001 Spec

**Decision**: Extend the actual implemented tables, not the idealized 001 data model spec.

**Key Discrepancies Found**:

| Entity | 001 Data Model Spec | Actual Implementation | 002 Approach |
|--------|---------------------|-----------------------|--------------|
| `data_sources` | fields: name, type, api_endpoint, api_key, fetch_count | fields: name, platform, config(JSONB), sync_interval_minutes | Use actual implementation; PDD/XHS credentials in `config` JSONB |
| `fetch_logs` | Planned as separate table | `data_fetch_jobs` exists with fields: data_source_id, job_type, status, params, result, error_message | Extend `data_fetch_jobs` with `collection_type`, `cursor_value`, `product_id` instead of creating new `fetch_logs` table |
| `external_products` | Planned as Phase 2 | NOT implemented | Create new `external_products` table as specified, with `pid` field added |
| `price_history` | Planned as Phase 2 | NOT implemented | Create new `price_history` table as specified |
| `products.status` | values: active/inactive/deleted | Same: active/inactive/deleted | Add `pending`, `enriching`, `failed` to status CHECK constraint (FR-004a) |
| `reviews` | Data model fields match implementation | Implementation matches spec | Add 4 new columns: `external_note_id`, `author`, `note_published_at`, `note_likes` |

**Rationale**: Modifying actual tables prevents migration conflicts. The implemented `data_fetch_jobs` table already serves the collection logging purpose — extending it avoids creating a redundant `fetch_logs` table.

### 7. Admin Backend Integration

**Decision**: Add collection management pages to the existing React admin, following 001 patterns (antd components, peach theme).

**New Pages**:
- `/collection/strategies` — Search strategy CRUD + execution
- `/collection/logs` — Fetch job log viewer with status badges and retry buttons
- `/collection/products` — Product status overview (pending/enriching/active/failed)

**Existing pages modified**: None required; collection data enriches the existing product grid via `status` column and `source_platform` filter.

### 8. Privacy & Data Protection

**Decision**: Implement API-level filtering for author privacy (FR-017).

**Rationale**:
- XHS author names stored in `reviews.author` column (full name) for admin reference
- Public API endpoints (`/api/v1/products/{id}/reviews`) strip `author` field from response
- Admin API endpoints (`/api/v1/admin/reviews`) include `author` field
- Per clarification Q2 and data-collection-module-design.md Section 8 (compliance table: "用户昵称脱敏处理")

No separate anonymization column needed — filtering at the API/query level is sufficient.

## Summary of Technical Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | PDD API Client | Async aiohttp with custom MD5 signature |
| 2 | XHS Collection | `xhs` Python library, cookie auth |
| 3 | LLM Extraction/Analysis | Reuse 001 LangChain setup, design doc prompts |
| 4 | Scheduler | APScheduler 3.x AsyncIOScheduler, in-process |
| 5 | Search Strategies | New `search_strategies` table |
| 6 | Data Model | Extend actual implemented tables, not 001 spec |
| 7 | Admin UI | Extend existing React admin, antd components |
| 8 | Privacy | API-level filtering, author stored but not exposed publicly |
