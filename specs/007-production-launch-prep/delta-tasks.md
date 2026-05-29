# Tasks: 首页场景快捷卡（Delta）

**Input**: Design documents from `/specs/007-production-launch-prep/`
**Prerequisites**: delta-plan.md (required), delta-spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Codebase Analysis)

**Purpose**: Understand existing code structure and API availability before implementation

- [X] T001 Verify existing search API endpoint in `frontend/src/services/api.ts` and `backend/app/api/v1/` — confirm `/v1/spus/search` or equivalent supports `keywords` query parameter
- [X] T002 [P] Check `SpuCard` component usage across the codebase (`frontend/src/components/SpuCard.tsx`) — identify all pages that import it to assess style change impact
- [X] T003 Verify current `frontend/src/pages/index/index.tsx` structure — locate AI banner code block to be removed and identify exact insertion point for scenario section

**Checkpoint**: Search API confirmed, SpuCard impact assessed, insertion point identified. Implementation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shared components and configuration that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create scenario configuration file `frontend/src/config/scenarios.ts` with TypeScript types (`ScenarioConfig` interface) and static data for all 6 cat scenarios (美毛亮毛/肠胃敏感/幼猫成长/囤货专区/挑食改善/换季护理) plus dog/bird/fish/reptile/small_pet templates with keyword replacement
- [X] T005 [P] Create reusable `ScenarioCard` component in `frontend/src/components/ScenarioCard.tsx` — accepts icon, title, subtitle, active state props; styling: 150-170px width, 72-88px height, 16px border-radius, left icon + right two-line text layout
- [X] T006 Create `ScenarioSection` component in `frontend/src/components/ScenarioSection.tsx` — wraps horizontal `scroll-view`, renders scenario cards, handles active state highlight, includes "清除" clear button (visible only when a scenario is selected)
- [X] T007 Add search API call method to `frontend/src/services/api.ts` — `searchSpusByKeywords(keywords: string[], petType?: string)` that calls `GET /v1/spus/search` or equivalent endpoint

**Checkpoint**: Foundation ready — scenario config, card component, section component, and search API wrapper are all in place. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — 通过场景卡片快速找到目标商品 (Priority: P1) 🎯 MVP

**Goal**: Replace AI banner with scenario cards; clicking a card triggers search API and displays results in-place on homepage

**Independent Test**: Open homepage → see scenario cards → click "美毛亮毛" → homepage shows loading then filtered products → click "清除" → returns to full recommendation list

### Implementation for User Story 1

- [X] T008 [US1] Remove AI assistant banner from `frontend/src/pages/index/index.tsx` (delete the orange gradient banner block with "问问 AI 助手" text, AI icon, and arrow)
- [X] T009 [US1] Integrate `ScenarioSection` into `frontend/src/pages/index/index.tsx` at the position where AI banner was removed (between pet type selector and product recommendation list)
- [X] T010 [US1] Add scenario state management to `frontend/src/pages/index/index.tsx` — `activeScenarioId`, `isSearching`, `scenarioResults`, `scenarioError`; pass state and handlers to `ScenarioSection`
- [X] T011 [US1] Implement scenario click handler in `frontend/src/pages/index/index.tsx` — calls search API with scenario keywords, shows loading state, replaces `recommendedSpus` with search results
- [X] T012 [US1] Implement "清除" (clear) button handler in `frontend/src/pages/index/index.tsx` — resets `activeScenarioId` to null, restores original `recommendedSpus` list
- [X] T013 [US1] Add empty state UI in `frontend/src/pages/index/index.tsx` — when scenario search returns no results, show "暂无相关商品，试试其他场景？" with a "查看更多商品" link that navigates to search page
- [X] T014 [US1] Add loading state UI in `frontend/src/pages/index/index.tsx` — show skeleton placeholders or loading spinner while search API is in progress
- [X] T015 [US1] Add error handling in `frontend/src/pages/index/index.tsx` — when search API fails, show error message and fallback to original recommendations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Scenario cards display, click triggers search, clear restores defaults.

---

## Phase 4: User Story 2 — 首页视觉与信息层级优化 (Priority: P2)

**Goal**: Remove orange AI banner, apply light background to scenario section, optimize SpuCard visual hierarchy

**Independent Test**: Open homepage → confirm no orange AI banner → confirm scenario section has `#FFF4EA` background → confirm product cards have title bold, price orange bottom-right, rating de-emphasized

### Implementation for User Story 2

- [X] T016 [US2] Apply `#FFF4EA` background color to `ScenarioSection` component container — replace any orange gradient with light beige background
- [X] T017 [P] [US2] Update greeting text in `frontend/src/pages/index/index.tsx` — change from "下午好 👋 今天想给{petName}看点什么？" to "下午好，今天给{petName}挑点什么？" with pet name in orange
- [X] T018 [US2] Optimize `frontend/src/components/SpuCard.tsx` visual hierarchy:
  - Title: bold, medium font size
  - Category/usage: light gray small text
  - Price: bottom-right positioned, orange color prominent
  - Rating and review count: de-emphasized (smaller, lighter color)
