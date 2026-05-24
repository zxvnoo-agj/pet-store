# Tasks: 宠物档案与AI能力增强

**Input**: Design documents from `specs/006-pet-profiles-ai/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec. Backend unit test task included for PetService per Constitution (≥80% coverage).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration for new tables and seed data

- [X] T001 Run Alembic migration to create `pets` + `pet_breeds` tables in `backend/alembic/versions/007_pet_profiles.py`, seed ~80 breeds per data-model.md
- [X] T002 Verify migration: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM pet_breeds"` returns ~80

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models, schemas, and types shared across ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `Pet` model in `backend/app/models/pet.py` with fields (id, user_id, species, breed_id, nickname, age_months, weight_kg, notes, timestamps) per data-model.md
- [X] T004 [P] Create `PetBreed` model in `backend/app/models/pet_breed.py` with fields (id, species, name, description, is_active, sort_order, timestamps) per data-model.md
- [X] T005 [P] Add `pets` relationship + reverse relationship on `User` model in `backend/app/models/user.py`
- [X] T006 [P] Create Pydantic schemas in `backend/app/schemas/pet.py`: PetCreate, PetUpdate, PetResponse, PetBreedResponse per contracts/api-contracts.md
- [X] T007 [P] Add TypeScript interfaces `Pet` and `PetBreed` in `frontend/src/types/index.ts` matching backend schemas
- [X] T008 [P] Create `PetService` in `backend/app/services/pet_service.py` with CRUD operations, breed list query, last-selected-pet read/write, max-5-pets enforcement, uniqueness check
- [X] T009 Register pets router in `backend/app/main.py` — `app.include_router(pets.router, prefix="/api/v1")`

**Checkpoint**: Foundation ready — all models, schemas, and shared types in place. User story implementation can now begin.

---

## Phase 3: User Story 1 — 注册时添加宠物信息 (Priority: P1) 🎯 MVP

**Goal**: New users are guided to add pet info on first login; pet data saved and bound to user account

**Independent Test**: Register a new user, verify "添加你的宠物" wizard appears, fill form, submit, confirm pet saved via API

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement `POST /api/v1/pets` endpoint in `backend/app/api/v1/pets.py` — create pet with validation (max 5, duplicate check, breed-species match)
- [X] T011 [P] [US1] Implement `GET /api/v1/pets` endpoint in `backend/app/api/v1/pets.py` — list current user's pets
- [X] T012 [US1] Implement `GET /api/v1/pet-breeds?species=` endpoint in `backend/app/api/v1/pets.py` — return active breeds for dropdown (public, no auth required)
- [X] T013 [US1] Create pet API client functions in `frontend/src/services/petApi.ts` — `createPet()`, `getMyPets()`, `getBreeds(species)`
- [X] T014 [US1] Build "添加你的宠物" wizard page component: species picker → breed picker (cascading) → optional fields (nickname, age, weight, notes) → submit button, integrated into post-login flow in `frontend/src/pages/index/index.tsx` (or new `frontend/src/pages/mine/pets-create.tsx` and invoke from registration)
- [X] T015 [US1] Add `is_new_user` detection: if user's pets list is empty on first API load, redirect to pet-adding wizard; store `has_added_pet` flag to skip on subsequent logins

**Checkpoint**: New users can add pet info during registration flow; existing users skip the wizard

---

## Phase 4: User Story 2 — 我的页面宠物管理 (Priority: P1)

**Goal**: Users can view, add, edit, and delete pets from "我的" page

**Independent Test**: Open "我的" → "宠物管理" → verify list of pets, add a new pet, edit its info, delete it

### Implementation for User Story 2

- [X] T016 [P] [US2] Implement `PUT /api/v1/pets/{pet_id}` endpoint in `backend/app/api/v1/pets.py` — update pet (ownership check, duplicate check on species+nickname change)
- [X] T017 [P] [US2] Implement `DELETE /api/v1/pets/{pet_id}` endpoint in `backend/app/api/v1/pets.py` — delete pet (ownership check, invalidate suggested-questions cache)
- [X] T018 [US2] Add `updatePet()`, `deletePet()` to `frontend/src/services/petApi.ts`
- [X] T019 [US2] Create pet management list page in `frontend/src/pages/mine/pets.tsx` — display pet cards (species icon, breed name, nickname, age, weight), "添加宠物" button, edit/delete actions per card
- [X] T020 [US2] Create add/edit pet form page in `frontend/src/pages/mine/pets-create.tsx` — species picker → breed picker (cascading from `getBreeds`) → nickname/age/weight/notes fields → submit. Reuse for both add and edit (pass pet_id for edit mode)
- [X] T021 [US2] Add "宠物管理" entry in `frontend/src/pages/mine/index.tsx` — display pet count, navigate to pets page
- [X] T022 [US2] Add `pets` and `pet_count` to user info in `GET /api/v1/users/me` response (modify `backend/app/api/v1/auth.py` or user-profile endpoint) per contracts Section 5.1

**Checkpoint**: Full pet management lifecycle functional from "我的" page

