# Delta Tasks: Data Collection Module v3

**Input**: Delta design documents from `specs/002-data-collection-module/`
**Prerequisites**: delta-plan.md, delta-spec.md, plan.md (v2 base), tasks.md (v2 base, T001-T043 completed)

**Tests**: Included per delta-plan.md Phase D7.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Task IDs continue from existing tasks.md (T044+).

## Reference: User Stories (from delta-spec.md)

| # | Title | Priority | Type | FRs |
|---|-------|----------|------|-----|
| US1 | Acquire Products (Modified — httpx + Vision LLM pipeline) | P1 | Modified | FR-001a, FR-001b, FR-002, FR-003, FR-014, FR-018-019 |
| US6 | Promotion URL & Commission | P1 | New | FR-020, FR-021 |
| US3 | Scheduled Price & Data Refresh (Modified — add promotion_rate) | P2 | Modified | FR-009 |

## Path Conventions

- **Backend**: `backend/app/`, `backend/tests/`, `backend/alembic/`
- **Admin frontend**: `admin/src/`
- **Mini program frontend**: `frontend/` (NO CHANGES needed)

---

## Phase 1: Setup (Delta Infrastructure)

**Purpose**: Add new Python dependencies, env vars, and retain Playwright Chromium for the login script in the v3 delta.

- [X] T044 [P] Add `playwright>=1.40` to `backend/requirements.txt` (login script only — crawler does not use Playwright)
- [X] T045 [P] Add `openai>=1.0` to `backend/requirements.txt` (already present)
- [X] T046 Add delta environment variables to `backend/.env` (DASHSCOPE_API_KEY, CRAWL_DAILY_LIMIT=200; PLAYWRIGHT_HEADLESS removed — no longer used)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create new service modules and database migration — MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T047 [P] Create `ConservativePDDCrawler` (httpx-based scraper: loads cookies from `pdd_cookies.json`, iPhone UA, 8-15s delay, extracts `window.rawData` via regex from HTML) in `backend/app/services/pdd_crawler.py`
- [X] T048 [P] Create `QwenVLClient` (Qwen-VL-Plus via DashScope OpenAI-compatible endpoint, `analyze_ingredient_image()` + `batch_analyze()`) in `backend/app/services/vision_service.py`
- [X] T049 [P] Create `PromotionUrlService` (PDD promotion URL gen + 12h PostgreSQL cache with Redis optional acceleration) in `backend/app/services/promotion_url_service.py`
- [X] T050 Create Alembic migration `004_delta_v3.py` in `backend/alembic/versions/`: add top-level columns (goods_name, brand, spec_form, age_range, mall_name, pet_type, promotion_rate), JSONB columns (gallery_urls, detail_img_urls, service_tags, ingredients, nutrition), indexes, and `promotion_url_cache` table; extract brand/spec_form/age_range from existing `specifications` JSONB
- [X] T051 Update Product model with new columns in `backend/app/models/product.py`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Modified Product Acquisition (Priority: P1) 🎯 MVP

**Goal**: Insert httpx detail scraping and Vision LLM ingredient analysis into the enrichment pipeline. Add `pet_type` to manual seed. Update SSE to two-phase progress. Products flow PENDING → ENRICHING (5-step pipeline) → ACTIVE.

**Independent Test**: Seed a product with goods_id + pet_type, verify httpx extracts detail images/SKU/mall, Vision LLM extracts ingredients/nutrition, PDD API fetches price+promotion_rate, and product transitions to ACTIVE with all fields populated.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T052 [P] [US1] Unit tests for `pdd_crawler.py` (mock httpx: normal crawl, login wall, empty rawData, batch daily limit) in `backend/tests/unit/test_pdd_crawler.py`
- [X] T053 [P] [US1] Unit tests for `vision_service.py` (mock Qwen-VL API: ingredient image, nutrition image, non-food image, API error, JSON parse failure) in `backend/tests/unit/test_vision_service.py`

### Implementation for User Story 1

- [X] T054 [US1] Modify `enrich_product()` pipeline in `backend/app/services/collection_service.py`: insert httpx crawl as Step 1 (before LLM extraction), insert Vision LLM analysis as Step 3 (after LLM extraction, before PDD API), each step degrades gracefully on failure
- [X] T055 [P] [US1] Add `pet_type` field (Literal["cat", "dog"]) to `ProductSeed` schema in `backend/app/schemas/collection.py`
- [X] T056 [P] [US1] Add `pet_type` to `POST /admin/collect/products/seed` request body in `backend/app/api/v1/admin_collect.py`
- [X] T057 [US1] Update SSE discovery progress to report two-phase progress (`phase: "discovery"` → `phase: "enrichment"`) in `backend/app/api/v1/admin_collect.py`
- [X] T058 [P] [US1] Add `pet_type` selector (猫/狗 radio or dropdown) to admin seed form in `admin/src/pages/Collection/`
- [X] T059 [P] [US1] Update admin API service types (add `pet_type` to seed params) in `admin/src/services/api.ts`
- [X] T060 [US1] Integration test for full enrichment pipeline (seed → httpx → LLM → Vision → PDD price → ACTIVE) in `backend/tests/integration/test_enrichment_pipeline.py`

**Checkpoint**: US1 delta fully functional — httpx+VLLM enrichment pipeline + pet_type + two-phase progress working

---

## Phase 4: User Story 6 — Promotion URL & Commission (Priority: P1)

**Goal**: Generate PDD promotion URLs with PID for commission tracking. Users get cached short URLs when clicking "buy on PDD" in the mini program.

**Independent Test**: Call `GET /api/v1/products/{id}/promotion-url` for an active product, verify response contains `short_url`, `mobile_url`, `we_app_url`. Call again — verify `cached: true` and same URL returned.

