# Tasks: SPU 体系迁移（小程序端）

**Input**: Design documents from `/specs/005-spu-migration/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Preparation)

**Purpose**: Prepare existing codebase for migration

- [X] T001 Create database backup before migration (`pg_dump $DATABASE_URL > backup_before_005.sql`)
- [X] T002 [P] Verify 004 SPU tables exist and contain seed data (`SELECT COUNT(*) FROM spus` should return 33)
- [X] T003 [P] Verify products table is empty or data no longer needed

---

## Phase 2: Foundational - Database Migration (Blocking)

**Purpose**: Schema changes that MUST complete before ANY user story work

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete

- [X] T004 [P] Create Alembic migration `005_spu_migration.py` in `backend/alembic/versions/`
- [X] T005 Alter `favorites` table: rename `product_id` → `spu_id`, update FK and unique constraint (`backend/alembic/versions/005_spu_migration.py`)
- [X] T006 Alter `reviews` table: rename `product_id` → `spu_id`, update FK and index (`backend/alembic/versions/005_spu_migration.py`)
- [X] T007 Alter `chat_messages` table: rename `referenced_products` → `referenced_spus` (`backend/alembic/versions/005_spu_migration.py`)
- [X] T008 Drop `products` table in migration (`backend/alembic/versions/005_spu_migration.py`)
- [X] T009 Run migration: `cd backend && alembic upgrade head`
- [X] T010 [P] Update `backend/app/models/__init__.py`: remove Product export, verify Spu/SpuListing exports
- [X] T011 [P] Update `backend/app/schemas/__init__.py`: remove Product schemas export
- [X] T012 [P] Update `backend/app/services/__init__.py`: remove ProductService export
- [X] T013 Delete `backend/app/models/product.py`
- [X] T014 Delete `backend/app/schemas/product.py`
- [X] T015 Delete `backend/app/services/product_service.py`
- [X] T016 Update `backend/app/models/favorite.py`: change `product_id` to `spu_id` with FK to `spus.id`
- [X] T017 Update `backend/app/models/review.py`: change `product_id` to `spu_id` with FK to `spus.id`
- [X] T018 Update `backend/app/models/chat.py`: change `referenced_products` to `referenced_spus` in ChatMessage

**Checkpoint**: Database migrated, old Product code removed, models updated. Run `pytest backend/tests/` to verify no import errors.

---

## Phase 3: User Story 1 - 小程序首页展示SPU商品 (Priority: P1) 🎯 MVP

**Goal**: Mini-program home page displays SPU product list instead of products. Users can browse SPUs by category.

**Independent Test**: Open mini-program home page, verify 33 Royal Canin SPUs displayed with name, brand, price range, image. Click SPU → navigate to detail page.

### Implementation for User Story 1

- [X] T019 [P] [US1] Create `backend/app/api/v1/spus.py`: implement `GET /api/v1/spus` endpoint (list with pagination, filter, sort)
- [X] T020 [P] [US1] Update `backend/app/services/spu_service.py`: add `get_spus()` method for mini-program list query
- [X] T021 [P] [US1] Update `backend/app/schemas/spu.py`: add `SpuListResponse`, `SpuListItem` schemas for mini-program
- [X] T022 [US1] Replace `backend/app/api/v1/products.py` with redirect or remove router registration in `backend/app/api/v1/__init__.py`
- [X] T023 [P] [US1] Update `frontend/src/services/api.ts`: add `getSpus()`, `getSpuDetail()` API calls, remove `getProducts()`
- [X] T024 [P] [US1] Rename `frontend/src/stores/productStore.ts` → `frontend/src/stores/spuStore.ts`, update all references
- [X] T025 [P] [US1] Rename `frontend/src/components/ProductCard.tsx` → `frontend/src/components/SpuCard.tsx`, update fields (id, name, brand, price_min, price_max, image_urls)
- [X] T026 [US1] Update `frontend/src/pages/index/index.tsx`: fetch SPUs instead of products, use SpuCard component
- [X] T027 [US1] Update `frontend/src/pages/product/list.tsx`: fetch SPUs instead of products, adapt filtering UI
- [X] T028 [US1] Update `frontend/src/pages/product/detail.tsx`: fetch SPU detail, display ingredients/nutrition/pros/cons sections

**Checkpoint**: Home page and detail page show SPU data. No products references remain in these pages.

---

## Phase 4: User Story 5 - 搜索和分类浏览 (Priority: P1)

**Goal**: Search and category browsing work with SPU data. Users can search by keyword and filter by category.

**Independent Test**: Search "幼猫" returns matching SPUs. Select category "猫咪 > 猫粮 > 干粮" shows correct filtered results.

### Implementation for User Story 5

- [X] T029 [P] [US5] Update `backend/app/services/spu_service.py`: add `search_spus()` method (search name/brand/description/ingredients)
- [X] T030 [P] [US5] Update `backend/app/api/v1/search.py`: change search endpoint to query SPUs instead of products
- [X] T031 [P] [US5] Update `backend/app/api/v1/categories.py`: ensure category endpoints return SPU-compatible category tree
- [X] T032 [US5] Update `frontend/src/pages/search/index.tsx`: adapt search results to display SpuCard components
- [X] T033 [US5] Update `frontend/src/pages/category/index.tsx`: fetch SPUs by category instead of products

**Checkpoint**: Search and category pages return SPU results correctly.

---

## Phase 5: User Story 4 - AI购物助手迁移至SPU体系 (Priority: P1)

**Goal**: AI assistant queries SPU database for recommendations. Product cards in chat link to SPU detail pages.

**Independent Test**: Ask AI "3个月幼猫推荐什么猫粮", verify response contains SPU cards that link to SPU detail pages.

### Implementation for User Story 4

- [X] T034 [P] [US4] Update `backend/app/agents/tools.py`: replace `ProductService` with `SpuService` in AgentTools class
- [X] T035 [P] [US4] Update `backend/app/agents/tools.py`: rewrite `search_products()` to use `SpuService.get_spus()`
- [X] T036 [P] [US4] Update `backend/app/agents/tools.py`: rewrite `get_product_detail()` to return SPU fields
- [X] T037 [US4] Update `backend/app/services/chat_service.py`: handle `referenced_spus` instead of `referenced_products`
- [X] T038 [US4] Update `backend/app/api/v1/chat.py`: ensure chat response uses SPU data structure
- [X] T039 [P] [US4] Update `frontend/src/pages/chat/index.tsx`: adapt AI message rendering to display SPU cards (link to `/pages/product/detail?id={spu_id}`)
- [X] T040 [P] [US4] Update `frontend/src/stores/chatStore.ts`: handle `referenced_spus` in message objects

**Checkpoint**: AI assistant returns SPU recommendations, cards link to correct SPU detail pages.

---

## Phase 6: User Story 2 - SPU多平台价格对比 (Priority: P2)

**Goal**: SPU detail page shows multi-platform price comparison from spu_listings.

**Independent Test**: Open SPU detail page with linked listings, verify price comparison table shows platform/shop/price/sales.

### Implementation for User Story 2

- [X] T041 [P] [US2] Update `backend/app/services/spu_listing_service.py`: add `get_listings_by_spu()` method for mini-program
- [X] T042 [P] [US2] Update `backend/app/schemas/spu_listing.py`: add `SpuListingResponse` schema for mini-program (include promotion_url)
- [X] T043 [US2] Create `backend/app/api/v1/spus.py`: add `GET /api/v1/spus/{id}/listings` endpoint
- [X] T044 [US2] Update `frontend/src/pages/product/detail.tsx`: add listings price comparison section (table/chart)
- [X] T045 [US2] Update `frontend/src/services/api.ts`: add `getSpuListings(spuId)` API call

**Checkpoint**: SPU detail page displays price comparison when listings exist; shows "暂无价格信息" when no listings.

---

## Phase 7: User Story 3 - 自动抓取和匹配电商列表 (Priority: P2)

**Goal**: Admin can trigger PDD crawling and auto-match listings to SPUs. Admin backend supports manual review queue.

**Independent Test**: Trigger "Royal Canin 猫粮" crawl from admin, verify new listings created and auto-matched (≥85% confidence linked).

### Implementation for User Story 3

- [ ] T046 [P] [US3] Verify `backend/app/services/spu_matching_service.py` exists and implements LLM semantic matching
- [ ] T047 [P] [US3] Verify `backend/app/scheduler/fetch_jobs.py` supports PDD DDK API crawling
- [ ] T048 [US3] Ensure admin API `POST /api/v1/admin/goods/listings/import` is functional (from 004)
- [ ] T049 [US3] Ensure admin API `GET /api/v1/admin/goods/matching-queue` is functional (from 004)
- [ ] T050 [US3] Update admin frontend (if needed): verify admin can trigger crawl and view matching queue

**Checkpoint**: Admin can trigger crawl, listings are auto-matched, manual review queue works.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, testing, and migration validation

- [X] T051 [P] Update `backend/app/api/v1/favorites.py`: change all `product_id` references to `spu_id`
- [X] T052 [P] Update `backend/app/services/favorite_service.py`: change all `product_id` references to `spu_id`
- [X] T053 [P] Update `backend/app/api/v1/reviews.py`: change all `product_id` references to `spu_id`
- [X] T054 [P] Update `backend/app/services/review_service.py`: change all `product_id` references to `spu_id`
- [X] T055 Update `frontend/src/pages/mine/favorites.tsx`: display SPU favorites instead of product favorites
- [X] T056 Update `frontend/src/pages/mine/index.tsx`: update any product references to SPU
- [X] T057 [P] Run full backend test suite: `cd backend && pytest tests/ -v`
- [ ] T058 [P] Run frontend type check: `cd frontend && tsc --noEmit`
- [ ] T059 [P] Search entire codebase for remaining `product_id` references in business logic (exclude admin/goods from 004)
- [ ] T060 [P] Search entire codebase for remaining `products` API endpoint references
- [X] T061 Update `AGENTS.md` references (already done by plan command)
- [ ] T062 Verify mini-program bundle size < 2MB (Constitution requirement)
- [ ] T063 Run performance test: `GET /api/v1/spus` p95 < 200ms
- [ ] T064 Run performance test: `GET /api/v1/search?q=幼猫` p95 < 200ms

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup. **BLOCKS ALL user stories** - database schema must be migrated first
- **User Stories (Phase 3-7)**: All depend on Foundational (Phase 2)
  - US1, US4, US5 are P1 and can proceed in parallel after Foundational
  - US2, US3 are P2 and can proceed after P1 stories (or in parallel if team capacity allows)
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational
- **US5 (P1)**: Independent after Foundational (shares SpuCard component with US1)
- **US4 (P1)**: Independent after Foundational (depends on SpuService being ready)
- **US2 (P2)**: Depends on US1 (needs SPU detail page to show listings)
- **US3 (P2)**: Independent after Foundational (admin-only backend feature)

### Within Each User Story

- Backend API/service first, then frontend pages
- Models already exist from 004, no new models needed
- Core SPU query service (SpuService) is foundational for all P1 stories

### Parallel Opportunities

- All Foundational tasks T004-T018 can run in parallel (different files)
- US1, US4, US5 frontend tasks can run in parallel after backend API ready
- US2 and US3 can be worked on in parallel with each other
- All Polish tasks T051-T064 can run in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# Backend tasks (can run in parallel):
Task: "Create backend/app/api/v1/spus.py: GET /api/v1/spus endpoint"
Task: "Update backend/app/services/spu_service.py: add get_spus() method"
Task: "Update backend/app/schemas/spu.py: add SpuListResponse schema"

# Frontend tasks (can run in parallel after backend ready):
Task: "Rename frontend/src/components/ProductCard.tsx → SpuCard.tsx"
Task: "Update frontend/src/stores/productStore.ts → spuStore.ts"
Task: "Update frontend/src/services/api.ts: add getSpus() API"
Task: "Update frontend/src/pages/index/index.tsx: use SPU data"
Task: "Update frontend/src/pages/product/list.tsx: use SPU data"
Task: "Update frontend/src/pages/product/detail.tsx: use SPU data"
```

