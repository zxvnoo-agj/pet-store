# Tasks: Data Collection & Enrichment Module

**Input**: Design documents from `specs/002-data-collection-module/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

- **Backend**: `backend/app/`, `backend/tests/`, `backend/alembic/` (project already initialized)
- **Admin frontend**: `admin/src/` (project already initialized)
- **Mini program frontend**: `frontend/` (NO CHANGES needed)

## Reference: User Stories (from spec.md)

| # | Title | Priority | FRs |
|---|-------|----------|-----|
| US1 | Acquire Products (Auto-Discovery + Manual Seeding) and Auto-Fetch Product Data | P1 | FR-001–FR-004a |
| US2 | Auto-Collect XHS Reviews for Real User Feedback | P1 | FR-005–FR-008, FR-014–FR-017 |
| US3 | Scheduled Price & Data Refresh | P2 | FR-009, FR-010, FR-014 |
| US4 | Collection Monitoring & Failure Handling | P2 | FR-012, FR-013 |
| US5 | LLM Tag Aggregation to Product Level | P3 | FR-011 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new dependencies, directories, and configuration for the collection module

- [ ] T001 [P] Add collection module dependencies (aiohttp, APScheduler) to backend/requirements.txt
- [ ] T002 [P] Create admin frontend page directories (Collection/, Strategies/, CollectionLogs/) under admin/src/pages/
- [ ] T003 Add collection module environment variables to backend/.env (PDD_CLIENT_ID, PDD_CLIENT_SECRET, PDD_PID, XHS_COOKIE, XHS_BACKUP_COOKIE)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create shared async HTTP client with retry and rate limiting in backend/app/utils/http_client.py
- [ ] T005 Create Alembic migration for new tables (search_strategies, external_products, price_history) and column additions in backend/alembic/versions/003_data_collection.py
- [ ] T006 Seed data_sources table with PDD ("拼多多多多进宝", platform='pdd') and XHS ("小红书", platform='xiaohongshu') entries
- [ ] T007 Setup APScheduler AsyncIOScheduler initialization in backend/app/scheduler/__init__.py
- [ ] T008 Configure Loguru structured logging for collection tasks in backend/app/utils/logging.py

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Acquire Products & Auto-Fetch (Priority: P1) 🎯 MVP

**Goal**: Operators can configure PDD search strategies, execute auto-discovery to find products, manually seed via PDD link, and have product data fetched + LLM-extracted automatically. Products flow through PENDING → ENRICHING → ACTIVE states.

**Independent Test**: Deploy backend, create a search strategy (keyword "猫粮", max_items=10), execute it, verify new products appear with PDD data and LLM-extracted fields populated.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Create collection Pydantic schemas (SearchStrategyCreate, SearchStrategyResponse, ProductSeed, CollectionJobResponse, DiscoveryProgress) in backend/app/schemas/collection.py
- [ ] T010 [P] [US1] Create search_strategies model in backend/app/models/collection.py
- [ ] T011 [P] [US1] Create external_products model in backend/app/models/collection.py
- [ ] T012 [P] [US1] Implement PDD Duoduo Jinbao API client with MD5 signature, search/detail endpoints, rate limiting (2s), retry logic in backend/app/services/pdd_client.py
- [ ] T013 [P] [US1] Implement LLM extraction service for product fields (brand, spec_weight, form, origin, shelf_life, age_range, special_formula, ingredients, nutrition) in backend/app/services/llm_extractor.py
- [ ] T014 [US1] Extend products model status CHECK constraint to include 'pending', 'enriching', 'failed' in backend/app/models/product.py
- [ ] T015 [US1] Implement collection orchestration service (search discovery → PDD detail fetch → LLM extraction → product update) in backend/app/services/collection_service.py
- [ ] T016 [P] [US1] Implement search strategy CRUD + execute endpoints (POST/GET/DELETE strategies, POST execute) in backend/app/api/v1/admin_collect.py
- [ ] T017 [P] [US1] Implement product seed + collection status + retry endpoints in backend/app/api/v1/admin_collect.py
- [ ] T018 [US1] Implement SSE discovery progress endpoint in backend/app/api/v1/admin_collect.py
- [ ] T019 [P] [US1] Create admin Collection management page (product status list, seed form, retry button) in admin/src/pages/Collection/
- [ ] T020 [P] [US1] Create admin Strategies management page (CRUD list, execute button) in admin/src/pages/Strategies/
- [ ] T021 [US1] Add collection API service functions (strategies, products, progress) in admin/src/services/api.ts

**Checkpoint**: US1 fully functional — auto-discovery + manual seeding + PDD data fetch + LLM extraction working

---

## Phase 4: User Story 2 — Auto-Collect XHS Reviews (Priority: P1)

**Goal**: System searches XHS for product-related notes using brand + product name, collects note details and comments, analyzes each via LLM for pros/cons tags, recommendation stance, and cat reaction.

**Independent Test**: Find a product with brand name populated, trigger XHS collection, verify new reviews appear with source='crawled' and LLM tags (pros/cons, confidence, recommendation).

### Implementation for User Story 2

- [ ] T022 [P] [US2] Extend reviews model with external_note_id, author, note_published_at, note_likes columns in backend/app/models/review.py
- [ ] T023 [P] [US2] Implement XHS collector service (note search by keyword, note detail, comment retrieval, cookie auth, rate limiting, dedup by note_id) in backend/app/services/xhs_collector.py
- [ ] T024 [P] [US2] Implement LLM review analyzer (pros/cons tags, recommendation stance, confidence, cat reaction, summary) in backend/app/services/llm_analyzer.py
- [ ] T025 [US2] Add XHS collection trigger + admin review list (with author fields) endpoints in backend/app/api/v1/admin_collect.py
- [ ] T026 [US2] Implement author privacy filtering per FR-017 (author stripped from public API, visible in admin)
- [ ] T027 [US2] Update admin services with XHS trigger and review list API calls in admin/src/services/api.ts

**Checkpoint**: US2 fully functional — XHS review collection + LLM analysis complete

---

## Phase 5: User Story 3 — Scheduled Price & Data Refresh (Priority: P2)

**Goal**: System automatically refreshes PDD prices hourly, performs incremental XHS collection daily, and runs tag aggregation daily.

**Independent Test**: After deployment, verify hourly price update job runs and updates product prices. Run daily review fetch job manually and verify new reviews collected.

### Implementation for User Story 3

- [ ] T028 [US3] Create price_history model in backend/app/models/collection.py
- [ ] T029 [P] [US3] Implement hourly price update job (iterate active products, fetch PDD detail, update prices/coupons/sales, record price_history) in backend/app/scheduler/jobs.py
- [ ] T030 [P] [US3] Implement daily incremental XHS review fetch job (use timestamp cursor, only new notes) in backend/app/scheduler/jobs.py
- [ ] T031 [US3] Add scheduler status query and manual trigger endpoints in backend/app/api/v1/admin_collect.py

**Checkpoint**: US3 complete — all three scheduled jobs registered and triggerable

---

## Phase 6: User Story 4 — Collection Monitoring & Failure Handling (Priority: P2)

**Goal**: Operators can view collection job logs with status, error details, failure counts, and retry failed jobs. Admin nav shows badge count of failed tasks.

**Independent Test**: View collection logs page, see all job records sorted by time. Click a failed job, see error details. Click retry, verify new job created.

### Implementation for User Story 4

- [ ] T032 [US4] Extend data_fetch_jobs model with collection_type, cursor_value, product_id columns in backend/app/models/data_source.py
- [ ] T033 [P] [US4] Implement collection jobs list/detail/retry endpoints in backend/app/api/v1/admin_collect.py
- [ ] T034 [P] [US4] Implement data source config update endpoint (cookie rotation, is_active toggle) in backend/app/api/v1/admin_collect.py
- [ ] T035 [US4] Create admin CollectionLogs page (job list with status badges, detail modal, retry button) in admin/src/pages/CollectionLogs/
- [ ] T036 [US4] Add failed job badge count in admin navigation menu
- [ ] T037 [US4] Add collection job API service functions in admin/src/services/api.ts

**Checkpoint**: US4 complete — full monitoring and retry capability

---

## Phase 7: User Story 5 — LLM Tag Aggregation to Product Level (Priority: P3)

**Goal**: System aggregates all LLM-analyzed review tags per product into Top-8 pros, Top-6 cons (confidence-weighted), and recommendation rate, stored in product record.

**Independent Test**: For a product with 5+ analyzed reviews, trigger aggregation, verify product.pros/cons/recommend_rate fields are populated.

### Implementation for User Story 5

- [ ] T038 [P] [US5] Implement weighted tag aggregation logic (confidence-weighted pros/cons count, recommend_rate calculation) in backend/app/services/collection_service.py
- [ ] T039 [P] [US5] Implement daily tag aggregation scheduled job in backend/app/scheduler/jobs.py
- [ ] T040 [US5] Add manual aggregation trigger endpoint for a single product in backend/app/api/v1/admin_collect.py

**Checkpoint**: US5 complete — tag aggregation working and scheduling integration done

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final cleanup

- [ ] T041 [P] Add cross-cutting documentation for collection module (README updates, API docs)
- [ ] T042 Run quickstart.md validation steps to verify integration scenarios
- [ ] T043 Final cleanup, type annotations, and code quality pass

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────► Phase 2: Foundational ──► (blocks all stories)
                                                                   │
                    ┌────────────────┬────────────────┬──────────────┘
                    ▼                ▼                ▼
           Phase 3: US1 (P1)  Phase 4: US2 (P1)  Phase 5: US3 (P2)
                    │                │                │
                    │                ▼                │
                    │         Phase 6: US4 (P2)       │
                    │                │                │
                    └────────────────┼────────────────┘
                                     ▼
                            Phase 7: US5 (P3)
                                     │
                                     ▼
                            Phase 8: Polish
```

