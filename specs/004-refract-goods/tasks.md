# Tasks: Goods Module SPU Refactor

**Input**: Design documents from `/specs/004-refract-goods/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-contracts.md, research.md

**Tests**: Test tasks are included per user story for TDD approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare project for new feature development

- [ ] T001 [P] Create Alembic migration directory for feature 004: `backend/alembic/versions/004_refract_goods_spu.py`
- [ ] T002 [P] Add new admin menu route configuration for SPU pages in `admin/src/routes/index.tsx`
- [ ] T003 [P] Create empty page directories: `admin/src/pages/Spus/` and `admin/src/pages/MatchingQueue/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core backend infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend - Database Migration

- [ ] T004 Implement Alembic migration `004_refract_goods_spu.py` to CREATE TABLE `spus` (18 columns + 6 indexes + constraints)
- [ ] T005 Implement Alembic migration to CREATE TABLE `spu_listings` (16 columns + 5 indexes + FK + constraints)

### Backend - Models

- [ ] T006 [P] Create `Spu` ORM model in `backend/app/models/spu.py` with all columns, indexes, and relationships
- [ ] T007 [P] Create `SpuListing` ORM model in `backend/app/models/spu_listing.py` with all columns, indexes, and FK
- [ ] T008 Register new models in `backend/app/models/__init__.py`

### Backend - Schemas (Pydantic)

- [ ] T009 [P] Create SPU Pydantic schemas in `backend/app/schemas/spu.py` (SpuBase, SpuCreate, SpuUpdate, SpuResponse, SpuListResponse, SpuFilter)
- [ ] T010 [P] Create Listing Pydantic schemas in `backend/app/schemas/spu_listing.py` (SpuListingBase, SpuListingResponse, SpuListingCreate, LinkListingRequest)

### Backend - Services - Core

- [ ] T011 Implement `SpuService` in `backend/app/services/spu_service.py` with CRUD operations and duplicate detection
- [ ] T012 Implement price recalculation utility in `backend/app/utils/price_utils.py` (update_spu_price_range function)

### Admin Frontend - API Client

- [ ] T013 [P] Create SPU API client module `admin/src/services/spuApi.ts` with all endpoint wrappers
- [ ] T014 [P] Create Zustand store `admin/src/stores/spuStore.ts` for SPU list/detail state management

**Checkpoint**: Foundation ready — database tables exist, models/schemas defined, core service and frontend API ready

---

## Phase 3: User Story 1 - Admin Creates SPU Master Data (Priority: P1) 🎯 MVP

**Goal**: Administrators can manually create and edit SPU master records with detailed attributes

**Independent Test**: Create a new SPU via API/frontend, verify it appears in list with correct attributes

### Tests for User Story 1

- [ ] T015 [P] [US1] Write unit test for SpuService.create_spu with duplicate detection in `backend/tests/unit/test_spu_service.py`
- [ ] T016 [P] [US1] Write integration test for SPU CRUD endpoints in `backend/tests/integration/test_spu_api.py`

### Backend Implementation

- [ ] T017 [US1] Implement SPU CRUD API routes in `backend/app/api/v1/admin/goods.py` (POST /spus, GET /spus/{id}, PUT /spus/{id}, DELETE /spus/{id})
- [ ] T018 [US1] Add duplicate SPU detection (409 response) on create in `backend/app/services/spu_service.py`
- [ ] T019 [US1] Add full-text search support for SPU name/model in `backend/app/services/spu_service.py`

### Admin Frontend Implementation

- [ ] T020 [P] [US1] Create `SpuForm` component in `admin/src/pages/Spus/components/SpuForm.tsx` (create/edit form with all fields)
- [ ] T021 [P] [US1] Create `SpuCard` component in `admin/src/pages/Spus/components/SpuCard.tsx` (display card for SPU list)
- [ ] T022 [US1] Implement SPU list page `admin/src/pages/Spus/index.tsx` (grid layout with cards, filters, pagination)
- [ ] T023 [US1] Implement SPU detail page `admin/src/pages/Spus/Detail.tsx` with editable tabs (Basic Info / Detailed Attributes)
- [ ] T024 [US1] Add SPU management routes to admin router in `admin/src/routes/index.tsx`

**Checkpoint**: User Story 1 complete — admin can create, edit, view, and delete SPUs with detailed attributes

---

## Phase 4: User Story 2 - View Aggregated Product List (Priority: P1)

**Goal**: Browse product catalog grouped by SPU with consolidated price ranges and listing counts

**Independent Test**: Create SPUs with linked listings, verify list shows one entry per SPU with correct min-max price

### Tests for User Story 2

- [ ] T025 [P] [US2] Write unit test for price range recalculation in `backend/tests/unit/test_price_utils.py`
- [ ] T026 [P] [US2] Write integration test for aggregated SPU list endpoint in `backend/tests/integration/test_spu_list_api.py`

