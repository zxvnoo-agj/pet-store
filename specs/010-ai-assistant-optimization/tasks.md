# Tasks: AI助手能力优化与长期记忆

**Input**: Design documents from `/specs/010-ai-assistant-optimization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: Required by project constitution. Unit, integration, contract, and focused frontend build/manual acceptance tasks are included before or alongside implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup

**Purpose**: Prepare shared test fixtures, typed contracts, and feature scaffolding.

- [X] T001 [P] Create AI assistant prompt evaluation fixtures in `backend/tests/fixtures/ai_assistant_prompts.json`
- [X] T002 [P] Create backend answer card schema module skeleton in `backend/app/schemas/chat_cards.py`
- [X] T003 [P] Create frontend chat card and memory type module skeleton in `frontend/src/types/chat.ts`
- [ ] T004 [P] Create backend assistant memory test fixture helpers in `backend/tests/fixtures/assistant_memory.py`
- [X] T005 [P] Create feature notes for evaluated assistant capabilities in `specs/010-ai-assistant-optimization/capability-evaluation.md`

---

## Phase 2: Foundational

**Purpose**: Shared infrastructure that blocks multiple user stories.

**CRITICAL**: No long-term memory or card user story work should start until schemas, types, and current-state storage are ready.

- [ ] T006 Create additive Alembic migration for `assistant_memories` table and indexes in `backend/alembic/versions/010_assistant_memories.py`
- [ ] T007 [P] Create `AssistantMemory` SQLAlchemy model in `backend/app/models/assistant_memory.py`
- [ ] T008 Update model exports for assistant memory in `backend/app/models/__init__.py`
- [ ] T009 [P] Create Pydantic schemas for memory sections and memory responses in `backend/app/schemas/assistant_memory.py`
- [X] T010 [P] Implement answer card Pydantic schemas and `card_type` enum in `backend/app/schemas/chat_cards.py`
- [X] T011 [P] Add TypeScript discriminated unions for answer cards and assistant memory in `frontend/src/types/chat.ts`
- [X] T012 [P] Create shared assistant observability helpers and metric names in `backend/app/services/assistant_observability.py`
- [ ] T013 [P] Add baseline contract tests for memory schemas and answer card schemas in `backend/tests/contract/test_assistant_memory_contract.py`
- [X] T014 [P] Add baseline unit tests for answer card schema validation in `backend/tests/unit/test_answer_card_service.py`

**Checkpoint**: Database, backend schemas, frontend types, and shared test scaffolding are ready.

---

## Phase 3: User Story 1 - 提升宠物用品与宠物知识问答能力 (Priority: P1) MVP

**Goal**: AI assistant gives more accurate, actionable pet supplies and pet knowledge answers, uses existing tools better, asks follow-up questions when needed, and includes safety boundaries for health-risk questions.

**Independent Test**: Run the AI prompt fixture set covering pet food selection, product facts, budget filtering, ingredient concern, and emergency-like health prompts; confirm at least 80% are judged relevant and actionable.

### Tests for User Story 1

- [X] T015 [P] [US1] Add unit tests for SPU search tool filtering and missing-data behavior in `backend/tests/unit/test_agent_tools.py`
- [X] T016 [P] [US1] Add unit tests for health-risk safety classification prompts in `backend/tests/unit/test_ai_safety_prompts.py`
- [X] T017 [P] [US1] Add integration tests for chat stream follow-up and safety replies in `backend/tests/integration/test_chat_assistant_quality.py`
- [X] T018 [P] [US1] Add prompt evaluation runner for AI assistant fixtures in `backend/tests/unit/test_ai_assistant_eval.py`

### Implementation for User Story 1

- [X] T019 [US1] Strengthen pet supplies, pet knowledge, missing-info, and health-safety instructions in `backend/app/agents/prompts.py`
- [X] T020 [US1] Improve `search_products` tool input handling for pet_type, category, brand, and max_price in `backend/app/agents/tools.py`
- [X] T021 [US1] Extend `search_products` and `get_spu_detail` outputs with category, pet_type, nutrition, review_count, and confidence-friendly fields in `backend/app/agents/tools.py`
- [X] T022 [US1] Add guardrails for invented product facts and missing product data in `backend/app/agents/prompts.py`
- [X] T023 [US1] Add structured logging for tool calls, tool errors, and health-safety paths in `backend/app/agents/agent.py`
- [X] T024 [US1] Persist useful `tool_calls` metadata from chat stream in `backend/app/api/v1/chat.py`
- [X] T025 [US1] Update quick manual evaluation prompts if implementation changes expected answer wording in `specs/010-ai-assistant-optimization/quickstart.md`

**Checkpoint**: Existing AI assistant answers are improved without requiring new card UI or long-term memory.

---

## Phase 4: User Story 2 - 新增和优化商品问答卡片 (Priority: P1)

**Goal**: Product-related AI responses emit typed cards for SPU, comparison, recommendation list, ingredient insight, and follow-up scenarios; mini-program renders cards cleanly.

**Independent Test**: Ask five product scenarios: single product, product comparison, list recommendation, ingredient explanation, and insufficient information. Confirm the correct card type appears with required decision fields.

### Tests for User Story 2

- [X] T026 [P] [US2] Add contract tests for `answer_cards` SSE payloads in `backend/tests/contract/test_assistant_memory_contract.py`
- [X] T027 [P] [US2] Add unit tests for card selection and payload validation in `backend/tests/unit/test_answer_card_service.py`
- [X] T028 [P] [US2] Add integration tests for chat stream card events in `backend/tests/integration/test_chat_memory_flow.py`
- [X] T029 [P] [US2] Add frontend type coverage for card unions in `frontend/src/types/chat.ts`

### Implementation for User Story 2

- [X] T030 [P] [US2] Implement answer card builder service in `backend/app/services/answer_card_service.py`
- [X] T031 [US2] Integrate answer card generation with tool results in `backend/app/agents/agent.py`
- [X] T032 [US2] Emit `event: answer_cards` while preserving existing SSE events in `backend/app/agents/agent.py`
- [X] T033 [US2] Update chat stream response parsing to collect `answer_cards` events in `frontend/src/pages/chat/index.tsx`
- [X] T034 [P] [US2] Create generic card renderer in `frontend/src/components/chat/AnswerCardRenderer.tsx`
- [X] T035 [P] [US2] Create optimized SPU answer card in `frontend/src/components/chat/SpuAnswerCard.tsx`
- [X] T036 [P] [US2] Create comparison card in `frontend/src/components/chat/ComparisonCard.tsx`
- [X] T037 [P] [US2] Create recommendation list card in `frontend/src/components/chat/RecommendationListCard.tsx`
- [X] T038 [P] [US2] Create ingredient insight card in `frontend/src/components/chat/IngredientInsightCard.tsx`
- [X] T039 [P] [US2] Create follow-up question card in `frontend/src/components/chat/FollowUpCard.tsx`
- [X] T040 [US2] Render answer cards below the matching assistant message in `frontend/src/pages/chat/index.tsx`
- [X] T041 [US2] Preserve current `spus` fallback rendering for backward compatibility in `frontend/src/pages/chat/index.tsx`
- [X] T042 [US2] Add card-related structured metrics and logs in `backend/app/services/assistant_observability.py`

**Checkpoint**: Product card UX works independently from Dream memory and the new food transition capability.

---

## Phase 5: User Story 3 - 探索并落地AI助手新增能力 (Priority: P2)

**Goal**: Evaluate at least two candidate assistant capabilities and launch "换粮计划" with structured output, missing-input follow-up, and safety warnings.

**Independent Test**: Ask for a food transition plan with complete inputs and confirm a phased plan card; ask again without current/new food or gut status and confirm follow-up prompts.

### Tests for User Story 3

- [ ] T043 [P] [US3] Add unit tests for food transition phase generation in `backend/tests/unit/test_food_transition_service.py`
- [ ] T044 [P] [US3] Add unit tests for missing-input follow-up behavior in `backend/tests/unit/test_food_transition_service.py`
- [ ] T045 [P] [US3] Add integration tests for food transition cards in `backend/tests/integration/test_chat_memory_flow.py`
- [ ] T046 [P] [US3] Add evaluated candidate capability notes for product substitutes and food transition in `specs/010-ai-assistant-optimization/capability-evaluation.md`

### Implementation for User Story 3

- [ ] T047 [P] [US3] Implement food transition plan service in `backend/app/services/food_transition_service.py`
- [ ] T048 [US3] Register food transition tool or capability trigger in `backend/app/agents/tools.py`
- [ ] T049 [US3] Add food transition trigger and required-input instructions in `backend/app/agents/prompts.py`
- [ ] T050 [US3] Add `food_transition_plan` card building support in `backend/app/services/answer_card_service.py`
- [ ] T051 [P] [US3] Create food transition plan card component in `frontend/src/components/chat/FoodTransitionPlanCard.tsx`
- [ ] T052 [US3] Wire `food_transition_plan` into `AnswerCardRenderer` in `frontend/src/components/chat/AnswerCardRenderer.tsx`
- [ ] T053 [US3] Add stop-condition and vet-disclaimer copy to card output in `backend/app/services/food_transition_service.py`
- [ ] T054 [US3] Update manual safety regression prompts in `specs/010-ai-assistant-optimization/quickstart.md`

**Checkpoint**: The first new AI capability is user-facing, testable, and safe-bounded.

---

## Phase 6: User Story 4 - 后台Dream长期记忆整理 (Priority: P2)

**Goal**: Daily Dream batch extracts useful information from new logged-in user conversations and updates only the current classified memory within 500 characters.

**Independent Test**: Seed new chat messages containing pet status, preference, budget, and unrelated small talk; run Dream once; confirm memory updates within four sections, excludes unrelated/sensitive content, and stays under 500 characters.

### Tests for User Story 4

- [ ] T055 [P] [US4] Add unit tests for memory summary composition and 500-character enforcement in `backend/tests/unit/test_assistant_memory_service.py`
- [ ] T056 [P] [US4] Add unit tests for Dream extraction filtering and merge precedence in `backend/tests/unit/test_assistant_memory_service.py`
- [ ] T057 [P] [US4] Add integration tests for daily Dream batch processing in `backend/tests/integration/test_dream_memory_job.py`
- [ ] T058 [P] [US4] Add contract tests for optional admin Dream dry-run endpoint in `backend/tests/contract/test_assistant_memory_contract.py`

### Implementation for User Story 4

- [ ] T059 [P] [US4] Implement assistant memory CRUD, section normalization, summary composition, clear, pause, and resume methods in `backend/app/services/assistant_memory_service.py`
- [ ] T060 [P] [US4] Implement Dream extraction and merge service in `backend/app/services/dream_memory_service.py`
- [ ] T061 [US4] Add prompt context builder for enabled assistant memory in `backend/app/services/assistant_memory_service.py`
- [ ] T062 [US4] Inject enabled assistant memory into AI agent system context in `backend/app/agents/agent.py`
- [ ] T063 [US4] Add daily Dream scheduler job registration in `backend/app/scheduler/jobs.py`
- [ ] T064 [US4] Add optional admin Dream dry-run endpoint in `backend/app/api/v1/chat.py`
- [ ] T065 [US4] Add memory extraction metrics and failure logs in `backend/app/services/dream_memory_service.py`
- [ ] T066 [US4] Ensure Dream ignores disabled memories and does not overwrite newer manual edits in `backend/app/services/dream_memory_service.py`

**Checkpoint**: Long-term memory is generated and used by AI without adding chat-stream latency.

---

## Phase 7: User Story 5 - 我的页查看和修改AI印象 (Priority: P2)

**Goal**: Logged-in users can view, edit by category, clear, pause, and resume AI long-term memory from the "我的" page.

**Independent Test**: Open "我的" -> "AI助手对我的印象", edit pet status, save, ask a related AI question, and confirm the edited memory is used; pause/clear states are visible and respected.

### Tests for User Story 5

- [ ] T067 [P] [US5] Add contract tests for GET/PUT/PATCH/DELETE `/v1/chat/memory` endpoints in `backend/tests/contract/test_assistant_memory_contract.py`
- [ ] T068 [P] [US5] Add integration tests for user edit, pause, resume, and clear flows in `backend/tests/integration/test_chat_memory_flow.py`
- [ ] T069 [P] [US5] Add frontend build-time type checks for memory API payloads in `frontend/src/services/assistantMemoryApi.ts`

### Implementation for User Story 5

- [ ] T070 [US5] Add GET `/v1/chat/memory` endpoint in `backend/app/api/v1/chat.py`
- [ ] T071 [US5] Add PUT `/v1/chat/memory` endpoint with classified section validation in `backend/app/api/v1/chat.py`
- [ ] T072 [US5] Add PATCH `/v1/chat/memory/settings` endpoint for pause/resume in `backend/app/api/v1/chat.py`
- [ ] T073 [US5] Add DELETE `/v1/chat/memory` endpoint for clearing current memory in `backend/app/api/v1/chat.py`
- [ ] T074 [P] [US5] Create assistant memory API client in `frontend/src/services/assistantMemoryApi.ts`
- [ ] T075 [US5] Add "AI助手对我的印象" entry to mine page in `frontend/src/pages/mine/index.tsx`
- [ ] T076 [US5] Create AI memory page config in `frontend/src/pages/mine/ai-memory.config.ts`
- [ ] T077 [US5] Create AI memory page with four section editors in `frontend/src/pages/mine/ai-memory.tsx`
- [ ] T078 [US5] Add pause/resume toggle and clear confirmation in `frontend/src/pages/mine/ai-memory.tsx`
- [ ] T079 [US5] Add 500-character counter, validation, loading, empty, and error states in `frontend/src/pages/mine/ai-memory.tsx`
- [ ] T080 [US5] Register AI memory page route in `frontend/src/app.config.ts`
- [ ] T081 [US5] Ensure logged-out users do not see the AI memory entry in `frontend/src/pages/mine/index.tsx`

**Checkpoint**: Users can transparently control AI long-term memory from the mini-program.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, performance, and final cleanup across all stories.

- [ ] T082 [P] Update `PROJECT_REFERENCE.md` with 010 assistant memory, cards, and Dream scheduler notes
- [ ] T083 [P] Update `AGENTS.md` if implementation changes quickstart commands or feature references
- [ ] T084 Add query performance checks for assistant memory and Dream message loading in `backend/tests/performance/test_assistant_memory_performance.py`
- [ ] T085 Add structured log assertions for memory edit, pause, Dream failure, and card generation in `backend/tests/integration/test_chat_memory_flow.py`
- [ ] T086 Run backend focused tests from `specs/010-ai-assistant-optimization/quickstart.md`
- [ ] T087 Run `npm run build:weapp` in `frontend/`
- [ ] T088 Manually validate WeChat DevTools flows from `specs/010-ai-assistant-optimization/quickstart.md`
- [ ] T089 Verify no mini-program runtime code uses `process.env` in `frontend/src/`
- [ ] T090 Verify no migration deletes tables and document additive schema approach in `specs/010-ai-assistant-optimization/quickstart.md`
- [ ] T091 Review AI prompt wording and card copy for medical safety boundaries in `backend/app/agents/prompts.py` and `frontend/src/components/chat/FoodTransitionPlanCard.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks card/memory stories.
- **US1 (Phase 3)**: Depends on Setup; this is the AI answer-quality MVP.
- **US2 (Phase 4)**: Depends on Foundational answer card schemas and US1 tool improvements.
- **US3 (Phase 5)**: Depends on US2 card rendering and answer card service.
- **US4 (Phase 6)**: Depends on Foundational assistant memory model and schemas; can run alongside US2/US3 after Phase 2.
- **US5 (Phase 7)**: Depends on US4 assistant memory service and API semantics.
- **Polish (Phase 8)**: Depends on desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Setup; no dependency on memory or cards.
- **US2 (P1)**: Requires card schemas/types from Foundational and benefits from US1 tool improvements.
- **US3 (P2)**: Requires US2 card infrastructure.
- **US4 (P2)**: Requires assistant memory model/schema; independent from product card work.
- **US5 (P2)**: Requires assistant memory service and endpoints from US4.