### Story Dependencies

- **US1 (P1)**: No dependencies on other stories — can start after Phase 2
- **US2 (P1)**: No dependencies on other stories — can start after Phase 2
- **US3 (P2)**: Depends on US1 (uses PDD client), US2 (uses XHS collector), US5 (uses tag aggregation)
- **US4 (P2)**: No strict dependencies but benefits from US1 tasks completing first (seeds data_fetch_jobs)
- **US5 (P3)**: Depends on US2 (needs analyzed reviews to aggregate)

### Within Each Phase

- Models before services
- Services before endpoints
- Backend before frontend admin pages
- Core implementation before integration

### Parallel Opportunities

- All [P] tasks within a phase can run in parallel
- US1 and US2 can start in parallel after Phase 2
- Within USs 1/2/4: models marked [P] can run together; services/endpoints marked [P] can run together

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Acquire Products — P1)
4. **STOP and VALIDATE**: Test auto-discovery + manual seeding independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 → Test independently → Deploy/Demo
4. Add US3 → Test independently → Deploy/Demo
5. Add US4 → Test independently → Deploy/Demo
6. Add US5 → Test independently → Deploy/Demo

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Products) — biggest scope
   - Developer B: US2 (XHS Reviews)
3. After US1/US2:
   - Developer A: US3 (Scheduling) + US5 (Aggregation)
   - Developer B: US4 (Monitoring)

---

## Summary

| Phase | Story | Priority | Tasks | Parallels |
|-------|-------|----------|-------|-----------|
| 1 | Setup | — | 3 | 2 [P] |
| 2 | Foundational | blocks all | 5 | 0 |
| 3 | US1 — Acquire Products | P1 | 13 | 7 [P] |
| 4 | US2 — XHS Reviews | P1 | 6 | 3 [P] |
| 5 | US3 — Scheduled Refresh | P2 | 4 | 2 [P] |
| 6 | US4 — Monitoring & Retry | P2 | 6 | 3 [P] |
| 7 | US5 — Tag Aggregation | P3 | 3 | 2 [P] |
| 8 | Polish | — | 3 | 1 [P] |
| **Total** | | | **43** | **20 [P]** |