### Backend Implementation

- [ ] T027 [US2] Implement SPU list query with aggregation (price range, listing count) in `backend/app/services/spu_service.py`
- [ ] T028 [US2] Add filter support (brand, category_id, pet_type, search) to SPU list endpoint in `backend/app/api/v1/admin/goods.py`
- [ ] T029 [US2] Implement listing management endpoints in `backend/app/api/v1/admin/goods.py` (GET /spus/{id}/listings, POST /listings/{id}/link, POST /listings/{id}/unlink)

### Admin Frontend Implementation

- [ ] T030 [P] [US2] Create `ListingTable` component in `admin/src/pages/Spus/components/ListingTable.tsx` (sortable table of linked listings)
- [ ] T031 [US2] Update `SpuCard` to display price range (¥min - ¥max) and listing count badge
- [ ] T032 [US2] Add Listings tab to SPU detail page `admin/src/pages/Spus/Detail.tsx`
- [ ] T033 [US2] Implement filter UI (brand, category, search) on SPU list page `admin/src/pages/Spus/index.tsx`

**Checkpoint**: User Story 2 complete — SPU list shows aggregated data with price ranges and filtering

---

## Phase 5: User Story 3 - Auto-Collect and Match E-commerce Listings (Priority: P2)

**Goal**: Automatically import listings from DDK API and match them to SPUs using LLM with three-tier confidence

**Independent Test**: Trigger import, verify listings are classified into auto-linked (≥85%), candidate (60-84%), and unmatched (<60%)

### Tests for User Story 3

- [ ] T034 [P] [US3] Write unit test for LLM matching service with mock responses in `backend/tests/unit/test_matching_service.py`
- [ ] T035 [P] [US3] Write integration test for import and matching job in `backend/tests/integration/test_import_matching.py`

### Backend Implementation

- [ ] T036 [US3] Implement DDK API client wrapper for fetching listings in `backend/app/services/ddk_client.py`
- [ ] T037 [US3] Implement LLM-based semantic matching service in `backend/app/services/spu_matching_service.py` (prompt builder, structured output parsing, confidence scoring)
- [ ] T038 [US3] Implement three-tier matching logic (auto-link ≥85%, candidate 60-84%, unmatched <60%) in `backend/app/services/spu_matching_service.py`
- [ ] T039 [US3] Implement listing import endpoint in `backend/app/api/v1/admin/goods.py` (POST /listings/import) with async background task
- [ ] T040 [US3] Implement import/matching job status endpoint in `backend/app/api/v1/admin/goods.py` (GET /jobs/{job_id})
- [ ] T041 [US3] Add price recalculation trigger on listing link/unlink in `backend/app/services/spu_listing_service.py`

### Admin Frontend Implementation

- [ ] T042 [P] [US3] Create import trigger UI component in `admin/src/pages/Spus/components/ImportTrigger.tsx` (keyword input, max results, start button)
- [ ] T043 [US3] Add import status polling and progress display in `admin/src/stores/spuStore.ts`

**Checkpoint**: User Story 3 complete — listings can be imported and automatically matched with confidence tiers

---

## Phase 6: User Story 4 - Admin Reviews Unmatched Listings (Priority: P2)

**Goal**: Admin can review and manually confirm/reject candidate matches and link unmatched listings

**Independent Test**: Open matching queue, confirm a candidate match, verify listing moves to linked and price range updates

### Tests for User Story 4

- [ ] T044 [P] [US4] Write integration test for matching queue endpoints in `backend/tests/integration/test_matching_queue.py`
- [ ] T045 [P] [US4] Write integration test for bulk confirm/reject operations in `backend/tests/integration/test_bulk_matching.py`

### Backend Implementation

- [ ] T046 [US4] Implement matching queue endpoint in `backend/app/api/v1/admin/goods.py` (GET /matching-queue with tier filtering)
- [ ] T047 [US4] Implement bulk confirm endpoint in `backend/app/api/v1/admin/goods.py` (POST /matching-queue/confirm)
- [ ] T048 [US4] Implement bulk reject endpoint in `backend/app/api/v1/admin/goods.py` (POST /matching-queue/reject)
- [ ] T049 [US4] Implement manual link endpoint for unmatched listings in `backend/app/api/v1/admin/goods.py` (POST /listings/{id}/link with spu_id)

### Admin Frontend Implementation

- [ ] T050 [P] [US4] Create `CandidateList` component in `admin/src/pages/MatchingQueue/components/CandidateList.tsx` (shows suggested SPU with confirm/reject buttons)
- [ ] T051 [P] [US4] Create `UnmatchedList` component in `admin/src/pages/MatchingQueue/components/UnmatchedList.tsx` (shows listings with "Link to SPU" or "Create SPU" actions)
- [ ] T052 [US4] Implement Matching Queue page `admin/src/pages/MatchingQueue/index.tsx` (tabs for Candidate/Unmatched, bulk actions)
- [ ] T053 [US4] Add Matching Queue route to admin router in `admin/src/routes/index.tsx`

