# Implementation Plan: Goods Module SPU Refactor

**Branch**: `004-refract-goods` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/004-refract-goods/spec.md`

## Summary

重构商品模块，将原有的平铺式商品列表（每个电商平台 listing 一条记录）改造为 **SPU（Standard Product Unit）聚合模式**。以 品牌-种类-商品名称+型号 作为唯一标识，将多个电商平台的卖家 listing 聚合到同一个 SPU 下，展示统一的价格区间、详细属性（成分、营养、优缺点）和链接列表。

核心技术方案：
- 新建 `spus` 表存储标准商品定义（核心属性固定 + `extra_attrs` 扩展）
- 新建 `spu_listings` 表存储电商平台链接（多对一关联 SPU）
- 保留现有 `products` 表不变，确保 001/002 功能向后兼容
- LLM 语义匹配自动关联 listing 至 SPU，三级置信度分流策略
- 重构 admin 前端：SPU 列表卡片、详情页（属性/链接/历史）、匹配审核队列

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (admin frontend)  
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 (async), Pydantic v2, Taro 3.x + React 18 + NutUI-React (admin), Zustand  
**Storage**: PostgreSQL 15 (含 PGVector), Redis 7  
**Testing**: pytest (backend), Vitest/Jest (frontend)  
**Target Platform**: Web admin panel (桌面端浏览器)  
**Project Type**: Web application (admin + API service)  
**Performance Goals**: SPU 列表页 p95 < 200ms；匹配任务支持 100 listing/批次  
**Constraints**: 价格区间实时计算（listing 变更触发）；匹配异步执行（LLM 延迟可接受）  
**Scale/Scope**: 预期 SPU 数量 1k-10k，单个 SPU 下 listing 数量 5-50

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

基于项目宪法原则，每个功能实现计划 MUST 验证以下检查项：

- [x] **类型安全**: 后端使用 Pydantic v2 定义所有 API 请求/响应模型；前端 TypeScript 严格模式。SPU 和 Listing 的 schema 将完整定义类型。
- [x] **测试覆盖**: 规划单元测试（SPU CRUD、价格计算）、集成测试（匹配流程）、契约测试（API 响应格式）。预期核心服务层覆盖率 ≥ 90%。
- [x] **UX 一致性**: Admin 前端基于 NutUI-React 设计系统；SPU 卡片、详情页、审核队列遵循现有组件规范。
- [x] **性能影响**: SPU 列表使用 JOIN + COUNT 聚合，需评估并添加必要索引；价格区间采用物化字段避免实时计算；匹配任务异步执行。
- [x] **可观测性**: 匹配任务通过 `data_fetch_jobs` 记录执行日志；结构化日志记录 SPU 变更和匹配决策。

## Project Structure

### Documentation (this feature)

```text
specs/004-refract-goods/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-contracts.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── alembic/versions/          # 004 migration: spus + spu_listings
├── app/
│   ├── models/
│   │   ├── spu.py             # SPU ORM model
│   │   └── spu_listing.py     # Listing ORM model
│   ├── schemas/
│   │   ├── spu.py             # SPU Pydantic schemas
│   │   └── spu_listing.py     # Listing Pydantic schemas
│   ├── api/v1/admin/
│   │   └── goods.py           # SPU + Listing + Matching Queue API
│   ├── services/
│   │   ├── spu_service.py     # SPU CRUD + price recalculation
│   │   ├── spu_listing_service.py  # Listing CRUD
│   │   └── spu_matching_service.py # LLM matching + confidence scoring
│   └── utils/
│       └── price_utils.py     # Price range calculation
│
admin/src/
├── pages/
│   ├── Spus/                  # SPU list + detail (refactored from Products)
│   │   ├── index.tsx          # SPU list page
│   │   ├── Detail.tsx         # SPU detail (tabs: info/listings/history)
│   │   └── components/
│   │       ├── SpuCard.tsx    # SPU aggregation card
│   │       ├── SpuForm.tsx    # Create/edit SPU form
│   │       └── ListingTable.tsx
│   └── MatchingQueue/         # NEW: matching review queue
│       ├── index.tsx
│       └── components/
│           ├── CandidateList.tsx
│           └── UnmatchedList.tsx
├── services/
│   └── spuApi.ts              # SPU API client
└── stores/
    └── spuStore.ts            # Zustand store for SPU state
```

**Structure Decision**: Web application structure (backend + admin frontend). Backend follows existing FastAPI project layout; admin frontend adds new pages alongside existing Product/Collection pages. Existing `products` endpoints remain unchanged.

## Complexity Tracking

> No Constitution Check violations requiring justification.

## Phase 0: Research (Completed)

See [research.md](research.md) for detailed decisions.

Key decisions:
1. **Two-table approach**: New `spus` + `spu_listings` tables rather than modifying `products`
2. **LLM-based matching**: GPT-4o-mini for semantic listing-to-SPU matching
3. **Manual seeding**: Admin promotes existing products to SPUs rather than auto-migration
4. **Materialized price range**: `price_min`/`price_max` stored on SPU table, recalculated on listing changes

## Phase 1: Design (Completed)

### Data Model

See [data-model.md](data-model.md).

- `spus`: 18 columns, UNIQUE(brand, category_id, name, model)
- `spu_listings`: 16 columns, FK → spus.id, UNIQUE(platform, goods_id)
- Existing `products` table: **no changes**

### API Contracts

See [contracts/api-contracts.md](contracts/api-contracts.md).

**New endpoints** (prefix `/api/v1/admin/goods/`):
- SPU CRUD: `GET/POST /spus`, `GET/PUT/DELETE /spus/{id}`
- Listings: `GET /spus/{id}/listings`, `POST /listings/{id}/link`, `POST /listings/{id}/unlink`
- Matching Queue: `GET /matching-queue`, `POST /matching-queue/confirm`, `POST /matching-queue/reject`
- Import: `POST /listings/import`, `GET /jobs/{id}`

### Quick Start

See [quickstart.md](quickstart.md).

---

## Re-evaluated Constitution Check (Post-Design)

- [x] **类型安全**: SPU schemas 使用 Pydantic v2 BaseModel，所有字段类型明确
- [x] **测试覆盖**: 规划包含 CRUD 单元测试、匹配集成测试、价格计算测试
- [x] **UX 一致性**: Admin 新页面复用现有 NutUI-React 组件（Card, Table, Dialog, Tabs）
- [x] **性能影响**: 物化价格区间 + 数据库索引（brand, category_id, status）保障列表查询性能
- [x] **可观测性**: 匹配结果通过 `data_fetch_jobs` 记录；SPU 变更记录 admin action log

所有检查项通过，设计符合宪法要求。

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement database migration (`alembic revision -m "004_spu_refactor"`)
3. Implement backend models, schemas, services, API routes
4. Implement admin frontend pages and components
5. Run tests and verify against spec acceptance criteria
