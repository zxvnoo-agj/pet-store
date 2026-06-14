# Tasks: 自建用户评价功能

**Input**: Design documents from `/specs/009-in-app-reviews/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: Required by project constitution. Contract, integration, and focused unit tests are included before implementation tasks.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup

**Purpose**: Prepare shared review-source constants, sensitive-word assets, and test skeletons.

- [ ] T001 Create review source/status constants and labels in backend/app/schemas/review.py
- [ ] T002 [P] Create local sensitive-word seed list in backend/data/sensitive_words.txt
- [ ] T003 [P] Add frontend review source/status TypeScript types in frontend/src/services/api.ts
- [ ] T004 [P] Add admin review source/status TypeScript types in admin/src/services/api.ts

---

## Phase 2: Foundational

**Purpose**: Database and service foundations that block all user stories.

- [ ] T005 Create Alembic migration for review source/status checks, reject_reason column, user-SPU uniqueness index, and crawled-to-xhs_auto migration in backend/alembic/versions/
- [ ] T006 Update Review model with reject_reason and formal source/status comments in backend/app/models/review.py
- [ ] T007 [P] Implement local sensitive-word matcher in backend/app/services/sensitive_words.py
- [ ] T008 [P] Add unit tests for sensitive-word matching in backend/tests/unit/test_sensitive_words.py
- [ ] T009 Add shared review serialization helpers for source labels and public/admin payloads in backend/app/schemas/review.py
- [ ] T010 Fix SPU-based relationship usage in admin reviews code by replacing stale product/product_id references in backend/app/api/v1/admin_reviews.py
- [ ] T011 Update XHS auto collection to save source=xhs_auto instead of source=crawled in backend/app/api/v1/admin_collect.py
- [ ] T012 Add structured logging points for review submission, moderation, and summary regeneration in backend/app/services/review_service.py

**Checkpoint**: Review source model, constraints, and shared validation are ready for user stories.

---

## Phase 3: User Story 1 - 小程序用户提交评价 (Priority: P1)

**Goal**: Logged-in mini-program users can submit one text review per SPU; the review is stored as pending and shown only to the submitter as an audit placeholder.

**Independent Test**: A logged-in user opens an SPU review page, submits rating/content/recommendation, sees their own "等待审核" card, and another user cannot see it.

### Tests for User Story 1

- [ ] T013 [P] [US1] Add contract tests for POST /v1/spus/{spu_id}/reviews validation, duplicate, auth, and sensitive-word cases in backend/tests/contract/test_review_api_contract.py
- [ ] T014 [P] [US1] Add integration test for submit-review pending self-visible flow in backend/tests/integration/test_in_app_reviews.py
- [ ] T015 [P] [US1] Add unit tests for duplicate prevention and pending creation in backend/tests/unit/test_review_service.py

### Implementation for User Story 1

- [ ] T016 [US1] Add ReviewCreate request schema with rating/content/is_recommended validation in backend/app/schemas/review.py
- [ ] T017 [US1] Implement create_user_review with auth user, duplicate check, 500-char limit, and sensitive-word validation in backend/app/services/review_service.py
- [ ] T018 [US1] Add POST /v1/spus/{spu_id}/reviews endpoint with login requirement in backend/app/api/v1/spus.py
- [ ] T019 [US1] Extend GET /v1/spus/{spu_id}/reviews to include authenticated current user's pending/rejected review as my_review in backend/app/api/v1/spus.py
- [ ] T020 [US1] Add submitReview and updated SpuReviewsResponse contracts in frontend/src/services/api.ts
- [ ] T021 [US1] Add write-review entry and login guard to product review section in frontend/src/pages/product/detail.tsx
- [ ] T022 [US1] Implement text-only review form page or modal in frontend/src/pages/product/review-create.tsx
- [ ] T023 [US1] Render current user's "等待审核" placeholder card in frontend/src/pages/product/detail.tsx
- [ ] T024 [US1] Add front-end validation for required rating/content and 500-character limit in frontend/src/pages/product/review-create.tsx

**Checkpoint**: User review submission MVP is independently functional.

---

## Phase 4: User Story 2 - 评价来源拆分与标注 (Priority: P1)

**Goal**: All reviews use formal source values and every UI/admin payload displays the correct source label.

**Independent Test**: Create one review for each source and verify mini-program/admin both show accurate labels and filters.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add contract tests for source values and labels in GET /v1/spus/{spu_id}/reviews in backend/tests/contract/test_review_api_contract.py
- [ ] T026 [P] [US2] Add integration test covering user, xhs_manual, xhs_auto, and admin_seed source display in backend/tests/integration/test_in_app_reviews.py

### Implementation for User Story 2

- [ ] T027 [US2] Update review serializers to return source and source_label for all mini-program/admin review payloads in backend/app/schemas/review.py
- [ ] T028 [US2] Replace get_spu_xhs_notes with unified approved-source review query in backend/app/services/review_service.py
- [ ] T029 [US2] Update GET /v1/spus/{spu_id}/reviews response key from notes to reviews while preserving compatibility if needed in backend/app/api/v1/spus.py
- [ ] T030 [US2] Update mini-program review interfaces from XHSNote to unified ReviewItem in frontend/src/services/api.ts
- [ ] T031 [US2] Update mini-program review cards to show 用户评价/小红书/运营整理 labels in frontend/src/pages/product/detail.tsx
- [ ] T032 [US2] Add source filter parameter support to adminReviewApi.list in admin/src/services/api.ts
- [ ] T033 [US2] Add source filter UI and source labels to admin review list in admin/src/pages/Reviews/index.tsx

**Checkpoint**: Source split and source labels work independently across backend, mini-program, and admin.

---

## Phase 5: User Story 3 - 小程序端评价展示（统一真实评价） (Priority: P2)

**Goal**: Mini-program review page presents all approved sources as a unified "真实评价" list with AI summary, empty state, and pagination.

**Independent Test**: Seed 50 approved mixed-source reviews, open the SPU review page, verify first page loads, source labels render, and scrolling loads the next page.

### Tests for User Story 3

- [ ] T034 [P] [US3] Add contract tests for pagination and newest-first ordering in backend/tests/contract/test_review_api_contract.py
- [ ] T035 [P] [US3] Add integration test for empty state and 50-review pagination in backend/tests/integration/test_in_app_reviews.py

### Implementation for User Story 3

- [ ] T036 [US3] Ensure ReviewService list query orders approved reviews by created_at desc with page_size <= 100 in backend/app/services/review_service.py
- [ ] T037 [US3] Include review summary counts and rating metadata for all approved sources in backend/app/services/review_service.py
- [ ] T038 [US3] Update frontend pagination state to append reviews from unified response in frontend/src/pages/product/detail.tsx
- [ ] T039 [US3] Add empty state with "暂无评价，来写第一条评价吧" and write-review action in frontend/src/pages/product/detail.tsx
- [ ] T040 [US3] Update AI summary display copy so it no longer implies XHS-only data in frontend/src/pages/product/detail.tsx
- [ ] T041 [US3] Add mini-program loading, no-more, and error states for review pagination in frontend/src/pages/product/detail.tsx

**Checkpoint**: Unified real review browsing is independently usable.

---

## Phase 6: User Story 4 - 管理后台评价管理（来源筛选与审核） (Priority: P2)

**Goal**: Admin can filter reviews by source/status, approve or reject user reviews with a reason, and create admin_seed or xhs_manual reviews.

**Independent Test**: Admin filters pending user reviews, approves one, rejects another with a reason, adds admin_seed content, and verifies frontend visibility.

### Tests for User Story 4

- [ ] T042 [P] [US4] Add contract tests for admin list filters, approve, reject reason, and create seeded review in backend/tests/contract/test_review_api_contract.py
- [ ] T043 [P] [US4] Add integration test for admin moderation visibility changes in backend/tests/integration/test_in_app_reviews.py

### Implementation for User Story 4

- [ ] T044 [US4] Add AdminReviewCreate and AdminReviewReject schemas in backend/app/schemas/review.py
- [ ] T045 [US4] Extend GET /v1/admin/reviews with spu_id, source, and status filters using Review.spu_id in backend/app/api/v1/admin_reviews.py
- [ ] T046 [US4] Update approve endpoint to clear reject_reason and return admin review payload in backend/app/api/v1/admin_reviews.py
- [ ] T047 [US4] Update reject endpoint to require and persist reason in backend/app/api/v1/admin_reviews.py
- [ ] T048 [US4] Add POST /v1/admin/reviews for admin_seed and xhs_manual review creation in backend/app/api/v1/admin_reviews.py
- [ ] T049 [US4] Add admin API methods for create review and reject-with-reason in admin/src/services/api.ts
- [ ] T050 [US4] Add reject reason dialog to admin review page in admin/src/pages/Reviews/index.tsx
- [ ] T051 [US4] Add admin seed/manual review creation dialog with SPU selection in admin/src/pages/Reviews/index.tsx
- [ ] T052 [US4] Display reject reason and SPU name in admin review rows in admin/src/pages/Reviews/index.tsx

**Checkpoint**: Admin moderation and seeded review creation work independently.

---

## Phase 7: User Story 5 - AI总结兼容多来源评价 (Priority: P3)

**Goal**: AI summary generation aggregates all approved review sources and admin can trigger regeneration.

**Independent Test**: Seed approved user/xhs_auto/admin_seed reviews, trigger regeneration, and confirm summary count and content use all approved reviews.

### Tests for User Story 5

- [ ] T053 [P] [US5] Add unit tests for multi-source summary input selection in backend/tests/unit/test_review_service.py
- [ ] T054 [P] [US5] Add contract test for POST /v1/admin/spus/{spu_id}/reviews/summary/regenerate in backend/tests/contract/test_review_api_contract.py

### Implementation for User Story 5

- [ ] T055 [US5] Update generate_spu_summary to aggregate all approved sources and include source labels in prompt context in backend/app/services/llm_analyzer.py
- [ ] T056 [US5] Add admin summary regeneration endpoint POST /v1/admin/spus/{spu_id}/reviews/summary/regenerate in backend/app/api/v1/admin_collect.py
- [ ] T057 [US5] Add admin API method for summary regeneration in admin/src/services/api.ts
- [ ] T058 [US5] Add regenerate summary action to SPU or review admin UI in admin/src/pages/Spus/index.tsx
- [ ] T059 [US5] Ensure mini-program AI summary reads regenerated multi-source summary without XHS-only assumptions in frontend/src/pages/product/detail.tsx

**Checkpoint**: AI summary works with all approved review sources.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation, docs, performance, and cleanup across all stories.

- [ ] T060 [P] Update PROJECT_REFERENCE.md with 009 review source model and endpoints
- [ ] T061 [P] Update AGENTS.md notes if implementation changes quickstart commands or review workflows
- [ ] T062 Add database index/query performance checks for review list and admin filters in backend/tests/integration/test_in_app_reviews.py
- [ ] T063 Run backend focused tests from specs/009-in-app-reviews/quickstart.md
- [ ] T064 Run frontend npm run build:weapp in frontend/
- [ ] T065 Run admin npm run build in admin/
- [ ] T066 Manually validate WeChat DevTools review submission, pending self card, and approved public display using specs/009-in-app-reviews/quickstart.md
- [ ] T067 Review code for stale product_id/product relationship references in backend/app/api/v1/admin_reviews.py and backend/app/services/review_service.py
- [ ] T068 Final cleanup of source labels, empty states, and admin copy across frontend/src/pages/product/detail.tsx and admin/src/pages/Reviews/index.tsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational. This is the MVP.
- **US2 (Phase 4)**: Depends on Foundational; can run after or alongside US1, but UI source labels benefit from US1 payload shape.
- **US3 (Phase 5)**: Depends on US2 unified response design.
- **US4 (Phase 6)**: Depends on Foundational; can run alongside US3 after source/status schemas exist.
- **US5 (Phase 7)**: Depends on approved review data from US2/US4.
- **Polish (Phase 8)**: Depends on desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories.
- **US2 (P1)**: No dependency on US1 for backend source mapping, but frontend integration should align with US1 response contracts.
- **US3 (P2)**: Depends on US2 unified review list semantics.
- **US4 (P2)**: Depends on Foundational source/status schema; otherwise independently testable.
- **US5 (P3)**: Depends on approved multi-source reviews existing.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T007 and T008 can run in parallel after T002.
- Test tasks within each user story marked [P] can run in parallel.
- US1 and US2 backend work can proceed in parallel after Phase 2 if response contract changes are coordinated.
- US3 frontend pagination and US4 admin UI can proceed in parallel after shared schemas are stable.

## Parallel Example: User Story 1

```bash
Task: "Add contract tests for POST /v1/spus/{spu_id}/reviews validation, duplicate, auth, and sensitive-word cases in backend/tests/contract/test_review_api_contract.py"
Task: "Add integration test for submit-review pending self-visible flow in backend/tests/integration/test_in_app_reviews.py"
Task: "Add unit tests for duplicate prevention and pending creation in backend/tests/unit/test_review_service.py"
```

## Parallel Example: User Story 4

```bash
Task: "Add AdminReviewCreate and AdminReviewReject schemas in backend/app/schemas/review.py"
Task: "Add admin API methods for create review and reject-with-reason in admin/src/services/api.ts"
Task: "Add reject reason dialog to admin review page in admin/src/pages/Reviews/index.tsx"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 so users can submit text reviews and see pending placeholders.
3. Validate US1 with backend tests and WeChat DevTools before expanding display/admin scope.

### Incremental Delivery

1. Add US1 user submission.
2. Add US2 source split and labels.
3. Add US3 unified mini-program review list.
4. Add US4 admin moderation and seeded content.
5. Add US5 multi-source AI summary.
6. Finish Phase 8 validation and documentation.

### Notes

- Every task includes an exact file path.
- Do not delete database tables.
- For schema changes, use reversible Alembic migrations.
- For mini-program runtime config, keep using frontend/src/config/env.ts and avoid process.env.