**Checkpoint**: User Story 4 complete — admin can review, confirm, reject, and manually link listings

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, testing, and documentation

- [ ] T054 [P] Run full backend test suite: `cd backend && pytest tests/ -v`
- [ ] T055 [P] Run frontend type check and lint: `cd admin && npm run type-check && npm run lint`
- [ ] T056 Add admin navigation menu items for SPU Management and Matching Queue in `admin/src/components/Layout/Sidebar.tsx`
- [ ] T057 [P] Add loading states and error handling to all SPU frontend pages
- [ ] T058 [P] Add success/error toast notifications for SPU CRUD operations
- [ ] T059 Verify `quickstart.md` testing checklist passes end-to-end
- [ ] T060 [P] Update API documentation (OpenAPI annotations) in `backend/app/api/v1/admin/goods.py`
- [ ] T061 Run `alembic upgrade head` and verify both tables created successfully in database

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
  - T004, T005 (migration) must complete before T006, T007 (models)
  - T006, T007 (models) must complete before T009, T010 (schemas)
  - T011 (service) depends on T006, T007, T009
- **User Stories (Phase 3-6)**: All depend on Foundational (Phase 2) completion
  - US1 (P1) can start immediately after Foundational
  - US2 (P1) can start in parallel with US1 (different files, no cross-dependencies)
  - US3 (P2) can start after US1+US2 (needs SPU data and listing structure)
  - US4 (P2) can start after US3 (needs matching results)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational. No dependencies on other stories.
- **User Story 2 (P1)**: Can start after Foundational. Independent of US1 (different frontend pages, shared backend services).
- **User Story 3 (P2)**: Can start after US1+US2. Needs SPUs to exist and listing endpoints to be ready.
- **User Story 4 (P2)**: Can start after US3. Needs matching results (candidate/unmatched listings) to exist.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Backend before frontend
- Core implementation before integration

### Parallel Opportunities

- **Setup**: T001, T002, T003 can run in parallel
- **Foundational**: T004/T005 (migration) → T006/T007 (models) → T009/T010 (schemas) → T011/T012 (services) → T013/T014 (frontend API)
  - T004 and T005 can run in parallel (separate CREATE TABLE statements)
  - T006 and T007 can run in parallel (separate model files)
  - T009 and T010 can run in parallel (separate schema files)
  - T013 and T014 can run in parallel (frontend tasks)
- **US1 + US2**: Can be developed in parallel after Foundational (different pages, independent features)
- **US3 + US4**: Sequential — US4 needs US3's matching output
- **Polish**: Multiple tasks can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T015 Write unit test for SpuService.create_spu in backend/tests/unit/test_spu_service.py"
Task: "T016 Write integration test for SPU CRUD endpoints in backend/tests/integration/test_spu_api.py"

# Launch backend and frontend models/components together:
Task: "T017 Implement SPU CRUD API routes in backend/app/api/v1/admin/goods.py"
Task: "T020 Create SpuForm component in admin/src/pages/Spus/components/SpuForm.tsx"
Task: "T021 Create SpuCard component in admin/src/pages/Spus/components/SpuCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (SPU CRUD)
4. **STOP and VALIDATE**: Test creating/editing SPUs independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test SPU CRUD → Deploy (MVP!)
3. Add User Story 2 → Test aggregated list → Deploy
4. Add User Story 3 → Test auto-matching → Deploy
5. Add User Story 4 → Test review queue → Deploy
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (SPU CRUD)
   - Developer B: User Story 2 (Aggregated List) — can work in parallel with US1
3. After US1+US2 complete:
   - Developer A: User Story 3 (Auto-Matching)
   - Developer B: User Story 4 (Review Queue) — starts after US3 matching produces results
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

### Task Count Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | 3 | Project preparation |
| Phase 2: Foundational | 11 | Database, models, schemas, services, frontend API |
| Phase 3: US1 | 10 | SPU CRUD (MVP) |
| Phase 4: US2 | 9 | Aggregated list with price ranges |
| Phase 5: US3 | 10 | Auto-import and matching |
| Phase 6: US4 | 10 | Review queue |
| Phase 7: Polish | 8 | Testing, docs, UI polish |
| **Total** | **61** | |

### Suggested MVP Scope

**Minimum Viable Product = Phase 1 + Phase 2 + Phase 3 (User Story 1 only)**

This delivers: Admin can create, edit, view, and delete SPUs with detailed attributes. This is the core data entry path and provides immediate value even without aggregation or matching.
