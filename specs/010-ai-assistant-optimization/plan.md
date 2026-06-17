# Implementation Plan: AI助手能力优化与长期记忆

**Branch**: `010-ai-assistant-optimization` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-ai-assistant-optimization/spec.md`

## Summary

优化现有 AI 助手在宠物用品与宠物知识场景的回答质量，扩展工具与结构化卡片输出，首个新增能力落地为"换粮计划"。同时新增用户级 AI 长期记忆：登录用户默认开启，每日 Dream 批次从新增对话中提取必要信息，按宠物状况、偏好预算、常问问题、注意事项组织为 500 字以内的当前有效记忆，并在"我的"页面支持查看、分类编辑、清空和暂停。技术方案复用现有 FastAPI + LangChain + APScheduler + Taro 架构，新增记忆模型/服务/API、SSE 卡片协议、前端 AI 印象页与卡片组件。

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend/admin)
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 async, Pydantic v2, LangChain/ChatOpenAI, APScheduler, Loguru, Prometheus client, Taro 3.x, React 18, Zustand, Tailwind/NutUI-compatible mini-program patterns
**Storage**: PostgreSQL 15 for chat/messages/SPU/memory state, Redis 7 optional for hot card/search/question cache
**Testing**: pytest + pytest-asyncio for backend unit/integration/contract tests; TypeScript build checks and manual WeChat DevTools acceptance for mini-program UI
**Target Platform**: Linux backend API, WeChat Mini Program, browser-based admin panel if later needed for observability
**Project Type**: Web service + mini-program + admin web application
**Performance Goals**: non-streaming API p95 < 200ms; chat SSE TTFB < 500ms; memory read/edit < 1s user-perceived; Dream batch updates valid memory within 24h; card payload generation adds < 300ms when product data is already available
**Constraints**: mini-program must not use `process.env`; main package < 2MB; list page_size <= 100; long-term memory display <= 500 Chinese characters; no user-visible memory history; no table deletion; health/medical answers must include safety boundaries
**Scale/Scope**: Initial scope covers existing chat sessions/messages, logged-in user memory, five answer card types plus food transition plan card, one daily Dream job, one mini-program AI impression page, and focused AI eval fixtures

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

基于项目宪法原则，每个功能实现计划 MUST 验证以下检查项：

- [x] **类型安全**: Plan includes Pydantic request/response schemas for memory and card payloads, SQLAlchemy models for current memory state, and TypeScript discriminated unions for answer cards and memory sections.
- [x] **测试覆盖**: Plan covers unit tests for memory extraction/merge/card selection, integration tests for chat stream + memory APIs, contract tests for `/chat/memory` and SSE card payloads, and frontend build checks.
- [x] **UX 一致性**: Mini-program work extends existing `chat` and `mine` pages, uses existing Tailwind/NutUI-compatible visual language, and keeps cards compact for small screens.
- [x] **性能影响**: Memory lookup is a single indexed user lookup; Dream runs daily in background; product cards reuse existing SPU tools and paginated queries; no new synchronous long-running step is added before SSE starts.
- [x] **可观测性**: Plan includes structured logs and metrics for card selection, tool success/failure, memory extraction success/error, Dream run counts, token usage, and user memory pause/edit actions.

## Project Structure

### Documentation (this feature)

```text
specs/010-ai-assistant-optimization/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-contracts.md
└── tasks.md              # Created by /speckit.tasks, not by this plan
```

### Source Code Changes

```text
backend/
├── alembic/versions/                         # add assistant memory current-state table/indexes only
├── app/
│   ├── agents/
│   │   ├── agent.py                          # inject long-term memory, emit answer card SSE events
│   │   ├── prompts.py                        # strengthen pet supplies/knowledge/system safety prompts
│   │   └── tools.py                          # improve existing SPU tools, add food transition plan tool
│   ├── api/v1/
│   │   └── chat.py                           # add memory endpoints, preserve chat stream API
│   ├── models/
│   │   ├── assistant_memory.py               # new user current memory model
│   │   └── chat.py                           # optional additive fields for dream processed markers
│   ├── schemas/
│   │   ├── assistant_memory.py               # memory section and response schemas
│   │   └── chat.py                           # card payload / stream metadata schemas
│   ├── scheduler/
│   │   └── jobs.py                           # register daily Dream memory batch
│   └── services/
│       ├── assistant_memory_service.py       # CRUD, merge, pause/clear, prompt context
│       ├── dream_memory_service.py           # daily extraction from new messages
│       ├── answer_card_service.py            # card selection/building from tool outputs
│       └── food_transition_service.py        # first new AI capability
└── tests/
    ├── unit/
    │   ├── test_assistant_memory_service.py
    │   ├── test_answer_card_service.py
    │   └── test_food_transition_service.py
    ├── integration/
    │   ├── test_chat_memory_flow.py
    │   └── test_dream_memory_job.py
    └── contract/
        └── test_assistant_memory_contract.py

frontend/
└── src/
    ├── components/
    │   └── chat/
    │       ├── AnswerCardRenderer.tsx        # discriminated card renderer
    │       ├── SpuAnswerCard.tsx             # optimized SPU card
    │       ├── ComparisonCard.tsx
    │       ├── RecommendationListCard.tsx
    │       ├── IngredientInsightCard.tsx
    │       ├── FollowUpCard.tsx
    │       └── FoodTransitionPlanCard.tsx
    ├── pages/
    │   ├── chat/index.tsx                    # parse card SSE event and render cards
    │   └── mine/
    │       ├── index.tsx                     # add AI impression entry
    │       └── ai-memory.tsx                 # view/edit/clear/pause classified memory
    ├── services/
    │   └── assistantMemoryApi.ts             # memory API client
    └── types/
        └── chat.ts                           # memory and card TypeScript unions
```

**Structure Decision**: Use the existing three-surface architecture (`backend`, `frontend`, `admin`) but implement this feature primarily in backend + mini-program. The backend extends the existing chat agent, scheduler and service layers. The mini-program extends existing chat and mine pages. Admin changes are deferred unless observability dashboards need a UI in a later feature.

## Complexity Tracking

No constitution violations are expected. Schema changes are additive and current-state oriented; no table deletion is planned.
