# Tasks: 小红书评论采集完善

**Input**: Design documents from `specs/008-xhs-review-enhancement/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are not explicitly required by spec but included per Constitution gate (test coverage ≥ 80%).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and cleanup before any feature work

- [x] T001 Create Alembic migration to add `ai_review_summary` (JSONB, nullable) to `spus` table in `backend/alembic/versions/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model/schema changes that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Add `ai_review_summary` column (JSONB, nullable) to `Spu` model in `backend/app/models/spu.py`
- [x] T003 [P] Create XHS review display Pydantic schemas (XHSNoteOut, XHSReviewPageResponse) in `backend/app/schemas/review.py`
- [x] T004 [P] Remove `daily_review_fetch` function and its `CronTrigger(hour=3)` registration from `backend/app/scheduler/jobs.py`
- [x] T005 [P] Remove old `POST /admin/collect/products/{product_id}/xhs-collect` endpoint and related imports from `backend/app/api/v1/admin_collect.py`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — 管理员触发SPU评论采集 (Priority: P1) 🎯 MVP

**Goal**: Admin clicks "评论采集" on SPU list page, system searches XHS, collects notes+comments, runs per-note LLM analysis, saves to DB

**Independent Test**: Admin opens SPU management page, selects an SPU, clicks "评论采集" button. After completion, new records appear in `reviews` table with `tags`, `is_recommended`, `llm_review_result`, and `source_url` fields populated.

### Implementation for User Story 1

- [x] T006 [US1] Modify `XHSCollector.collect_product_reviews` in `backend/app/services/xhs_collector.py` to accept SPU (id, name, brand), return tuple of (collected: list, failed: list), implement per-note independent error handling for partial success
- [x] T007 [US1] Create `POST /v1/admin/spus/{spu_id}/xhs-collect` endpoint in `backend/app/api/v1/admin_collect.py` — validate SPU exists, check no running job for same SPU (409), create DataFetchJob, spawn async `_run_xhs_collection`
- [x] T008 [US1] Create `GET /v1/admin/spus/{spu_id}/xhs-collect/status?job_id={job_id}` endpoint in `backend/app/api/v1/admin_collect.py` — return job status, result counts, errors list
- [x] T009 [US1] Update `_run_xhs_collection` in `backend/app/api/v1/admin_collect.py` to use SPU model instead of Product, call modified `XHSCollector.collect_product_reviews`, set `partial_success` or `completed` or `failed` status based on results, save per-note LLM analysis results
- [x] T010 [P] [US1] Add `triggerXHSForSpu(spuId)` to `admin/src/services/api.ts` adminCollectApi (calls POST endpoint)
- [x] T011 [P] [US1] Add "评论采集" button in operations column of SPU table in `admin/src/pages/Spus/index.tsx` — show loading state during collection, toast with result count on completion, error toast on failure
- [ ] T012 [US1] Write backend tests for US1 in `backend/tests/test_xhs_collect_spu.py` — test trigger endpoint (202/404/409), test status endpoint, test partial success path

**Checkpoint**: Admin can trigger XHS collection per SPU and see results. Reviews with LLM analysis saved to DB.

---

## Phase 4: User Story 2 — LLM生成SPU评价总结 (Priority: P2)

**Goal**: After collection completes, system automatically calls LLM to aggregate all per-note analyses into a structured SPU summary

**Independent Test**: After US1 collection completes, check SPU record — `ai_review_summary` field contains `overall_pros`, `overall_cons`, `recommendation`, `summary`. Trigger with < 3 reviews verifies no summary generated.

### Implementation for User Story 2

- [x] T013 [US2] Add `generate_spu_summary(spu_id, db_session)` function in `backend/app/services/llm_analyzer.py` — collect all approved reviews for SPU, extract per-note analysis results, build aggregate prompt, call LLM, parse JSON response, return summary dict
- [x] T014 [US2] Integrate summary generation into `_run_xhs_collection` in `backend/app/api/v1/admin_collect.py` — after saving notes, if collected ≥ 3 reviews, call `generate_spu_summary` and save to `spu.ai_review_summary`; if < 3, log "insufficient reviews" but leave field null
- [x] T015 [US2] Handle edge cases for summary generation — LLM API failure (log error, leave summary null, collection still marked complete); LLM returns malformed JSON (fallback to basic aggregation from per-note tags); re-generation overwrites old summary
- [ ] T016 [US2] Write backend tests for US2 in `backend/tests/test_xhs_collect_spu.py` — test summary generated with ≥ 3 reviews, test not generated with < 3, test LLM failure graceful handling, test re-generation overwrite

**Checkpoint**: Collection automatically produces both per-note analysis AND aggregate AI summary on SPU

---

## Phase 5: User Story 3 — 小程序端展示评论与AI总结 (Priority: P3)