### Parallel Opportunities

- T001, T002, T003, T004, and T005 can run in parallel.
- T007, T009, T010, T011, T012, T013, and T014 can run in parallel after T006 starts.
- US1 tests T015-T018 can run in parallel.
- US2 frontend card components T034-T039 can run in parallel after T011.
- US4 service tests T055-T058 can run in parallel with implementation planning for T059-T060.
- US4 backend Dream work can run in parallel with US2 card UI after Phase 2.
- US5 frontend API client T074 can run in parallel with endpoint work T070-T073 once contracts are stable.

### Within Each User Story

- Tests should be written first and fail before implementation where feasible.
- Backend schemas/models precede services.
- Services precede endpoints and agent integration.
- API contracts precede frontend API clients.
- Frontend types precede components and pages.
- Each checkpoint should be validated before moving to dependent stories.

---

## Parallel Example: User Story 2

```bash
Task: "Create optimized SPU answer card in frontend/src/components/chat/SpuAnswerCard.tsx"
Task: "Create comparison card in frontend/src/components/chat/ComparisonCard.tsx"
Task: "Create recommendation list card in frontend/src/components/chat/RecommendationListCard.tsx"
Task: "Create ingredient insight card in frontend/src/components/chat/IngredientInsightCard.tsx"
Task: "Create follow-up question card in frontend/src/components/chat/FollowUpCard.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "Implement assistant memory CRUD, section normalization, summary composition, clear, pause, and resume methods in backend/app/services/assistant_memory_service.py"
Task: "Implement Dream extraction and merge service in backend/app/services/dream_memory_service.py"
Task: "Add unit tests for memory summary composition and 500-character enforcement in backend/tests/unit/test_assistant_memory_service.py"
Task: "Add integration tests for daily Dream batch processing in backend/tests/integration/test_dream_memory_job.py"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and the card/tool-related parts of Phase 2.
2. Complete US1 to improve AI answer quality and tool behavior.
3. Complete US2 to show structured product answer cards.
4. Stop and validate the five prompt scenarios from `quickstart.md`.

### Incremental Delivery

1. Setup + Foundational schemas.
2. US1 answer quality improvements.
3. US2 product answer cards.
4. US3 food transition plan.
5. US4 Dream long-term memory.
6. US5 "我的" page memory controls.
7. Phase 8 validation and documentation.

### Parallel Team Strategy

With multiple developers:

1. Backend developer A: US1 tools/prompts and quality tests.
2. Frontend developer B: US2 card components after frontend types are ready.
3. Backend developer C: US4 assistant memory model/service/Dream job after Phase 2.
4. Frontend developer D: US5 memory page after endpoints are stable.

## Notes

- Every task includes an exact file path.
- Do not delete database tables.
- For schema changes, use additive and reversible Alembic migrations.
- Keep mini-program runtime config in `frontend/src/config/env.ts`; do not use `process.env` in runtime code.
- Health-risk and food transition guidance must include safety boundaries and must not replace veterinary diagnosis.
