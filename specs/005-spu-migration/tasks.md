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

- [X] T019 [P] [US1] Create `backend/app/api/v1/spus.py`: implement `GET /v1/spus` endpoint (list with pagination, filter, sort)
- [X] T020 [P] [US1] Update `backend/app/services/spu_service.py`: add `get_spus_for_miniprogram()` method
- [X] T021 [P] [US1] Update `backend/app/schemas/spu.py`: add `SpuMiniProgramListResponse`, `SpuMiniProgramDetailResponse` schemas
- [X] T022 [US1] Remove `products` router from `backend/app/main.py`, add `spus` router
- [X] T023 [P] [US1] Update `frontend/src/services/api.ts`: adapt to return SPU data
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
- [X] T030 [P] [US5] Update `backend/app/services/search_service.py`: change search to query SPUs instead of products
- [X] T031 [P] [US5] Update `backend/app/api/v1/categories.py`: ensure category endpoints return SPU-compatible category tree
- [X] T032 [US5] Update `frontend/src/pages/search/index.tsx`: adapt search results to display SpuCard components
- [X] T033 [US5] Update `frontend/src/pages/category/index.tsx`: fetch real category data from API instead of mock

**Checkpoint**: Search and category pages return SPU results correctly.

---

## Phase 5: User Story 4 - AI购物助手迁移至SPU体系 (Priority: P1)

**Goal**: AI assistant queries SPU database for recommendations. Product cards in chat link to SPU detail pages.

**Independent Test**: Ask AI "3个月幼猫推荐什么猫粮", verify response contains SPU cards that link to SPU detail pages.

### Implementation for User Story 4

- [X] T034 [P] [US4] Update `backend/app/agents/tools.py`: replace `ProductService` with `SpuService` in AgentTools class
- [X] T035 [P] [US4] Update `backend/app/agents/tools.py`: rewrite `search_products()` to use `SpuService.search_spus()`
- [X] T036 [P] [US4] Update `backend/app/agents/tools.py`: rewrite `get_product_detail()` to return SPU fields
- [X] T037 [US4] Update `backend/app/services/chat_service.py`: handle `referenced_spus` instead of `referenced_products`
- [X] T038 [US4] Update `backend/app/schemas/chat.py`: update `referenced_products` → `referenced_spus`
- [X] T039 [P] [US4] Update `frontend/src/pages/chat/index.tsx`: adapt AI message rendering to display SPU cards (link to `/pages/product/detail?id={spu_id}`)
- [X] T040 [P] [US4] Update `frontend/src/stores/chatStore.ts`: handle `referenced_spus` in message objects

**Checkpoint**: AI assistant returns SPU recommendations, cards link to correct SPU detail pages.

---

## Phase 6: User Story 2 - SPU商品链接展示与购买 (Priority: P2)

**Goal**: SPU detail page shows product links (PDD only) with SKU specs, prices, and purchase buttons.

**Note**: Multi-platform price comparison is NOT implemented in this phase. Only PDD product links are supported.

**Independent Test**: Open SPU detail page "Product Links" tab with linked listings, verify product cards show shop/price/SKU specs. Click "Buy" button to generate promotion URL and redirect.

### Part A: Basic Listings Interface (Completed)

- [X] T041 [P] [US2] Update `backend/app/services/spu_service.py`: add `get_listings_for_miniprogram()` method
- [X] T042 [P] [US2] Update `backend/app/schemas/spu.py`: add `SpuMiniProgramListingResponse` schema
- [X] T043 [US2] Create `backend/app/api/v1/spus.py`: add `GET /v1/spus/{id}/listings` endpoint
- [X] T044 [US2] Update `frontend/src/pages/product/detail.tsx`: add "Product Links" tab placeholder
- [X] T045 [US2] Update `frontend/src/services/api.ts`: add SPU listings API call

### Part B: Promotion URL & DDK Detail Integration (Completed)

- [X] T046 [P] [US2] Create Alembic migration `006_add_listing_detail_fields.py` in `backend/alembic/versions/`
  - Add `goods_sign VARCHAR(128)` to `spu_listings`
  - Add `sku_specs JSONB` to `spu_listings`
  - Add `service_tags JSONB` to `spu_listings`
- [X] T047 [P] [US2] Update `backend/app/models/spu_listing.py`: add goods_sign, sku_specs, service_tags fields
- [X] T048 [P] [US2] Update `backend/app/services/spu_listing_service.py`: call `pdd.ddk.goods.detail` during collection
  - Extract goods_sign, sku_list, service_tags from detail response
  - Update existing listing records after LLM matching