---

## Implementation Strategy

### MVP First (User Story 1 + US5 + US4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (database migration) - **CRITICAL**
3. Complete Phase 3: US1 (首页展示) - Core browsing works
4. Complete Phase 4: US5 (搜索分类) - Discovery works
5. Complete Phase 5: US4 (AI助手) - Key differentiator works
6. **STOP and VALIDATE**: Test mini-program end-to-end (browse, search, AI)
7. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Browse works → Test
3. Add US5 → Search works → Test
4. Add US4 → AI works → Test
5. Add US2 → Price comparison works → Test
6. Add US3 → Auto crawl works → Test
7. Polish → Performance + cleanup → Test

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: US1 + US5 (frontend-heavy, shared components)
   - Developer B: US4 (AI assistant backend + frontend)
   - Developer C: US2 + US3 (listings + crawl, admin features)
3. Regroup for Polish phase

---

## Notes

- **No new models needed**: `spus` and `spu_listings` tables already exist from 004
- **Migration is one-way**: `products` table DROP is irreversible without backup
- **Frontend field names mostly unchanged**: `id`, `name`, `brand`, `price_min`, `price_max`, `image_urls` already exist in SPU schema
- **Admin endpoints from 004 unchanged**: `/api/v1/admin/goods/*` continues to work independently
- **Constitution compliance**: TypeScript strict mode, Pydantic v2, test coverage ≥90% for modified services