### Tests for User Story 6

- [X] T061 [P] [US6] Unit tests for `promotion_url_service.py` (mock PDD API + cache: fresh generation, cache hit, cache expiry, API failure fallback, Redis fallback to PG) in `backend/tests/unit/test_promotion_url.py`

### Implementation for User Story 6

- [X] T062 [US6] Add `generate_promotion_url()` method to `PinduoduoClient` (calls `pdd.ddk.goods.promotion.url.generate`) in `backend/app/services/pdd_client.py`
- [X] T063 [P] [US6] Add `PromotionUrlResponse` Pydantic schema (short_url, mobile_url, we_app_url, cached) in `backend/app/schemas/collection.py`
- [X] T064 [US6] Add `GET /api/v1/products/{product_id}/promotion-url` public endpoint (calls PromotionUrlService, returns PromotionUrlResponse) in `backend/app/api/v1/products.py`

**Checkpoint**: US6 complete — promotion URL generation + caching working

---

## Phase 5: User Story 3 — Modified Scheduled Refresh (Priority: P2)

**Goal**: Hourly price update job now also fetches and stores `promotion_rate` from PDD API.

**Independent Test**: Manually trigger hourly price update job, verify `promotion_rate` field is updated on active products.

### Implementation for User Story 3

- [X] T065 [US3] Add `promotion_rate` field extraction to PDD detail response parser in `backend/app/services/pdd_client.py`
- [X] T066 [US3] Add `promotion_rate` to hourly price update job fields in `backend/app/scheduler/jobs.py`

**Checkpoint**: US3 delta complete — promotion_rate refreshed hourly

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation updates, and code quality pass for delta changes.

- [X] T067 Run quickstart.md validation steps for delta scenarios (httpx crawl, Vision LLM analysis, promotion URL generation)
- [X] T068 Final delta code quality pass: type annotations, Loguru structured logging for new pipeline steps, Prometheus metrics for crawl/vision/promotion-url operations

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────► Phase 2: Foundational ──► (blocks all stories)
                                                        │
              ┌─────────────────┬──────────────────────────┘
              ▼                 ▼
    Phase 3: US1 (P1)   Phase 4: US6 (P1)
              │                 │
              │                 │
              └────────┬────────┘
                       ▼
              Phase 5: US3 (P2)
                       │
                       ▼
              Phase 6: Polish
```

### Story Dependencies

- **US1 (P1)**: Depends on Foundational (T047-T051) — needs httpx crawler, Vision LLM client, DB migration
- **US6 (P1)**: Depends on Foundational (T049, T050, T051) — needs PromotionUrlService, promotion_url_cache table
- **US3 (P2)**: Depends on Foundational + US1 (needs PDD client modification in context of pipeline)

### Within Each Phase

- Foundational: Services [P] → Migration (sequential) → Model update
- US1: Tests [P] → Pipeline integration → Schemas/Endpoints [P] → Admin UI [P] → Integration test
- US6: Tests [P] → PDD client method → Schema [P] → Endpoint
- US3: PDD client parser → Scheduler job

### Parallel Opportunities

- T044, T045 (dependencies) can run in parallel
- T047, T048, T049 (3 new services) can run in parallel
- T052, T053 (unit tests) can run in parallel
- T055, T056 (schema + endpoint) can run in parallel with T054 (pipeline)
- T058, T059 (admin UI) can run in parallel
- T061 (US6 test) can run in parallel with US1 implementation
- T063, T064 (US6 schema + endpoint) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all 3 new services together:
Task: "Create ConservativePDDCrawler in backend/app/services/pdd_crawler.py"
Task: "Create QwenVLClient in backend/app/services/vision_service.py"
Task: "Create PromotionUrlService in backend/app/services/promotion_url_service.py"
```

## Parallel Example: User Story 1

```bash
# Launch all tests together:
Task: "Unit tests for pdd_crawler.py in backend/tests/unit/test_pdd_crawler.py"
Task: "Unit tests for vision_service.py in backend/tests/unit/test_vision_service.py"

# Launch schema + admin UI in parallel with pipeline work:
Task: "Add pet_type to ProductSeed schema in backend/app/schemas/collection.py"
Task: "Add pet_type to POST /admin/collect/products/seed in backend/app/api/v1/admin_collect.py"
Task: "Add pet_type selector to admin seed form in admin/src/pages/Collection/"
Task: "Update admin API service types in admin/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 (httpx + Vision LLM pipeline + pet_type)
4. **STOP and VALIDATE**: Seed a product, verify full 5-step pipeline completes
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → httpx+VLLM enrichment working
3. Add US6 → Test independently → Promotion URLs generating
4. Add US3 → Test independently → promotion_rate updating hourly
5. Polish → Documentation + metrics

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Pipeline + pet_type) — biggest scope (~8 tasks)
   - Developer B: US6 (Promotion URL) — standalone (~4 tasks)
3. After US1/US6:
   - Developer A or B: US3 (Scheduler) — small change (~2 tasks)
4. Polish: Both together

---

## Summary

| Phase | Story | Priority | Tasks | Parallel [P] |
|-------|-------|----------|-------|---------------|
| 1 | Setup | — | 3 | 2 [P] |
| 2 | Foundational | blocks all | 5 | 3 [P] |
| 3 | US1 — Modified Acquisition | P1 | 9 | 6 [P] |
| 4 | US6 — Promotion URL | P1 | 4 | 2 [P] |
| 5 | US3 — Modified Refresh | P2 | 2 | 0 |
| 6 | Polish | — | 2 | 0 |
| **Total** | | | **25** | **13 [P]** |