- [X] T019 [US2] Verify and adjust scenario card styling in `frontend/src/components/ScenarioCard.tsx` — ensure consistent spacing, font sizes, and colors match NutUI-React design tokens

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Visual design matches spec requirements.

---

## Phase 5: User Story 3 — 不同宠物类型展示对应场景 (Priority: P3)

**Goal**: Scenario cards dynamically update when user switches pet type on homepage

**Independent Test**: Open homepage (cat selected) → see cat scenarios → switch to dog → see dog scenarios with replaced keywords → switch to bird → see bird scenarios or generic fallback

### Implementation for User Story 3

- [ ] T020 [US3] Add pet type watcher to `frontend/src/pages/index/index.tsx` — when `activeSpecies` changes, recalculate scenario config and reset `activeScenarioId` to null
- [ ] T021 [US3] Implement pet type → scenario config mapping in `frontend/src/config/scenarios.ts` — export `getScenariosByPetType(petType: string)` that returns appropriate scenario array (cat gets full config, others get template with keyword replacement)
- [ ] T022 [US3] Handle unsupported pet types in `frontend/src/components/ScenarioSection.tsx` — when `scenarios` array is empty or pet type has no config, hide the entire scenario section or show generic "热门推荐"/"日常用品" cards
- [ ] T023 [US3] Ensure smooth transition in `frontend/src/pages/index/index.tsx` — when pet type switches, scenario cards should update without flickering; maintain scroll position if possible

**Checkpoint**: All user stories should now be independently functional. Pet type switching updates scenarios smoothly.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, edge case handling, and cleanup

- [ ] T024 [P] Add debounce to scenario click handler in `frontend/src/pages/index/index.tsx` — prevent rapid consecutive clicks from triggering multiple API calls (300ms debounce)
- [ ] T025 [P] Verify `frontend/src/app.config.ts` — confirm no new page routes needed (all interaction stays on homepage)
- [ ] T026 Run WeChat DevTools preview and test on real device — verify horizontal scroll works on iOS and Android, check for capsule button overlap
- [ ] T027 Test edge cases in `frontend/src/pages/index/index.tsx`:
  - No matching products: empty state displays correctly
  - Network failure: error message shows, falls back to recommendations
  - Rapid pet type switching: no flickering, no duplicate API calls
  - Refresh page: scenario selection resets to default
- [ ] T028 Check bundle size impact — run `npm run build:weapp`, verify main package size increase <50KB after adding new components
- [ ] T029 Clean up unused AI banner imports in `frontend/src/pages/index/index.tsx` — remove `AiAssistantIcon` import if no longer used elsewhere
- [ ] T030 Update `frontend/src/components/SpuCard.tsx` regression check — verify the component still renders correctly on search results page, favorites page, and any other pages that use it

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001 confirms API exists) — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (Phase 3) is MVP — complete first
  - US2 (Phase 4) and US3 (Phase 5) can proceed in parallel after US1
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories. **This is the MVP.**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — SpuCard styling is independent of scenario logic; can be done in parallel with US1
- **User Story 3 (P3)**: Can start after US1 is complete — requires scenario click handler and state management from US1

### Within Each User Story

- Core component before integration
- State management before event handlers
- Happy path before edge cases

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- All Foundational tasks (T004-T007) can run in parallel
- US1 and US2 can be developed in parallel after Foundational (different files, no dependencies)
- US3 depends on US1 completion
- All Polish tasks (T024-T030) marked [P] can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# All foundational components can be created in parallel:
Task: "Create scenario config in frontend/src/config/scenarios.ts"
Task: "Create ScenarioCard in frontend/src/components/ScenarioCard.tsx"
Task: "Create ScenarioSection in frontend/src/components/ScenarioSection.tsx"
Task: "Add search API wrapper in frontend/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (check API and code structure)
2. Complete Phase 2: Foundational (create shared components)
3. Complete Phase 3: User Story 1 (scenario cards + search + clear)
4. **STOP and VALIDATE**: Test US1 independently in WeChat DevTools
5. Deploy/preview if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Preview (MVP!)
3. Add User Story 2 → Test independently → Preview
4. Add User Story 3 → Test independently → Preview
5. Polish phase → Final verification → Ready for merge

### Parallel Team Strategy

With multiple developers:

1. All complete Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (scenario logic + search integration)
   - Developer B: User Story 2 (SpuCard styling + greeting text + background colors)
3. After US1 complete:
   - Developer A or C: User Story 3 (pet type switching)
4. All converge on Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each phase or logical task group
- Stop at any checkpoint to validate story independently
- This is a **delta** feature — no new pages, no backend changes, pure frontend UI/UX enhancement
- Avoid: vague tasks, same file conflicts (especially `index.tsx`), cross-story dependencies that break independence
