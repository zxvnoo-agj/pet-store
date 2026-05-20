# Tasks: Data Collection Refinement

**Input**: Design documents from `/specs/003-data-collection-refinement/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec — test tasks omitted. Run `pytest tests/ -v` before merging per constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- All backend code under `backend/`
- Models: `backend/app/models/`
- Schemas: `backend/app/schemas/`
- Services: `backend/app/services/`
- API routes: `backend/app/api/v1/`
- Utils: `backend/app/utils/`
- Migrations: `backend/alembic/versions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [x] T001 Install chardet dependency in backend/requirements.txt (`pip install chardet && pip freeze | grep chardet >> backend/requirements.txt`)
- [x] T002 [P] Create pet-store/pdd/ directory with .gitkeep for crawler txt file landing zone

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create Alembic migration for crawled_products table in backend/alembic/versions/ (11 columns: id, goods_id UNIQUE, title, raw_content, raw_text, raw_html, images JSONB, crawl_timestamp, file_source, import_status, import_error + created_at, updated_at)
- [ ] T004 Run migration `cd backend && alembic upgrade head` to create crawled_products table (DB unavailable — migration file ready, run when PostgreSQL is online)
- [x] T005 [P] Create CrawledProduct SQLAlchemy model in backend/app/models/crawled_product.py (table with goods_id unique index, import_status index)
- [x] T006 [P] Create Pydantic schemas in backend/app/schemas/crawled_product.py (CrawledProductCreate, CrawledProductUpdate, CrawledProductResponse, ImportResult with total_files/new_records/updated_records/failed_files/failed_details/duration_seconds)
- [x] T007 [P] Create encoding detection utility in backend/app/utils/encoding_detector.py (chardet-based detection, UTF-8 primary, GBK fallback, confidence threshold 0.7)
- [x] T008 Register CrawledProduct model in backend/app/models/__init__.py (import into models package)

**Checkpoint**: Foundation ready — crawled_products table exists, model and schemas available, encoding detector ready

---

## Phase 3: User Story 1 - Import Crawled Product Data from TXT Files (Priority: P1) 🎯 MVP

**Goal**: Operators can place JSONL txt files in `pet-store/pdd/` and trigger a synchronous import from the admin backend. System scans directory, parses each file, deduplicates by goods_id (UPSERT), and returns a detailed summary.

**Independent Test**: Place test txt files in `pet-store/pdd/`, call `POST /api/v1/admin/collect/crawled/import`, verify response shows correct counts, verify records in `crawled_products` table.

### Implementation for User Story 1

- [x] T009 [US1] Create txt_importer service in backend/app/services/txt_importer.py — scans `pet-store/pdd/` for .txt files, reads with encoding detection, parses JSONL line-by-line, returns list of parsed records with per-file error tracking
- [x] T010 [US1] Create crawled_product_service in backend/app/services/crawled_product_service.py — CRUD operations: bulk_upsert (INSERT ... ON CONFLICT DO UPDATE), get_by_goods_id, list with pagination/filtering, get_by_id with full detail
- [x] T011 [US1] Create admin_crawled API router in backend/app/api/v1/admin_crawled.py — POST /import (trigger import, returns ImportResult), GET /products (list with page/goods_id/import_status/file_source filters), GET /products/{goods_id} (full detail)
- [x] T012 [US1] Register admin_crawled router in backend/app/api/v1/__init__.py (include_router with prefix="/admin/collect/crawled", auth dependency)

**Checkpoint**: User Story 1 fully functional — import, list, detail endpoints all working; data persisting correctly with deduplication

---

## Phase 4: User Story 2 - Match Strategy Search Results with Crawled Data and Enrich via LLM (Priority: P1)

**Goal**: After a strategy search completes, system automatically matches discovered goods_ids against `crawled_products`, runs LLM extraction from crawled content for matched products, then calls PDD goods.detail for remaining fields. Product transitions from "pending" → "enriching" → "active" (or "failed").

