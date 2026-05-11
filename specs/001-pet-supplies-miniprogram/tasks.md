# Tasks: Pet Supplies Assistant Mini Program

**Input**: Design documents from `/specs/001-pet-supplies-miniprogram/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md

**Tests**: This plan includes test tasks aligned with the constitution's test-driven quality principle.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize existing projects and local development environment

- [X] T001 Initialize backend Python environment with FastAPI dependencies in `backend/requirements.txt`
- [X] T002 [P] Setup Docker Compose with PostgreSQL 15, Redis 7, and Meilisearch in `docker-compose.yml`
- [X] T003 [P] Configure backend linting (ruff) and type checking (pyright) in `backend/pyproject.toml`
- [X] T004 Initialize Taro 3.x project structure alongside existing web prototype, reusing `frontend/src/` components
- [X] T005 [P] Configure frontend TypeScript strict mode and Tailwind CSS for Taro in `frontend/tsconfig.json`
- [X] T006 Setup environment variables template (`.env.example`) for backend with database, Redis, WeChat, and LLM API keys

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create SQLAlchemy async database engine and session management in `backend/app/core/database.py`
- [X] T008 [P] Create Pydantic settings configuration in `backend/app/core/config.py` (database URL, JWT secret, WeChat credentials, LLM API keys)
- [X] T009 Implement JWT token utilities (create, verify, refresh) in `backend/app/core/security.py`
- [X] T010 Setup FastAPI app with CORS, exception handlers, and request logging middleware in `backend/app/main.py`
- [X] T011 [P] Implement rate limiting middleware using Redis in `backend/app/middleware/rate_limit.py`
- [X] T012 Create base Pydantic response schema (ApiResponse, Pagination) in `backend/app/schemas/common.py`
- [X] T013 Create Alembic migration environment and initial migration script
- [X] T014 [P] Setup frontend API client with Taro.request, interceptors, and error handling in `frontend/src/services/api.ts`
- [X] T015 [P] Initialize Zustand stores for auth, products, and chat state in `frontend/src/stores/`

**Checkpoint**: Foundation ready - backend API and frontend client are operational

---

## Phase 3: User Story 1 - Browse Pet Products by Category (Priority: P1) 🎯 MVP

**Goal**: Users can browse products organized by pet type and category with filtering and sorting

**Independent Test**: Navigate to home page, select pet type, click category, see filtered product list with correct sorting

### Backend Implementation

- [X] T016 [P] [US1] Create Category SQLAlchemy model in `backend/app/models/category.py`
- [X] T017 [P] [US1] Create Product SQLAlchemy model in `backend/app/models/product.py`
- [X] T018 [US1] Implement Category service with tree retrieval in `backend/app/services/category_service.py`
- [X] T019 [US1] Implement Product service with search, filter, sort in `backend/app/services/product_service.py`
- [X] T020 [US1] Create Category Pydantic schemas in `backend/app/schemas/category.py`
- [X] T021 [US1] Create Product Pydantic schemas in `backend/app/schemas/product.py`
- [X] T022 [US1] Implement GET /categories endpoint in `backend/app/api/v1/categories.py`
- [X] T023 [US1] Implement GET /products endpoint with query params in `backend/app/api/v1/products.py`
- [X] T024 [US1] Add Redis caching for category tree and product lists in category/product services

### Frontend Implementation (Reuse Existing Prototype)

- [X] T025 [P] [US1] Adapt existing `HomePage.tsx` to Taro routing and `Taro.navigateTo` in `frontend/src/pages/index/index.tsx`
- [X] T026 [P] [US1] Adapt existing `CategoryPage.tsx` to Taro components, connect to /categories API in `frontend/src/pages/category/index.tsx`
- [X] T027 [P] [US1] Adapt existing `ProductListPage.tsx` to Taro, connect to /products API with filters in `frontend/src/pages/product/list.tsx`
- [X] T028 [US1] Reuse and adapt `ProductCard` component for Taro in `frontend/src/components/ProductCard/index.tsx`
- [X] T029 [US1] Replace mock data in stores with API calls, implement product list state in `frontend/src/stores/productStore.ts`
- [X] T030 [US1] Implement Taro app config and tabBar in `frontend/src/app.config.ts`

**Checkpoint**: Home page, category browsing, and product list are functional with real API data

---

## Phase 4: User Story 2 - View Product Details with Structured Reviews (Priority: P1)

**Goal**: Users can view detailed product information, structured pros/cons, ratings, and reviews

**Independent Test**: Click product card, see detail page with pros/cons tabs, review list with ratings

### Backend Implementation

- [X] T031 [P] [US2] Create Review SQLAlchemy model in `backend/app/models/review.py`
- [X] T032 [US2] Implement Review service with pagination and filtering in `backend/app/services/review_service.py`
- [X] T033 [US2] Create Review Pydantic schemas in `backend/app/schemas/review.py`
- [X] T034 [US2] Implement GET /products/{id} endpoint in `backend/app/api/v1/products.py`
- [X] T035 [US2] Implement GET /products/{id}/reviews endpoint in `backend/app/api/v1/reviews.py`

### Frontend Implementation (Reuse Existing Prototype)

- [X] T036 [US2] Adapt existing `ProductDetailPage.tsx` to Taro, connect to product detail API in `frontend/src/pages/product/detail.tsx`
- [X] T037 [US2] Add review fetching and display with tab switching in `frontend/src/pages/product/detail.tsx`
- [X] T038 [US2] Implement pros/cons tags rendering and rating bars from existing prototype components
- [X] T039 [US2] Add review helpfulness voting UI in `frontend/src/pages/product/detail.tsx`

**Checkpoint**: Product detail page displays full information including reviews and ratings

---

## Phase 5: User Story 3 - AI Shopping Assistant (Priority: P1)

**Goal**: Users can chat with AI for product recommendations via natural language

**Independent Test**: Open chat, send message, receive streaming response with product recommendations

### Backend Implementation

- [X] T040 [P] [US3] Create ChatSession and ChatMessage SQLAlchemy models in `backend/app/models/chat.py`
- [X] T041 [P] [US3] Implement Chat service with history management in `backend/app/services/chat_service.py`
- [X] T042 [US3] Create Chat Pydantic schemas in `backend/app/schemas/chat.py`
- [X] T043 [US3] Implement POST /chat/sessions and GET /chat/sessions endpoints in `backend/app/api/v1/chat.py`
- [X] T044 [US3] Implement POST /chat/stream SSE endpoint with LangChain ReAct agent in `backend/app/api/v1/chat.py`
- [X] T045 [US3] Build Agent tools (search_products, get_product_detail, get_reviews_summary) in `backend/app/agents/tools.py`
- [X] T046 [US3] Create agent prompts with safety guardrails in `backend/app/agents/prompts.py`
- [X] T047 [US3] Implement SSE streaming response handler in `backend/app/agents/streaming.py`
- [X] T048 [US3] Integrate LangChain ReAct agent with tool calling in `backend/app/agents/agent.py`

### Frontend Implementation (Reuse Existing Prototype)

- [X] T049 [US3] Adapt existing `ChatPage.tsx` to Taro, implement SSE client in `frontend/src/pages/chat/index.tsx`
- [X] T050 [US3] Implement streaming message display with typing indicators from existing prototype
- [X] T051 [US3] Add quick question buttons and message input handling in `frontend/src/pages/chat/index.tsx`
- [X] T052 [US3] Implement recommended product cards within chat messages (reuse ProductCard logic)
- [X] T053 [US3] Add chat session history list and navigation in `frontend/src/pages/chat/list.tsx`

**Checkpoint**: AI chat responds with streaming output and product recommendations

---

## Phase 6: User Story 4 - Compare Multiple Products (Priority: P2)

**Goal**: Users can select and compare 2-4 products side by side

**Independent Test**: Add products to comparison, view comparison table with key attributes

### Backend Implementation

- [X] T054 [US4] Implement GET /products/compare endpoint in `backend/app/api/v1/products.py`
- [X] T055 [US4] Create product comparison logic in `backend/app/services/product_service.py`

### Frontend Implementation

- [X] T056 [US4] Implement comparison state management (add/remove/compare) in `frontend/src/stores/compareStore.ts`
- [X] T057 [US4] Create comparison page with attribute table in `frontend/src/pages/product/compare.tsx`
- [X] T058 [US4] Add "Add to Compare" buttons on product cards and detail page

**Checkpoint**: Users can compare multiple products with structured attribute comparison

---

## Phase 7: User Story 5 - Save Favorite Products (Priority: P2)

**Goal**: Authenticated users can save and view favorite products

**Independent Test**: Login, favorite a product, view favorites list, unfavorite

### Backend Implementation

- [X] T059 [P] [US5] Create Favorite SQLAlchemy model in `backend/app/models/favorite.py`
- [X] T060 [US5] Create User SQLAlchemy model in `backend/app/models/user.py`
- [X] T061 [US5] Implement Favorite service in `backend/app/services/favorite_service.py`
- [X] T062 [US5] Implement WeChat login service in `backend/app/services/auth_service.py`
- [X] T063 [US5] Create User and Favorite Pydantic schemas in `backend/app/schemas/user.py`
- [X] T064 [US5] Implement POST /auth/wechat-login endpoint in `backend/app/api/v1/auth.py`
- [X] T065 [US5] Implement POST /products/{id}/favorite and GET /users/me/favorites endpoints

### Frontend Implementation

- [X] T066 [US5] Implement WeChat login flow with `wx.login()` in `frontend/src/services/auth.ts`
- [X] T067 [US5] Add auth state and token management in `frontend/src/stores/authStore.ts`
- [X] T068 [US5] Add favorite/unfavorite buttons to product detail page
- [X] T069 [US5] Create favorites list page in `frontend/src/pages/mine/favorites.tsx`
- [X] T070 [US5] Implement "My" page with user info and navigation in `frontend/src/pages/mine/index.tsx`

**Checkpoint**: Authenticated users can save and manage favorite products

---

## Phase 8: Admin Backend & Data Pipeline (Priority: P2)

**Goal**: H5 admin interface for product management and review moderation

**Independent Test**: Access admin panel, CRUD products, approve/reject reviews

- [X] T071 [P] Create admin React project structure in `admin/` with Vite
- [X] T072 [P] Implement admin authentication (login page, JWT storage) in `admin/src/pages/Login.tsx`
- [X] T073 Implement product management list and form in `admin/src/pages/Products/`
- [X] T074 Implement category management in `admin/src/pages/Categories/`
- [X] T075 Implement review moderation queue with approve/reject in `admin/src/pages/Reviews/`
- [X] T076 [P] Create data collection scheduler with APScheduler in `backend/app/scheduler/jobs.py`
- [X] T077 Implement data source configuration models and API in `backend/app/models/data_source.py`
- [X] T078 Implement price/review fetch jobs for JD/Taobao APIs in `backend/app/scheduler/`
- [X] T079 Implement LLM review moderation pipeline in `backend/app/services/review_moderation.py`

**Checkpoint**: Admin can manage products, categories, and moderate reviews

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Performance, testing, and production readiness

- [X] T080 [P] Implement PostgreSQL full-text search for products in `backend/app/services/search_service.py`
- [X] T081 Add Redis caching strategy for hot data (categories, product lists, search suggestions)
- [X] T082 [P] Write backend unit tests for services in `backend/tests/unit/`
- [X] T083 [P] Write backend integration tests for API endpoints in `backend/tests/integration/`
- [X] T084 [P] Write contract tests for API endpoints in `backend/tests/contract/`
- [X] T085 Add Prometheus metrics endpoint and structured logging with Loguru
- [X] T086 Optimize mini program bundle size (code splitting, image compression)
- [X] T087 Add error boundaries and loading states across all frontend pages
- [X] T088 Implement search suggestions and global search API in `backend/app/api/v1/search.py`
- [X] T089 Add WeChat sharing functionality to product pages
- [X] T090 Performance testing and optimization (API response times, DB query optimization)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (different backend models, different frontend pages)
  - US3 can start after US1 (shares product data, but chat is independent)
  - US4 and US5 can proceed in parallel after US1/US2
- **Admin (Phase 8)**: Depends on US1-US3 backend completion
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Browse)**: Foundational only - No dependencies on other stories
- **US2 (Product Detail)**: Foundational only - Uses same product data as US1
- **US3 (AI Chat)**: Foundational + US1 product API (for recommendations)
- **US4 (Compare)**: Foundational + US1 product API
- **US5 (Favorites)**: Foundational + US1/US2 (product data) + auth

### Within Each User Story

- Backend models before services
- Services before API endpoints
- Frontend stores before pages
- API integration after backend endpoints are ready

### Parallel Opportunities

- Backend models for US1, US2, US3 can be developed in parallel
- Frontend page adaptation (HomePage, ProductListPage, ChatPage) can be done in parallel
- Admin backend can be developed in parallel with frontend after US1-US3 backend is ready
- Test writing can happen in parallel with implementation

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 - Browse Products
4. Complete Phase 4: US2 - Product Detail
5. Complete Phase 5: US3 - AI Chat
6. **STOP and VALIDATE**: Test core user journey (browse → detail → chat)
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 → Test independently → Deploy/Demo
4. Add US3 → Test independently → Deploy/Demo
5. Add US4 → Test independently → Deploy/Demo
6. Add US5 → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Frontend Reuse Strategy

**Critical**: The existing web prototype (`frontend/src/`) contains complete, working page implementations. Tasks T025-T029, T036-T039, T049-T053 explicitly call for ADAPTING existing code rather than rewriting:

- **HomePage** (`frontend/src/pages/HomePage.tsx`) → `frontend/src/pages/index/index.tsx`
- **ProductListPage** (`frontend/src/pages/ProductListPage.tsx`) → `frontend/src/pages/product/list.tsx`
- **ProductDetailPage** (`frontend/src/pages/ProductDetailPage.tsx`) → `frontend/src/pages/product/detail.tsx`
- **ChatPage** (`frontend/src/pages/ChatPage.tsx`) → `frontend/src/pages/chat/index.tsx`
- **ProductCard** (`frontend/src/components/ProductCard.tsx`) → `frontend/src/components/ProductCard/index.tsx`

**Adaptation checklist for each page**:
1. Replace `useNavigate` with `Taro.navigateTo`
2. Replace standard `<div>`, `<img>` with Taro components (`<View>`, `<Image>`)
3. Replace `fetch`/`axios` with `Taro.request` via API client
4. Replace mock data imports with Zustand store data
5. Add WeChat-specific APIs where needed (login, share)
6. Keep existing Tailwind CSS classes and styling logic
7. Preserve existing component structure and state management patterns

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (backend categories/products + frontend home/list pages)
   - Developer B: US2 (backend reviews + frontend detail page)
   - Developer C: US3 (backend AI agent + frontend chat page)
3. Stories complete and integrate independently
4. Admin backend can be developed by a separate developer in parallel

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Frontend pages should reuse existing prototype code** - adaptation is faster than rewriting
- AI agent implementation is the highest complexity task - allocate sufficient time
- WeChat mini program has specific restrictions (bundle size, API limitations) - test early on real device
