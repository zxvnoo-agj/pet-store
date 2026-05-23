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
│   └── 006_add_listing_detail_fields.py  # ALTER: spu_listings add goods_sign, sku_specs, service_tags
├── app/
│   ├── models/
│   │   ├── favorite.py        # ALTER: product_id → spu_id
│   │   ├── review.py          # ALTER: product_id → spu_id
│   │   ├── chat.py            # ALTER: referenced_products → referenced_spus
│   │   ├── spu_listing.py     # ALTER: add goods_sign, sku_specs, service_tags columns
│   │   └── product.py         # DROP: 删除 Product 模型
│   ├── schemas/
│   │   ├── product.py         # DROP: 删除 Product schemas
│   │   └── spu.py             # MODIFY: 添加小程序端需要的 SPUListResponse / SPUDetailResponse
│   ├── api/v1/
│   │   ├── products.py        # DROP: 删除或重写为 spus.py
│   │   ├── spus.py            # NEW: 小程序端 SPU API（列表、详情、搜索、商品链接）
│   │   ├── favorites.py       # MODIFY: 收藏操作改为 spu_id
│   │   ├── reviews.py         # MODIFY: 评价操作改为 spu_id
│   │   ├── chat.py            # MODIFY: AI 助手商品检索改为 SPU
│   │   └── search.py          # MODIFY: 搜索结果改为 SPU
│   ├── services/
│   │   ├── product_service.py # DROP: 删除 ProductService
│   │   ├── spu_service.py     # MODIFY: 添加小程序端需要的查询方法、商品链接查询
│   │   ├── spu_listing_service.py  # MODIFY: 采集流程补充 detail API 调用
│   │   ├── promotion_url_service.py # MODIFY: 支持 Redis + PostgreSQL 双层缓存
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
5. **商品链接功能**: 新增按需推广链接生成（Redis 1h + PostgreSQL 12h 双层缓存），采集流程补充调用 `pdd.ddk.goods.detail` 获取 SKU 规格和 goods_sign
6. **多平台价格对比暂不实现**: 当前仅对接 PDD API，商品链接栏仅展示 PDD 购买入口，不做跨平台比价

## Phase 1: Design (Completed)

### Data Model

See [data-model.md](data-model.md).

- `spus`: 004 已创建，无 schema 变更
- `spu_listings`: **ALTER** — 新增 `goods_sign`, `sku_specs`, `service_tags` 字段
- `favorites`: **ALTER** — `product_id` → `spu_id`
- `reviews`: **ALTER** — `product_id` → `spu_id`
- `chat_messages`: **ALTER** — `referenced_products` → `referenced_spus`
- `products`: **DROP** — 完全删除

### API Contracts

See [contracts/api-contracts.md](contracts/api-contracts.md).

**新增/修改的小程序端 API** (prefix `/v1/`):
- SPU 列表: `GET /spus` (替代 `/products`)
- SPU 详情: `GET /spus/{id}` (替代 `/products/{id}`)
- SPU 搜索: `GET /search` (返回 SPU 结果)
- **商品链接**: `GET /spus/{id}/links` — 返回该 SPU 的购买链接列表
- **推广链接**: `POST /spus/{id}/promotion-url` — 按需生成推广链接
- 收藏: `POST/DELETE /favorites`, `GET /favorites` (改为 spu_id)
- 评价: `POST/GET /reviews` (改为 spu_id)
- AI 助手: `POST /chat` (内部检索改为 SPU)

**删除的 API**:
- `GET /products`, `GET /products/{id}` — 由 `/spus` 替代

### 商品链接功能设计

**缓存策略**:
- **Redis (L1)**: `promo:{goods_sign}:{pid}` → TTL 1小时
- **PostgreSQL (L2)**: PromotionUrlCache 表 → TTL 12小时
- **Fallback**: 缓存未命中 → 调用 PDD API `pdd.ddk.goods.promotion.url.generate`

**采集流程增强**:
1. `pdd.ddk.goods.search` 获取商品列表
2. `pdd.ddk.goods.detail` 获取商品详情（goods_sign, sku_list, service_tags）
3. LLM 匹配 → 关联 SPU
4. 更新 `spu_listings.goods_sign`, `sku_specs`, `service_tags`

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
2. Implement database migrations:
   - `alembic revision -m "005_spu_migration"` (drop products, alter favorites/reviews/chat_messages)
   - `alembic revision -m "006_add_listing_detail_fields"` (spu_listings add goods_sign, sku_specs, service_tags)
3. Implement backend models, schemas, services, API routes migration
4. **Implement product links feature**:
   - Update SpuListingService to call `pdd.ddk.goods.detail` during collection
   - Update PromotionUrlService to support Redis + PostgreSQL dual caching
   - Add `GET /spus/{id}/links` endpoint
   - Add `POST /spus/{id}/promotion-url` endpoint
5. Implement frontend pages and components migration
6. **Update frontend product detail page**: Add "Product Links" tab with SKU specs and purchase buttons
7. Update AI assistant AgentTools to use SpuService
8. Run tests and verify against spec acceptance criteria

## Phase 3: Bug Fixes & UX Polish

### Issue: 商品链接 API 返回 500（`service_tags` 类型不匹配）

**根因**: `SpuMiniProgramListingResponse.service_tags: list[str]` 与 DB 中存储的整数数组（如 `[2, 13, 15]`）类型冲突，Pydantic v2 校验抛异常。

**修复**: `backend/app/schemas/spu.py:131` — 将 `service_tags: list[str] = []` 改为 `service_tags: list[int | str] = []`。

### Issue: 小程序详情页图片占比过大

**文件**: `frontend/src/pages/product/detail.tsx:243-245`

**当前**: `<View className="aspect-square">` — 全宽正方形大图，信息密度低。

**修复**: 改为默认 `max-h-[50vh] overflow-hidden`，底部叠加"展开查看完整图片"按钮，点击后显示全图。

### Issue (可选): Service Tags 友好显示

`service_tags` 当前显示整型 ID（如 `2,13,15`）不直观。如需要可加映射表转换：
- 2 → "包邮"
- 13 → "官方店铺"  
- 15 → "品牌好货"
- 24 → "隔日达"

**文件**: `frontend/src/pages/product/detail.tsx` — listings 卡片渲染处将 ID 映射为中文标签。