---

## Phase 5: User Story 3 — 首页宠物卡片个性化推荐 (Priority: P2)

**Goal**: Users with pets see pet cards on homepage instead of default tab bar; recommendations based on selected pet's species

**Independent Test**: Login as user with pets → homepage shows pet cards, select one → recommendations change, tap "选择其他" → species picker → recommendations update per species

### Implementation for User Story 3

- [X] T023 [P] [US3] Implement `GET /api/v1/pets/last-selected` endpoint in `backend/app/api/v1/pets.py` — return `last_selected_pet_id` from `user.profile`
- [X] T024 [P] [US3] Implement `PUT /api/v1/pets/last-selected` endpoint in `backend/app/api/v1/pets.py` — set `last_selected_pet_id` in `user.profile` (ownership validation)
- [X] T025 [US3] Add `getLastSelectedPet()`, `setLastSelectedPet()` to `frontend/src/services/petApi.ts`
- [X] T026 [US3] Modify `frontend/src/pages/index/index.tsx` — conditional rendering: if user has pets → render pet cards (species icon, breed, nickname) replacing `defaultPetChoices` tab bar. If no pets → keep existing default tab bar
- [X] T027 [US3] Implement pet card selection: tap card → set as active, persist via `setLastSelectedPet()`, load recommendations filtered by `pet.species`. Default selection: read `last_selected_pet_id`, fallback to first pet
- [X] T028 [US3] Implement "选择其他" button at end of pet cards — tap → show species picker overlay (cat/dog/bird/fish/reptile/small_pet), select species → temporarily filter by that species (don't persist). Show indicator that browsing for non-bound species
- [X] T029 [US3] Update recommendation title to include pet nickname: "给【团子】的推荐" when viewing own pet, show species name when viewing "其他" selection

**Checkpoint**: Homepage personalized for pet owners; non-pet-owners unaffected

---

## Phase 6: User Story 4 — AI对话宠物上下文注入 (Priority: P2)

**Goal**: AI conversations automatically include user's pet info in system prompt for personalized recommendations

**Independent Test**: User with pet sends "推荐猫粮" to AI → server logs show pet context injected in system prompt → AI response references pet age/species

### Implementation for User Story 4

- [X] T030 [US4] Modify `SYSTEM_PROMPT` in `backend/app/agents/prompts.py` — add `{pet_context}` placeholder at end of system prompt, with instruction: "If pet_context is not empty, use the user's pet information to personalize your recommendations"
- [X] T031 [US4] Modify `AIAgent.chat_stream()` in `backend/app/agents/agent.py` — before building system prompt, query user's pets via `PetService`, format into structured text block per research.md R3 format (only include fields with values, truncate notes to 50 chars), inject into system prompt
- [X] T032 [US4] Modify `POST /api/v1/chat/stream` handler in `backend/app/api/v1/chat.py` — extract `user_id` from auth context, pass to `AIAgent` for pet context injection. Handle anonymous users (no pets, no context)
- [X] T033 [US4] Verify context injection works via manual test: create pet, send chat message, check server logs for `## 用户宠物信息` block in system prompt

**Checkpoint**: AI assistant gives personalized recommendations based on user's pet profiles

---

## Phase 7: User Story 5 — AI动态推荐问题 (Priority: P3)

**Goal**: Suggested questions on chat page are AI-generated based on pet info (with caching), instead of hardcoded

**Independent Test**: User with pet opens chat page → sees personalized questions; user without pets sees default questions; rapid second load serves from cache

### Implementation for User Story 5

- [X] T034 [US5] Create `SuggestedQuestionsService` in `backend/app/services/suggested_questions.py` — implement `get_questions(user_id, pets)`: check Redis cache key `suggested_questions:{user_id}`, cache hit → return cached; cache miss → call LLM with prompt from research.md R1 → cache result → return. On any failure → return hardcoded defaults silently
- [X] T035 [US5] Implement `GET /api/v1/chat/suggested-questions` endpoint in `backend/app/api/v1/chat.py` — extract user from auth (optional, anonymous allowed), query pets if logged in, delegate to `SuggestedQuestionsService`, return `{ "questions": [...], "source": "ai"|"cache"|"default" }`
- [X] T036 [US5] Implement cache invalidation: on pet add/edit/delete in `PetService`, call `delete(f"suggested_questions:{user_id}")` on Redis
- [X] T037 [US5] Add `getSuggestedQuestions()` to `frontend/src/services/petApi.ts`
- [X] T038 [US5] Modify `frontend/src/pages/chat/index.tsx` — replace hardcoded `quickQuestions` array with `fetchSuggestedQuestions()` call on mount; show loading skeleton while fetching; render returned questions as tappable buttons; if fetch fails or returns defaults, show them silently (no error toast)
- [X] T039 [US5] Add polling/refresh: reload suggested questions when chat page re-focuses (useDidShow), but debounce to 60s minimum interval to avoid repeated fetches

**Checkpoint**: Suggested questions are personalized per user's pets, with caching and silent fallback

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Admin breed management, tests, and final validation

- [X] T040 [P] Add admin API endpoints for breed CRUD in `backend/app/api/v1/admin_pet_breeds.py` — GET list (paginated), POST create, PUT update, DELETE (soft: set `is_active=false`). Auth: admin only per contracts Section 6
- [X] T041 [P] Build admin breed management page in `admin/src/pages/PetBreeds/index.tsx` — table with species filter, add/edit modal, toggle active/inactive. Add route in `admin/src/App.tsx`
- [X] T042 [P] Write unit tests for `PetService` in `backend/tests/unit/test_pet_service.py` — test create (valid, duplicate, max-5), update, delete, breed-query
- [X] T043 [P] Write integration tests for pet CRUD API in `backend/tests/integration/test_pet_api.py` — full CRUD cycle via HTTP
- [X] T044 Run quickstart.md validation — execute all manual test checklist items, verify each user story independently
- [X] T045 Update `AGENTS.md` SPECKIT block to reflect 006 as current feature (already done in plan phase; verify)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 (uses same backend API as US1); independent of US1 completion
- **US3 (Phase 5)**: Depends on Phase 2 + US1 backend API; independent of US2
- **US4 (Phase 6)**: Depends on Phase 2 (needs PetService)
- **US5 (Phase 7)**: Depends on Phase 2 (needs PetService) + Phase 6 (needs chat.py router structure)
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

```
Phase 1 (Setup)
  └─ Phase 2 (Foundational)
       ├─ Phase 3 (US1: Registration Wizard)  ← P1
       ├─ Phase 4 (US2: Pet Management)       ← P1, independent of US1
       ├─ Phase 5 (US3: Homepage Cards)       ← P2, depends on US1 backend
       ├─ Phase 6 (US4: AI Context)           ← P2, independent
       └─ Phase 7 (US5: Dynamic Questions)    ← P3, depends on US4 (chat router)
```

### Within Each User Story

1. Backend endpoints → Frontend API client → Frontend page components
2. For US1/US2: Backend CRUD endpoints before frontend pages
3. Models before services (done in Foundational)

### Parallel Opportunities

- T003, T004, T005, T006, T007, T008 can all run in parallel (Foundational)
- T010 and T011 can run in parallel (US1 backend)
- T016 and T017 can run in parallel (US2 backend)
- T023 and T024 can run in parallel (US3 backend)
- US1 (Phase 3) and US2 (Phase 4) can start in parallel after Phase 2
- US4 (Phase 6) can run in parallel with US1/US2/US3
- T040 and T041 and T042 and T043 can all run in parallel (Polish)

---

## Parallel Example: Foundational Phase

```bash
# Launch all independent model/schema tasks together:
Task: "Create Pet model in backend/app/models/pet.py"
Task: "Create PetBreed model in backend/app/models/pet_breed.py"
Task: "Add pets relationship to User model"
Task: "Create Pydantic schemas in backend/app/schemas/pet.py"
Task: "Add TypeScript interfaces in frontend/src/types/index.ts"
Task: "Create PetService in backend/app/services/pet_service.py"
```

## Parallel Example: US1 + US2 Backend

```bash
# US1 endpoints (can run together):
Task: "POST /api/v1/pets endpoint in backend/app/api/v1/pets.py"
Task: "GET /api/v1/pets endpoint in backend/app/api/v1/pets.py"

# US2 endpoints (can run together with US1 endpoints):
Task: "PUT /api/v1/pets/{pet_id} endpoint in backend/app/api/v1/pets.py"
Task: "DELETE /api/v1/pets/{pet_id} endpoint in backend/app/api/v1/pets.py"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (migration)
2. Complete Phase 2: Foundational (models, schemas, service)
3. Complete Phase 3: US1 — Registration pet wizard
4. Complete Phase 4: US2 — Pet management page
5. **STOP and VALIDATE**: Users can add and manage pets
6. Deploy/demo if ready — this is the core data layer

### Incremental Delivery

1. **Setup + Foundational →** DB and models ready
2. **US1 + US2 (P1) →** Pet CRUD works → Deploy (MVP!)
3. **US3 (P2) →** Homepage personalized → Deploy
4. **US4 (P2) →** AI context injection → Deploy
5. **US5 (P3) →** Dynamic questions → Deploy
6. **Polish →** Admin + tests → Final

### Parallel Team Strategy

With multiple developers:
1. All complete Phase 1+2 together
2. After Foundational:
   - Developer A: US1 (registration wizard + pet creation API)
   - Developer B: US2 (pet management UI + update/delete API)
   - Developer C: US4 (AI context injection, no UI dependency)
3. After US1/US2: Developer A picks up US3 (homepage), Developer C picks up US5
4. Polish phase: all collaborate

---

## Notes

- [P] tasks = different files, no dependencies on incomplete [P] tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US1 and US2 share the same backend endpoints (`pets.py`) — coordinate file edits
- T008 (`PetService`) is foundational but may need incremental additions as US4/US5 add methods
- T030 and T031 modify existing agent files — be careful not to break existing AI behavior
