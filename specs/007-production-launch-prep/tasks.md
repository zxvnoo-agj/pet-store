# Tasks: 生产上线准备

**Input**: Design documents from `/specs/007-production-launch-prep/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not requested in feature specification. Tasks focus on implementation and manual verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` (FastAPI)
- **Frontend**: `frontend/` (Taro/React mini-program)
- **Admin**: `admin/` (React SPA)
- **Deploy**: `deploy/` (Docker, Nginx, scripts)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create deployment directory structure and environment configuration templates

- [ ] T001 Create deploy/ directory structure including deploy/production/nginx/, deploy/staging/nginx/, and deploy/scripts/ subdirectories
- [ ] T002 [P] Create deploy/production/.env.production.example with all required environment variables (DATABASE_URL, REDIS_URL, SECRET_KEY, WECHAT_APP_ID, WECHAT_APP_SECRET, DASHSCOPE_API_KEY, MEILISEARCH_URL, MEILISEARCH_API_KEY, DEBUG=false)
- [ ] T003 [P] Create deploy/staging/.env.staging.example with staging-specific environment variables (separate DB name petshop_staging, Redis DB 1, staging secrets)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure artifacts that MUST be complete before ANY deployment can proceed

**⚠️ CRITICAL**: No deployment or environment-specific configuration should begin until this phase is complete

- [ ] T004 Create backend/Dockerfile with multi-stage build (builder stage for pip install, runtime stage with python:3.11-slim, copies only runtime files per research.md)
- [ ] T005 [P] Create admin/Dockerfile for admin SPA serving via Nginx (multi-stage: node build + nginx:alpine serve)
- [ ] T006 [P] Create admin/nginx.conf for serving admin SPA static files (SPA fallback, gzip, cache headers)
- [ ] T007 [P] Create deploy/scripts/deploy.sh for automated deployment (git pull, docker compose build, docker compose up -d with health check verification)
- [ ] T008 [P] Create deploy/scripts/backup.sh for PostgreSQL + Redis backup (pg_dump with gzip, redis-cli bgsave, timestamped filenames)
- [ ] T009 [P] Create deploy/scripts/healthcheck.sh for post-deployment verification (curl /health, curl /metrics, curl /v1/categories, report pass/fail)

**Checkpoint**: Foundation ready — deployment infrastructure artifacts created. User story implementation can now begin.

---

## Phase 3: User Story 1 - 小程序配置与域名备案 (Priority: P1) 🎯 MVP

**Goal**: Configure WeChat Mini Program AppID and production environment settings so the mini program can be built and tested with production API endpoints.

**Independent Test**: Open project in WeChat DevTools with AppID configured, verify TabBar navigation works and API calls resolve to the correct production domain.

### Implementation for User Story 1