**Independent Test**: Seed a product with a goods_id that exists in `crawled_products`, call `POST /api/v1/admin/collect/products/{id}/rematch`, verify product status becomes "active" with LLM-extracted fields populated within 3 minutes.

### Implementation for User Story 2

- [x] T013 [US2] Extend llm_extractor with `extract_from_crawled_content()` in backend/app/services/llm_extractor.py — new prompt optimized for crawled raw_text (5000 char limit), returns brand/spec_weight/spec_form/origin/shelf_life/age_range/special_formula/top_8_ingredients/nutrition_highlight; optional vision supplement when images present and text completion < 50%
- [x] T014 [US2] Create enrichment_service in backend/app/services/enrichment_service.py — `enrich_product(product_id, goods_id)`: (1) match goods_id in crawled_products, (2) extract fields via LLM, (3) call pdd_client.fetch_goods_detail() for remaining fields, (4) write fields to product record, (5) update product status, (6) log per-product result to data_fetch_jobs params.result
- [x] T015 [US2] Integrate enrichment_service into collection_service post-strategy-execution hook in backend/app/services/collection_service.py — after strategy search completes, iterate discovered goods_ids, call enrichment_service.enrich_product() for each, create data_fetch_jobs record with job_type="enrich_match"; matched products use 003 pipeline, unmatched bypass enrichment (status stays pending)
- [x] T016 [US2] Add POST /rematch endpoint in backend/app/api/v1/admin_crawled.py — `POST /admin/collect/products/{product_id}/rematch`: looks up product's goods_id from external_products, queries crawled_products, returns {matched: true/false, status}; triggers enrichment if matched (FR-012)

**Checkpoint**: User Story 2 fully functional — strategy search auto-triggers enrichment for matched products; manual rematch works for individual products

---

## Phase 5: User Story 3 - Mark Unmatched Products as Pending Collection (Priority: P2)

**Goal**: Products not found in `crawled_products` are correctly marked as "pending" with a note "爬取数据未覆盖". Operators can view pending products and manually trigger re-match after new data is imported.

**Independent Test**: Run strategy search with a goods_id not in `crawled_products`, verify product appears as "pending" in admin product list, verify rematch returns {matched: false}. Import matching data, then rematch should succeed.

### Implementation for User Story 3

- [x] T017 [US3] Ensure pending marking logic in enrichment_service.py sets status="pending" and adds description note "爬取数据未覆盖" for unmatched products (FR-008 — this logic is shared with US2 enrichment flow, ensure it handles the unmatched path correctly)
- [x] T018 [US3] Verify pending product listing via existing `GET /api/v1/admin/collect/products?status=pending` endpoint (FR-012 — ensure the existing 002 endpoint includes products marked by 003 with correct goods_id and discovery time; add note field in response if needed)

**Checkpoint**: Unmatched products correctly tracked as pending; operators can view and retry

---

## Phase 6: User Story 4 - View Enrichment Results and LLM Extraction Quality (Priority: P3)

**Goal**: Operators can view enrichment task logs showing per-task summary (total/matched/succeeded/failed/LLM completion rate) and per-product detail (which fields extracted, which missing).

**Independent Test**: After an enrichment task completes, call `GET /api/v1/admin/collect/enrichment/logs`, verify log record exists with correct counts. Call detail endpoint, verify per-product breakdown.

### Implementation for User Story 4

- [x] T019 [US4] Add enrichment log listing endpoint in backend/app/api/v1/admin_crawled.py — `GET /admin/collect/enrichment/logs`: list data_fetch_jobs WHERE job_type='enrich_match', with status/date filters, returns paginated list with result summary (matched/unmatched/llm_success/llm_partial/llm_failed counts, field completion rate)
- [x] T020 [US4] Add enrichment log detail endpoint in backend/app/api/v1/admin_crawled.py — `GET /admin/collect/enrichment/logs/{job_id}`: returns full job detail including per-product breakdown (goods_id, product_id, match_status, llm_status, fields_extracted list, fields_missing list, detail_status, final_status)

