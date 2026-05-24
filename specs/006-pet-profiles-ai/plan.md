# Implementation Plan: 宠物档案与AI能力增强

**Branch**: `006-assistance-pro` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-pet-profiles-ai/spec.md`

## Summary

为宠物用品选购小程序增加宠物档案功能，用户可在注册时添加宠物信息，在"我的"页面管理宠物档案。已绑宠物的用户首页展示宠物卡片替代默认Tab栏，推荐内容基于宠物种类个性化。AI助手自动注入宠物上下文以提供精准推荐，推荐问题从静态切换为AI动态生成（缓存24h，失败静默降级）。品种数据由管理后台维护。

## Technical Context

**Language/Version**: Python 3.11+ / TypeScript 5.x  
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 (async), Pydantic v2, LangChain, Taro 3.x, React 18, Zustand, NutUI-React  
**Storage**: PostgreSQL 15, Redis 7  
**Testing**: pytest (backend), Taro testing (frontend)  
**Target Platform**: WeChat mini-program (frontend) + Linux server (backend) + Admin SPA  
**Project Type**: Web application (frontend + backend + admin)  
**Performance Goals**: API p95 <200ms, SSE TTFB <500ms, suggested questions <2s  
**Constraints**: Mini-program main package <2MB, page_size ≤100, max 5 pets/user  
**Scale/Scope**: ~1K users initially, 3 new backend files, 4 new frontend pages, 1 Alembic migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **类型安全**: All schemas defined via Pydantic v2 (backend) + TypeScript interfaces (frontend). Static analysis via Ruff/Pyright + ESLint.
- [x] **测试覆盖**: Unit tests for PetService, integration tests for pet CRUD API, contract tests for API response shapes. Target ≥80% coverage.
- [x] **UX 一致性**: Frontend uses NutUI-React components, follows existing page patterns from mine/index.tsx and index/index.tsx.
- [x] **性能影响**: Pet list query is single SELECT with FK index. AI context injection is string construction (<5ms). Suggested questions cached 24h in Redis. No N+1 queries introduced.
- [x] **可观测性**: Structured logging via Loguru includes user_id and pet context. Key metric: suggested_questions_generation_duration_ms.

## Project Structure

### Documentation (this feature)

```text
specs/006-pet-profiles-ai/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.md
└── tasks.md             # Phase 2 output (speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/v1/
│   │   └── pets.py              # NEW: Pet CRUD + breed list endpoints
│   │   └── chat.py              # MODIFY: add suggested_questions endpoint
│   ├── models/
│   │   ├── pet.py               # NEW: Pet model
│   │   ├── pet_breed.py         # NEW: PetBreed model
│   │   └── user.py              # MODIFY: add pets relationship
│   ├── schemas/
│   │   └── pet.py               # NEW: PetCreate/Update/Response schemas
│   ├── services/
│   │   ├── pet_service.py       # NEW: Pet CRUD + breed operations
│   │   └── suggested_questions.py # NEW: AI question generation service
│   ├── agents/
│   │   ├── prompts.py           # MODIFY: add pet context template
│   │   └── agent.py             # MODIFY: inject pet context into system prompt
│   └── main.py                  # MODIFY: register pets router
├── alembic/versions/
│   └── 007_pet_profiles.py      # NEW: migration for pets + pet_breeds tables
└── tests/
    └── unit/
        └── test_pet_service.py  # NEW: pet service unit tests

frontend/
├── src/
│   ├── pages/
│   │   ├── index/index.tsx      # MODIFY: pet cards replace default tabs
│   │   ├── mine/index.tsx       # MODIFY: add pet management entry
│   │   ├── mine/pets.tsx        # NEW: pet management list page
│   │   ├── mine/pets-create.tsx # NEW: add/edit pet form page
│   │   └── chat/index.tsx       # MODIFY: dynamic suggested questions
│   ├── stores/
│   │   └── authStore.ts         # MODIFY: add pet info to user state
│   ├── services/
│   │   └── petApi.ts            # NEW: pet API client functions
│   └── types/
│       └── index.ts             # MODIFY: add Pet/PetBreed interfaces
```

**Structure Decision**: Follows existing project pattern (Option 2: Web application). New backend model/service/api files for pets; new frontend pages under pages/mine/; admin breed management under admin/src/pages/.

## Complexity Tracking

No constitution violations. All patterns follow existing project conventions.
