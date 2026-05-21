# Implementation Plan: SPU 体系迁移（小程序端）

**Branch**: `005-spu-migration` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/005-spu-migration/spec.md`

## Summary

将小程序应用及配套后端 API 从旧的 `products` 体系完整迁移至 **SPU（Standard Product Unit）** 体系。本次迁移是 004 特性的 delta 变更，核心目标：

- 删除 `products` 表，所有业务逻辑以 `spus` 为主数据表
- 小程序端所有商品展示、搜索、分类、收藏、评价、AI 助手功能切换至 SPU
- 保证用户体验无降级，历史数据妥善处理

核心技术方案：
- 后端：修改 `favorites`、`reviews`、`chat_messages` 表，将 `product_id` 迁移为 `spu_id`
- 后端：删除 `products` 表及所有相关 service / API / schema
- 后端：AI 助手 AgentTools 从 `ProductService` 切换为 `SpuService`
- 前端：所有页面从 `product_id` 路由改为 `spu_id`，API 路径及响应字段映射调整
- 数据：迁移历史收藏、评价数据（如存在）至 SPU 关联

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (mini-program frontend)  
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 (async), Pydantic v2, Taro 3.x + React 18 + NutUI-React, Zustand  
**Storage**: PostgreSQL 15, Redis 7  
**Testing**: pytest (backend)  
**Target Platform**: 微信小程序（Taro 3.x 编译）  
**Project Type**: Web application (backend + mini-program frontend)  
**Performance Goals**: 小程序首页加载 ≤3s；AI 助手响应 ≤10s；搜索接口 p95 < 200ms  
**Constraints**: SPU 当前仅 33 条种子数据；products 表删除后不可回滚；历史会话旧链接不兼容  
**Scale/Scope**: SPU 数量从 33 逐步增长至 1k+；前端页面约 8-10 个需修改

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **类型安全**: 后端所有 schema 使用 Pydantic v2；前端 TypeScript 严格模式。迁移后所有 SPU 相关接口类型完整。
- [x] **测试覆盖**: 规划单元测试（SPU CRUD、收藏/评价迁移）、集成测试（AI 助手 SPU 查询、前端页面迁移）、契约测试（API 响应格式）。核心服务层覆盖率 ≥90%。
- [x] **UX 一致性**: 小程序前端基于 NutUI-React 设计系统；SPU 详情页展示成分/营养/优缺点信息，与原有 product 详情页结构保持一致。
- [x] **性能影响**: SPU 列表查询使用物化价格字段（price_min/max）；搜索增加全文索引；AI 助手查询限制 page_size ≤5。
- [x] **可观测性**: 迁移操作记录结构化日志；SPU 查询性能指标接入 Prometheus；AI 助手 Token 消耗可监控。

## Project Structure

### Documentation (this feature)

```text
specs/005-spu-migration/
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
├── alembic/versions/          # 005 migration: drop products, alter favorites/reviews/chat_messages
├── app/
│   ├── models/
│   │   ├── favorite.py        # ALTER: product_id → spu_id
│   │   ├── review.py          # ALTER: product_id → spu_id
│   │   ├── chat.py            # ALTER: referenced_products → referenced_spus
│   │   └── product.py         # DROP: 删除 Product 模型
│   ├── schemas/
│   │   ├── product.py         # DROP: 删除 Product schemas
│   │   └── spu.py             # MODIFY: 添加小程序端需要的 SPUListResponse / SPUDetailResponse
│   ├── api/v1/
│   │   ├── products.py        # DROP: 删除或重写为 spus.py
│   │   ├── spus.py            # NEW: 小程序端 SPU API（列表、详情、搜索）
│   │   ├── favorites.py       # MODIFY: 收藏操作改为 spu_id
│   │   ├── reviews.py         # MODIFY: 评价操作改为 spu_id
│   │   ├── chat.py            # MODIFY: AI 助手商品检索改为 SPU
│   │   └── search.py          # MODIFY: 搜索结果改为 SPU
│   ├── services/
│   │   ├── product_service.py # DROP: 删除 ProductService
│   │   ├── spu_service.py     # MODIFY: 添加小程序端需要的查询方法
│   │   ├── favorite_service.py # MODIFY: 收藏逻辑改为 spu_id
│   │   ├── review_service.py  # MODIFY: 评价逻辑改为 spu_id
│   │   └── chat_service.py    # MODIFY: AI 助手调用 SpuService
│   └── agents/
│       └── tools.py           # MODIFY: AgentTools 改为 SpuService
│
frontend/src/
├── pages/
│   ├── index/index.tsx        # MODIFY: 首页商品列表从 products 改为 SPU
│   ├── product/list.tsx       # MODIFY: 商品列表页改为 SPU
│   ├── product/detail.tsx     # MODIFY: 商品详情页展示 SPU 信息
│   ├── product/compare.tsx    # MODIFY: 对比页改为 SPU
│   ├── search/index.tsx       # MODIFY: 搜索结果改为 SPU
│   ├── category/index.tsx     # MODIFY: 分类浏览改为 SPU
│   ├── chat/index.tsx         # MODIFY: AI 助手商品卡片链接改为 SPU 详情
│   ├── mine/favorites.tsx     # MODIFY: 收藏列表改为 SPU
│   └── mine/index.tsx         # MODIFY: "我的"页面相关入口
├── services/
│   └── api.ts                 # MODIFY: API 路径和字段映射调整
├── stores/
│   ├── productStore.ts        # RENAME/MODIFY: 改为 spuStore
│   └── chatStore.ts           # MODIFY: 商品引用改为 SPU
└── components/
│   ├── ProductCard.tsx        # RENAME/MODIFY: 改为 SpuCard，字段映射调整
```

**Structure Decision**: Web application structure (backend + mini-program frontend). Backend follows existing FastAPI project layout; frontend follows Taro 3.x page-based routing.

## Complexity Tracking

> No Constitution Check violations requiring justification.

## Phase 0: Research (Completed)

Key decisions (无需额外研究，基于 004 已有实现)：
1. **直接迁移策略**: 不再保留 products 表，所有业务表（favorites, reviews, chat_messages）直接修改外键为 spu_id
2. **历史数据**: products 表已为空（当前无数据），无需数据迁移；历史会话中的旧 product 链接不兼容
3. **AI 助手切换**: AgentTools 直接替换 ProductService 为 SpuService，查询逻辑不变
4. **前端映射**: 前端页面路由从 `/pages/product/detail?id={product_id}` 改为 `/pages/product/detail?id={spu_id}`，字段名保持不变（id, name, brand, price_min, price_max 等字段在 SPU 中已存在）

## Phase 1: Design (Completed)

### Data Model

See [data-model.md](data-model.md).

- `spus`: 004 已创建，无 schema 变更
- `spu_listings`: 004 已创建，无 schema 变更
- `favorites`: **ALTER** — `product_id` → `spu_id`
- `reviews`: **ALTER** — `product_id` → `spu_id`
- `chat_messages`: **ALTER** — `referenced_products` → `referenced_spus`
- `products`: **DROP** — 完全删除

### API Contracts

See [contracts/api-contracts.md](contracts/api-contracts.md).

**新增/修改的小程序端 API** (prefix `/api/v1/`):
- SPU 列表: `GET /spus` (替代 `/products`)
- SPU 详情: `GET /spus/{id}` (替代 `/products/{id}`)
- SPU 搜索: `GET /search` (返回 SPU 结果)
- 收藏: `POST/DELETE /favorites`, `GET /favorites` (改为 spu_id)
- 评价: `POST/GET /reviews` (改为 spu_id)
- AI 助手: `POST /chat` (内部检索改为 SPU)

**删除的 API**:
- `GET /products`, `GET /products/{id}` — 由 `/spus` 替代

### Quick Start

See [quickstart.md](quickstart.md).

---

## Re-evaluated Constitution Check (Post-Design)

- [x] **类型安全**: SPU schemas 已定义完整 Pydantic 类型；前端 TypeScript 接口同步调整
- [x] **测试覆盖**: 包含 favorites/reviews 外键迁移测试、AI 助手 SPU 查询测试、前端页面契约测试
- [x] **UX 一致性**: 小程序页面结构保持不变，仅数据源切换；SPU 详情页信息更完整（成分/营养/优缺点）
- [x] **性能影响**: SPU 列表使用物化价格字段；搜索使用 PostgreSQL 全文索引；无 N+1 查询
- [x] **可观测性**: 迁移操作记录 admin action log；SPU 查询性能指标接入现有监控

所有检查项通过，设计符合宪法要求。

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement database migration (`alembic revision -m "005_spu_migration"`)
3. Implement backend models, schemas, services, API routes migration
4. Implement frontend pages and components migration
5. Update AI assistant AgentTools to use SpuService
6. Run tests and verify against spec acceptance criteria