**Checkpoint**: All user stories independently functional — full 003 pipeline operational end-to-end

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality assurance and validation

- [ ] T021 Run quickstart.md validation — execute all manual test scenarios from quickstart.md (import test data, verify import counts, trigger enrichment, verify LLM fields, verify pending marking, check enrichment logs)
- [ ] T022 Verify constitution compliance — `cd backend && ruff check app/ && pyright app/` (zero errors), verify all new code has type annotations, verify no existing product columns modified
- [x] T023 [P] Add batch size limit enforcement in txt_importer.py — respect `max_files` param (default 200) from import request body
- [x] T024 [P] Add duplicate goods_id handling in enrichment_service.py — skip products already processed in current enrichment batch (de-duplicate by goods_id within a single strategy execution)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001 chardet needed for T007) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — No other story dependencies
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 (needs crawled_products data + crawled_product_service for goods_id matching)
- **User Story 3 (Phase 5)**: Depends on US2 (pending marking logic is in enrichment_service)
- **User Story 4 (Phase 6)**: Depends on US2 (needs data_fetch_jobs records with job_type='enrich_match')
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    │
Phase 2: Foundational (BLOCKS everything)
    │
Phase 3: US1 - TXT Import (P1) 🎯 MVP
    │
Phase 4: US2 - Match & Enrich (P1)
    │
    ├──► Phase 5: US3 - Pending Products (P2)
    │
    └──► Phase 6: US4 - Enrichment Logs (P3)
           │
Phase 7: Polish
```

- **US1 → US2**: US2 needs crawled_products table populated (via US1's import) to match goods_ids. However, US2's code can be written in parallel with US1 if using a test fixture for crawled data.
- **US2 → US3**: US3 is a thin layer over US2's enrichment_service (verifying pending marking works and listing is available). Tightly coupled to US2.
- **US2 → US4**: US4 queries data_fetch_jobs records created by US2's enrichment flow. Can be developed in parallel with mock data.

### Within Each User Story

- Models/Schemas before services
- Services before API endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002 (dir creation) can run parallel to T001 (dependency install)
- T005 (model), T006 (schemas), T007 (encoding detector) can all run in parallel within Phase 2
- Within US1: T009 (txt_importer) and T010 (crawled_product_service) have some dependency (T011 depends on both), but T009 and T010 touch different files and can start in parallel
- Within US2: T013 (LLM extractor extension) can run parallel to T014 (enrichment_service design), though T014 depends on T013 for the actual call
- T023 and T024 in polish phase are independent and can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all [P] tasks in Phase 2 together:
Task: "Create CrawledProduct SQLAlchemy model in backend/app/models/crawled_product.py" (T005)
Task: "Create Pydantic schemas in backend/app/schemas/crawled_product.py" (T006)
Task: "Create encoding detection utility in backend/app/utils/encoding_detector.py" (T007)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T008) — CRITICAL
3. Complete Phase 3: User Story 1 (T009-T012)
4. **STOP and VALIDATE**: Import test txt files, verify data in crawled_products table
5. Operator can now import crawler output — foundational capability delivered

### Incremental Delivery

1. Complete Setup + Foundational → Database ready
2. Add US1 (TXT Import) → Test independently → **MVP!** Operators can populate crawled database
3. Add US2 (Match & Enrich) → Test independently → Products auto-enriched from crawled data
4. Add US3 (Pending Products) → Test independently → Operators can track uncovered products
5. Add US4 (Enrichment Logs) → Test independently → Operators can monitor extraction quality
6. Polish → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T008)
2. Once Foundational is done:
   - Developer A: US1 (T009-T012) — import pipeline
   - Developer B: US2 (T013-T016) — needs US1's service as import, but can develop with mock data
3. After US1+US2 complete:
   - Developer A: US3 (T017-T018)
   - Developer B: US4 (T019-T020)
4. Both polish tasks in parallel

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- FR-009 (no existing column modifications) is verified by T022
- The `pet-store/pdd/` directory is the canonical location for crawler output; do not hardcode alternative paths