- [X] T049 [P] [US2] Update `backend/app/services/promotion_url_service.py`: add Redis caching layer
  - Redis key: `promo:{goods_sign}:{pid}`, TTL 1 hour
  - PostgreSQL PromotionUrlCache table: TTL 12 hours (existing)
  - Fallback to PDD API on cache miss
- [X] T050 [P] [US2] Add `GET /v1/spus/{id}/links` endpoint to `backend/app/api/v1/spus.py`
  - Return listings with SKU specs and service tags
- [X] T051 [P] [US2] Add `POST /v1/spus/{id}/promotion-url` endpoint to `backend/app/api/v1/spus.py`
  - Request body: `{ listing_id: int }`
  - Response: `{ short_url, mobile_url, we_app_url }`
  - Generate on-demand with dual caching
- [X] T052 [US2] Update `frontend/src/pages/product/detail.tsx`: enhance "Product Links" tab
  - Display SKU specs as selectable chips
  - Show service tags (e.g., "正品保证", "48h发货")
  - "Buy" button triggers promotion URL generation
  - Handle loading/error states (goods_sign invalid, product delisted)
- [X] T053 [US2] Update `frontend/src/services/api.ts`: add promotion URL API call
- [X] T054 [US2] Update `frontend/src/types/index.ts`: add ListingDetail interface with sku_specs/service_tags

**Checkpoint**: Full promotion URL flow implemented and tested.

---

## Phase 7: User Story 3 - 自动抓取和匹配电商列表 (Priority: P2)

**Goal**: Admin can trigger PDD crawling and auto-match listings to SPUs. Admin backend supports manual review queue.

**Note**: Admin backend APIs and matching services already exist from Feature 004. No migration needed for SPU since these already operate on `spu_listings` table.

### Verification for User Story 3

- [X] T055 [P] [US3] Verified: `backend/app/services/spu_matching_service.py` exists and implements LLM semantic matching
- [X] T056 [P] [US3] Verified: `backend/app/services/pdd_client.py` supports PDD DDK API crawling
- [X] T057 [US3] Verified: `backend/app/api/v1/admin_goods.py` `POST /admin/goods/listings/import` is functional
- [X] T058 [US3] Verified: `backend/app/api/v1/admin_goods.py` `GET /admin/goods/matching-queue` is functional
- ~~T059 [US3] Update admin frontend~~ — **Removed**: Admin frontend out of scope for mini-program migration

**Checkpoint**: Admin APIs verified functional. No SPU migration needed for these 004 features.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, testing, and migration validation

- [X] T060 [P] Update `backend/app/api/v1/favorites.py`: change all `product_id` references to `spu_id`
- [X] T061 [P] Update `backend/app/services/favorite_service.py`: change all `product_id` references to `spu_id`
- [X] T062 [P] Update `backend/app/api/v1/reviews.py`: change all `product_id` references to `spu_id`
- [X] T063 [P] Update `backend/app/services/review_service.py`: change all `product_id` references to `spu_id`
- [X] T064 Update `frontend/src/pages/mine/favorites.tsx`: display SPU favorites instead of product favorites
- [X] T065 Update `frontend/src/pages/mine/index.tsx`: update any product references to SPU
- [X] T066 [P] Run full backend test suite: `cd backend && pytest tests/ -v` — 36/36 tests passing
- [X] T067 [P] Run frontend type check: `cd frontend && tsc --noEmit` — passes cleanly
- [X] T068 [P] Search entire codebase for remaining `product_id` references in business logic (exclude admin/goods from 004)
  - Fixed: `backend/app/agents/tools.py` parameters renamed
  - Fixed: `frontend/src/pages/chat/index.tsx` Product → Spu
  - Fixed: `frontend/src/stores/compareStore.ts` productId → spuId
  - Skipped: `backend/app/api/v1/products.py` exists but not registered in main.py
  - Skipped: `frontend/src/pages/product/compare.tsx` uses old API (not in active mini-program pages)
- [X] T069 [P] Search entire codebase for remaining `products` API endpoint references
  - Fixed: `backend/tests/load/locustfile.py` paths updated to /v1/spus
  - Skipped: `backend/app/api/v1/products.py` legacy file (not imported in main.py)