**Goal**: Users see AI summary at top and note cards with collapsible comments when viewing SPU reviews in mini-program

**Independent Test**: Pre-seed review data and AI summary for a test SPU. Open mini-program SPU detail page → tap "真实评价" tab → verify AI summary card, note cards with author/likes/time, tap to expand comments.

### Implementation for User Story 3

- [x] T017 [US3] Create `review_service.py` with `get_spu_reviews(spu_id, page, page_size)` method in `backend/app/services/review_service.py` — query approved reviews by SPU ordered by note_likes DESC with pagination, include SPU ai_review_summary
- [x] T018 [US3] Create `GET /v1/spus/{spu_id}/reviews` endpoint in `backend/app/api/v1/spus.py` — accept page/page_size params, return ai_summary + notes[] + pagination per api-contracts.md
- [x] T019 [P] [US3] Add `getSpuReviews(spuId, page)` to `frontend/src/services/api.ts` — call GET /spus/{id}/reviews, return typed response
- [x] T020 [P] [US3] Implement AI summary card in `frontend/src/pages/product/detail.tsx` reviews tab — gradient background card with overall_pros/overall_cons tags, recommendation badge, summary text; show placeholder text when ai_summary is null
- [x] T021 [US3] Implement note card with collapsible comments in `frontend/src/pages/product/detail.tsx` reviews tab — replace existing review display with: note author + avatar placeholder, content (truncate >200 chars), note_likes count, published time, source_url link; tap to expand/collapse top 10 comments
- [x] T022 [US3] Add pagination support in reviews tab — load more button when total > current page, append notes to list

**Checkpoint**: Mini-program users can view AI summary and XHS notes with comments for any SPU

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality assurance and cleanup

- [x] T023 Run backend lint (ruff) and typecheck — fix all errors in changed files
- [ ] T024 Run frontend build verification — ensure Taro build succeeds for weapp target
- [ ] T025 Validate against quickstart.md — run alembic upgrade, start backend, trigger collection via API, verify reviews endpoint, verify admin button, verify mini-program review display
- [ ] T026 Run full test suite: `pytest tests/test_xhs_collect_spu.py -v` — all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — No other story dependencies
- **User Story 2 (Phase 4)**: Depends on User Story 1 (needs collected reviews with LLM analysis)
- **User Story 3 (Phase 5)**: Depends on User Story 2 (frontend needs ai_summary from US2, notes from US1)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 1: Setup
    └─> Phase 2: Foundational
            └─> US1 (P1): Admin trigger collection
                    └─> US2 (P2): LLM summary (needs US1 data)
                            └─> US3 (P3): Mini-program display (needs US2 ai_summary + US1 notes)
```

**Note**: US3 frontend can be developed in parallel with US1/US2 using mock data. The backend endpoint (T018) depends on US1 review data being available.

### Within Each User Story

- Collect data first → then analyze → then display
- Backend endpoints before frontend integration
- Core implementation before edge case handling
- Tests after implementation to validate behavior

### Parallel Opportunities

- **Phase 2**: T002, T003, T004, T005 can all run in parallel (different files)
- **US1**: T010 (admin api.ts) and T011 (admin page) can run in parallel after T007-T009
- **US3**: T019 (frontend api.ts) and T020 (AI summary component) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Phase 2: All foundational tasks can run together
Task: "Add ai_review_summary to SPU model in backend/app/models/spu.py"
Task: "Create review schemas in backend/app/schemas/review.py"
Task: "Remove daily_review_fetch from backend/app/scheduler/jobs.py"
Task: "Remove old xhs-collect endpoint from backend/app/api/v1/admin_collect.py"

# After T007-T009 complete (backend endpoints):
Task: "Add triggerXHSForSpu to admin/src/services/api.ts"
Task: "Add 评论采集 button in admin/src/pages/Spus/index.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T005)
3. Complete Phase 3: User Story 1 (T006-T012)
4. **STOP and VALIDATE**: Admin can trigger collection and see results in DB
5. Deploy/demo if ready — reviews are collected with per-note LLM analysis

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Admin trigger works, reviews saved → Deploy (MVP!)
3. Add US2 → AI summary auto-generated per SPU → Deploy
4. Add US3 → Mini-program shows reviews + summary → Deploy
5. Each phase adds user-visible value without breaking prior phases

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (1 day)
2. Once Foundational is done:
   - Developer A: US1 backend + admin frontend (T006-T012)
   - Developer B: US3 frontend (T019-T022) — can use mock API data
3. After US1 complete:
   - Developer A: US2 backend + integration (T013-T016)
4. After US2 complete:
   - Developer B: Integrate US3 frontend with real API
5. Polish: Both developers (T023-T026)

---

## Notes

- [P] tasks = different files, no dependencies — can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- US3 frontend can be developed in parallel using mock data
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