- [ ] T010 [P] [US1] Configure WeChat AppID in frontend/project.config.json (replace placeholder appid field with real mini-program AppID)
- [ ] T011 [P] [US1] Update frontend/config/prod.js with production environment configuration (set API base URL to https://api.pawpalai.cn/v1, enable production-specific flags)

**Checkpoint**: Mini program is configured with production AppID and API domain. Build and preview in WeChat DevTools to verify.

---

## Phase 4: User Story 2 - 后端生产/预发布环境部署 (Priority: P1)

**Goal**: Deploy backend services to production and staging environments with Docker Compose, Nginx reverse proxy with HTTPS/SSL termination, and CORS configuration.

**Independent Test**: Run `curl https://api.pawpalai.cn/health` on production and `curl https://staging.api.pawpalai.cn/health` on staging; both should return `{"status": "ok"}` with HTTP 200.

### Implementation for User Story 2

- [ ] T012 [P] [US2] Create deploy/production/docker-compose.yml defining backend (FastAPI), postgres, redis, meilisearch services with Docker network petstore_prod, volume mounts, and restart policies
- [ ] T013 [P] [US2] Create deploy/production/nginx/api.pawpalai.cn.conf with reverse proxy to backend:8000, SSL termination via certbot certs, SSE buffering disabled for /v1/chat/stream, and X-Forwarded headers per research.md
- [ ] T014 [P] [US2] Create deploy/production/nginx/admin.pawpalai.cn.conf for admin SPA static file serving with SPA fallback routing and SSL termination
- [ ] T015 [P] [US2] Create deploy/staging/docker-compose.yml mirroring production with isolated resources (separate DB name petshop_staging, Redis DB 1, staging network)
- [ ] T016 [P] [US2] Create deploy/staging/nginx/staging.api.pawpalai.cn.conf for staging Nginx reverse proxy configuration
- [ ] T017 [US2] Update CORS origins in backend/app/main.py to allow production domains (https://admin.pawpalai.cn, https://staging.api.pawpalai.cn) and retain localhost dev origins (localhost:10086, localhost:3001)
- [ ] T018 [US2] Update logging configuration in backend/app/main.py for production readiness (set default level to INFO, configure separate ERROR-level log file handler)

**Checkpoint**: Production and staging backend stacks are deployable. Run quickstart.md steps 3-4 to deploy and verify.

---

## Phase 5: User Story 3 - 前端生产环境适配 (Priority: P2)

**Goal**: Adapt frontend code for production environment — API URL resolution, Bearer token for SSE, package size optimization.

**Independent Test**: Run `npm run build:weapp` in frontend, verify main package size < 2MB, load in WeChat DevTools and verify API calls resolve to production domain, chat SSE includes Authorization header.

### Implementation for User Story 3

- [ ] T019 [P] [US3] Update API base URL resolution in frontend/src/services/api.ts to use environment-aware logic (TARO_ENV=weapp + NODE_ENV=production → https://api.pawpalai.cn/v1, else → http://127.0.0.1:8001/v1 per data-model.md resolution logic)
- [ ] T020 [P] [US3] Update API base URL resolution in frontend/src/services/webApi.ts matching the same environment-aware domain logic as api.ts
- [ ] T021 [P] [US3] Add Bearer token authentication header to SSE fetch in frontend/src/pages/chat/index.tsx (retrieve token from storage, add `Authorization: Bearer <token>` header to fetch/EventSource request)
- [ ] T022 [US3] Remove unused dependencies (lucide-react and other unused packages) from frontend/package.json to reduce bundle size
- [ ] T023 [US3] Verify main package size < 2MB after production build (run `npm run build:weapp`, check dist/ size; configure subpackaging in app.config if exceeding 2MB threshold)

**Checkpoint**: Frontend production build succeeds with correct API URLs, SSE carries auth token, package is under 2MB.

---

## Phase 6: User Story 4 - 安全加固与监控 (Priority: P2)

**Goal**: Harden backend security, configure rate limiting, set up monitoring and logging.

**Independent Test**: Access /metrics without auth (expect 401/403), send rapid requests to trigger rate limiting (expect 429), check error log file for captured errors.

### Implementation for User Story 4

- [ ] T024 [P] [US4] Protect /metrics endpoint in backend/app/main.py with authentication (implement Bearer token check or IP whitelist; return 401/403 for unauthorized access per FR-010)
- [ ] T025 [P] [US4] Configure rate limiting middleware in backend/app/main.py (100 req/min per IP for general endpoints, 20 req/min for auth endpoints per FR-009 and deployment-checklist Phase 4)
- [ ] T026 [P] [US4] Add production SECRET_KEY validation in backend/app/main.py startup (reject service startup if SECRET_KEY matches default/placeholder values per FR-007)
- [ ] T027 [P] [US4] Remove unused dev-only routes from backend router (admin_products stubs, admin_crawled stubs referenced in deployment-checklist Phase 4)
- [ ] T028 [US4] Configure log rotation for error logs in backend/app/main.py (daily rotation, 30-day retention, ERROR level to separate error_*.log files per deployment-checklist Phase 5)
- [ ] T029 [P] [US4] Add Prometheus scrape configuration documentation in deploy/production/ for /metrics endpoint (scrape interval, job name, basic setup instructions)

**Checkpoint**: Security measures active — default keys rejected, rate limiting enforced, metrics auth protected, error logs rotating.

---

## Phase 7: User Story 5 - 合规与审核准备 (Priority: P3)

**Goal**: Prepare mini program compliance materials — privacy agreement page, first-launch consent popup, data collection audit.

**Independent Test**: First launch of mini program shows privacy consent popup; agreeing navigates to main app; privacy policy page is accessible.

### Implementation for User Story 5

- [ ] T030 [US5] Create privacy agreement page/component in frontend/src/pages/privacy/ (static page displaying privacy policy content accessible from Settings or launch popup per FR-014)
- [ ] T031 [US5] Implement first-launch privacy consent popup in frontend/src/app.tsx or app entry point (check async storage for consent flag, show modal if not yet consented, require agreement before proceeding per FR-014)
- [ ] T032 [US5] Document user data collection points for compliance review (list all API endpoints that collect/store user data: WeChat login, chat messages, search queries; output as deploy/production/compliance-data-points.md)

**Checkpoint**: Privacy compliance implemented — consent popup works, privacy page accessible, data collection documented.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation updates, and cleanup.

- [ ] T033 [P] Verify all deployment steps by following quickstart.md end-to-end (run through server initialization, SSL cert, backend deploy, Nginx config, frontend build, and health check validation)
- [ ] T034 [P] Update AGENTS.md with production launch references per plan.md Phase 1 note (add reference to specs/007-production-launch-prep/plan.md in project references section)
- [ ] T035 Final code review and cleanup of all modified and new files (check for hardcoded domains, placeholder secrets, commented-out debug code, ensure consistent formatting)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (both are P1)
  - US3 can start after US2 (needs API endpoint decisions confirmed) or in parallel if using env vars
  - US4 can start after US2 (needs backend deployed)
  - US5 can start anytime after Foundational (independent of other stories)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2); benefits from US2 completion but can proceed with env vars
- **User Story 4 (P2)**: Depends on US2 (backend deployed locally/staging first)
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) — fully independent

### Within Each User Story

- Tasks marked [P] within a story can run in parallel (different files)
- Non-[P] tasks depend on prior parallel tasks completing
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T002, T003 can run in parallel
- Phase 2: T005, T006, T007, T008, T009 can all run in parallel (different files)
- Phase 3 (US1): T010, T011 can run in parallel
- Phase 4 (US2): T012, T013, T014, T015, T016 can run in parallel (different files)
- Phase 5 (US3): T019, T020, T021, T022 can run in parallel
- Phase 6 (US4): T024, T025, T026, T027, T029 can run in parallel
- Phase 7 (US5): T030, T031, T032 can run in parallel
- Phase 8: T033, T034, T035 can run in parallel
- **Cross-phase**: US1 and US2 can be implemented in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch all independent backend deployment tasks together:
Task: "Create deploy/production/docker-compose.yml in deploy/production/docker-compose.yml"
Task: "Create deploy/production/nginx/api.pawpalai.cn.conf in deploy/production/nginx/api.pawpalai.cn.conf"
Task: "Create deploy/production/nginx/admin.pawpalai.cn.conf in deploy/production/nginx/admin.pawpalai.cn.conf"
Task: "Create deploy/staging/docker-compose.yml in deploy/staging/docker-compose.yml"
Task: "Create deploy/staging/nginx/staging.api.pawpalai.cn.conf in deploy/staging/nginx/staging.api.pawpalai.cn.conf"

# Then run dependent tasks sequentially:
Task: "Update CORS origins in backend/app/main.py"
Task: "Update logging configuration in backend/app/main.py"
```

## Parallel Example: User Story 4

```bash
# Launch all independent security tasks together:
Task: "Protect /metrics endpoint in backend/app/main.py"
Task: "Configure rate limiting middleware in backend/app/main.py"
Task: "Add production SECRET_KEY validation in backend/app/main.py"
Task: "Remove unused dev-only routes from backend router"
Task: "Add Prometheus scrape configuration in deploy/production/"

# Then run dependent task:
Task: "Configure log rotation for error logs in backend/app/main.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009) — CRITICAL
3. Complete Phase 3: User Story 1 (T010-T011) — WeChat config
4. Complete Phase 4: User Story 2 (T012-T018) — Backend deployment
5. **STOP and VALIDATE**: Deploy to staging, verify API health, test with WeChat DevTools
6. This is the minimum viable production launch — mini program can connect to backend

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 + US2 → Deploy backend, configure mini program → **MVP: API is live!**
3. US3 → Adapt frontend for production → Mini program functional end-to-end
4. US4 → Harden security + monitoring → Production safe
5. US5 → Add compliance → Ready for WeChat review
6. Phase 8 → Polish → Launch ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 3 (frontend config + adaptation)
   - Developer B: User Story 2 + 4 (backend deploy + security)
   - Developer C: User Story 5 (compliance, can start immediately)
3. Phase 8: Team together for verification and polish

---

## Notes

- [P] tasks = different files, no dependencies — can run concurrently
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- US1 and US2 are both P1 and can be implemented in parallel
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All secrets (AppID, AppSecret, SECRET_KEY) MUST use environment variables or .env files, NEVER hardcode
- Domain `pawpalai.cn`, subdomains `api.pawpalai.cn` / `admin.pawpalai.cn` / `staging.api.pawpalai.cn` per spec.md clarifications