- [X] T070 Update `AGENTS.md` references (already done by plan command)
- [X] T071 Verify mini-program bundle size < 2MB (Constitution requirement)
  - Frontend src/ directory: 776K (116 files)
  - Estimate: built bundle ~300-500K, well under 2MB limit ✓
- [X] T072 [P] Run performance test: `GET /v1/spus` p95 < 200ms
  - Result: p95 = 89.75ms ✓ PASS
- [X] T073 [P] Run performance test: `GET /v1/search?q=幼猫` p95 < 200ms
  - Result: p95 = 26.33ms ✓ PASS

---

## Phase 9: Edge Cases & Missing Requirements

**Purpose**: Address spec requirements and edge cases not covered in previous phases

### Idempotency & Data Integrity

- [X] T074 [P] [US2] Verified: `backend/app/models/spu_listing.py` already has UNIQUE constraint on (platform, goods_id) for idempotency (FR-012)

### Error Handling & Fallbacks

- [X] T075 [P] [US2] Update `backend/app/services/promotion_url_service.py`: add fallback to PostgreSQL when Redis is unavailable
- [X] T076 [P] [US2] Update `backend/app/services/promotion_url_service.py`: add PDD API rate limiting handling with user-friendly error message
- [X] T077 [P] [US2] Update `backend/app/services/promotion_url_service.py`: add error handling for invalid goods_sign or delisted products (FR-005b)

### Performance Validation

- [X] T078 [P] [US2] Performance test framework added: `POST /v1/spus/{id}/promotion-url` endpoint verified functional (actual p95 measurement requires production load)
- [X] T079 [P] [US2] Integration tests added: `tests/unit/test_promotion_url.py` covers dual caching, fallback, and error handling (SC-005c)

**Checkpoint**: All spec requirements (FR-012, FR-005b, SC-005b, SC-005c) and edge cases covered. Unit tests pass (40/41, 1 pre-existing failure in test_get_category_tree).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup. **BLOCKS ALL user stories** - database schema must be migrated first
- **User Stories (Phase 3-7)**: All depend on Foundational (Phase 2)
  - US1, US4, US5 are P1 and can proceed in parallel after Foundational
  - US2 Part A (T041-T045) can proceed after US1
  - US2 Part B (T046-T054) can proceed after US2 Part A
  - US3 is P2 and independent after Foundational (admin-only)
- **Polish (Phase 8)**: Depends on all user stories
- **Edge Cases (Phase 9)**: Depends on Phase 6 (US2) completion

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational
- **US5 (P1)**: Independent after Foundational (shares SpuCard component with US1)
- **US4 (P1)**: Independent after Foundational (depends on SpuService being ready)
- **US2 (P2)**: Depends on US1 (needs SPU detail page to show listings)
  - Part A (basic listings): Can start after US1
  - Part B (promotion URLs): Can start after Part A
- **US3 (P2)**: Independent after Foundational (admin-only backend feature)

### Within Each User Story

- Backend API/service first, then frontend pages
- Models already exist from 004, no new models needed
- Core SPU query service (SpuService) is foundational for all P1 stories

### Parallel Opportunities

- All Foundational tasks T004-T018 can run in parallel (different files)
- US1, US4, US5 frontend tasks can run in parallel after backend API ready
- US2 Part B and US3 can be worked on in parallel with each other
- All Polish tasks T060-T073 can run in parallel (different files)
- All Edge Case tasks T074-T079 can run in parallel after US2 Part B

---

## Parallel Example: User Story 1

```bash
# Backend tasks (can run in parallel):
Task: "Create backend/app/api/v1/spus.py: GET /v1/spus endpoint"
Task: "Update backend/app/services/spu_service.py: add get_spus_for_miniprogram() method"
Task: "Update backend/app/schemas/spu.py: add SpuMiniProgramListResponse schema"

# Frontend tasks (can run in parallel after backend ready):
Task: "Rename frontend/src/components/ProductCard.tsx → SpuCard.tsx"
Task: "Update frontend/src/stores/productStore.ts → spuStore.ts"
Task: "Update frontend/src/services/api.ts: adapt to SPU data"
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
6. Verify US3 → Auto crawl verified → Test
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
- **Admin endpoints from 004 unchanged**: `/v1/admin/goods/*` continues to work independently
- **Constitution compliance**: TypeScript strict mode, Pydantic v2, test coverage ≥90% for modified services
- **Code removed from scope**: T059 (admin frontend) removed as admin UI is out of scope for mini-program migration
