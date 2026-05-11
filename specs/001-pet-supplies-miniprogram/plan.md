# Implementation Plan: Pet Supplies Assistant Mini Program

**Branch**: `feature/001-pet-supplies-miniprogram` | **Date**: 2026-05-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-pet-supplies-miniprogram/spec.md`

## Summary

Build a WeChat mini program for pet owners to browse pet supplies, view structured product reviews with pros/cons tags, and get personalized recommendations via an AI shopping assistant. The system includes a FastAPI backend with ReAct AI agent, PostgreSQL database, Redis caching, and an H5 admin backend for content management.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI 0.110+, Taro 3.x, SQLAlchemy 2.0, LangChain, Zustand
**Storage**: PostgreSQL 15 (with pgvector), Redis 7
**Testing**: pytest (backend), jest (frontend)
**Target Platform**: WeChat Mini Program (primary), H5 (admin backend)
**Project Type**: web-service + mobile-app
**Performance Goals**: API p95 < 200ms, AI TTFB < 2s, mini program bundle < 2MB
**Constraints**: WeChat mini program package size limits, LLM API rate limits and costs
**Scale/Scope**: MVP with 500 products, support for 1,000 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

基于项目宪法原则，每个功能实现计划 MUST 验证以下检查项：

- [x] **类型安全**: 是否定义了完整的 Pydantic/TypeScript 类型？静态检查能否通过？
  - Backend: All API endpoints use Pydantic v2 schemas for request/response validation
  - Frontend: TypeScript strict mode with Zustand typed stores
- [x] **测试覆盖**: 是否为该功能规划了单元测试、集成测试和契约测试？预期覆盖率是否达标？
  - Backend: pytest with async support, target 80%+ coverage
  - Frontend: Component tests with jest, API contract tests
- [x] **UX 一致性**: 是否遵循 NutUI-React 设计系统？跨端表现是否一致？
  - NutUI-React components for mini program
  - Standard React for admin backend
- [x] **性能影响**: 是否评估了接口延迟、数据库查询次数、缓存策略？
  - Redis caching for hot data (categories, product lists)
  - Database indexes for common queries
  - Pagination for all list endpoints
- [x] **可观测性**: 是否规划了日志、监控指标和错误追踪？
  - Loguru for structured JSON logging
  - Prometheus metrics endpoint
  - Request tracing with correlation IDs

## Project Structure

### Documentation (this feature)

```text
specs/001-pet-supplies-miniprogram/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.md
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/                  # Taro mini program (WeChat)
├── src/
│   ├── pages/            # Mini program pages
│   │   ├── index/        # Home page
│   │   ├── category/     # Category browsing
│   │   ├── product/      # Product list & detail
│   │   ├── chat/         # AI chat interface
│   │   ├── compare/      # Product comparison
│   │   ├── search/       # Search page
│   │   └── mine/         # User profile & favorites
│   ├── components/       # Reusable components
│   │   ├── ProductCard/
│   │   ├── ReviewList/
│   │   ├── ChatBubble/
│   │   └── RatingStars/
│   ├── services/         # API client
│   │   ├── api.ts        # HTTP client wrapper
│   │   ├── auth.ts       # Auth service
│   │   ├── product.ts    # Product API
│   │   └── chat.ts       # Chat API
│   ├── stores/           # Zustand state management
│   │   ├── authStore.ts
│   │   ├── productStore.ts
│   │   ├── chatStore.ts
│   │   └── favoriteStore.ts
│   ├── utils/            # Utilities
│   └── config/           # Configuration
├── package.json
└── tsconfig.json

backend/                   # FastAPI backend
├── app/
│   ├── api/              # API routes
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── categories.py
│   │   │   ├── reviews.py
│   │   │   ├── chat.py
│   │   │   ├── search.py
│   │   │   └── admin.py
│   │   └── deps.py       # Dependencies (auth, DB)
│   ├── core/
│   │   ├── config.py     # Pydantic settings
│   │   ├── database.py   # SQLAlchemy engine
│   │   └── security.py   # JWT utilities
│   ├── models/           # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── category.py
│   │   ├── review.py
│   │   ├── favorite.py
│   │   ├── chat.py
│   │   └── data_source.py
│   ├── schemas/          # Pydantic DTOs
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── review.py
│   │   └── chat.py
│   ├── services/         # Business logic
│   │   ├── auth_service.py
│   │   ├── product_service.py
│   │   ├── review_service.py
│   │   ├── chat_service.py
│   │   └── search_service.py
│   ├── agents/           # AI agent
│   │   ├── agent.py      # ReAct agent
│   │   ├── tools.py      # Tool definitions
│   │   ├── prompts.py    # System prompts
│   │   └── streaming.py  # SSE utilities
│   ├── middleware/       # FastAPI middleware
│   │   ├── auth.py
│   │   ├── rate_limit.py
│   │   └── logging.py
│   └── utils/            # Utilities
│       ├── cache.py
│       └── wechat.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── alembic/              # Database migrations
├── requirements.txt
└── .env.example

admin/                     # H5 admin backend (React)
├── src/
│   ├── pages/            # Admin pages
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── Products/
│   │   ├── Categories/
│   │   └── Reviews/
│   ├── components/       # Admin components
│   ├── services/         # Admin API client
│   └── utils/
├── package.json
└── vite.config.ts

docker-compose.yml         # Local development services
```

**Structure Decision**: Three separate projects (mini program frontend, FastAPI backend, React admin) sharing the same API. This separation allows independent deployment and technology choices optimized for each platform.

## Complexity Tracking

No constitution violations identified. All technical choices align with the constitution's principles of type safety, testing, UX consistency, performance, and observability.

| Aspect | Decision | Justification |
|--------|----------|---------------|
| Frontend framework | Taro 3.x | Cross-platform (WeChat + future H5/APP), matches existing React skills |
| AI architecture | ReAct + LangChain | Best for tool-calling, streaming, and reasoning about product data |
| Database | PostgreSQL + pgvector | JSONB for flexible product data, vectors for semantic search |
| State management | Zustand | Lightweight, TypeScript-friendly, minimal bundle impact |
| Caching | Redis | Multi-purpose (cache, sessions, rate limiting) |
