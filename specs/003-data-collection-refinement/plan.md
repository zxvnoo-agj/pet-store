# Implementation Plan: Data Collection Refinement

**Branch**: `003-data-collection-refinement` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-data-collection-refinement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Refactor the product data ingestion pipeline to replace Playwright-based scraping with a third-party crawler tool. Operators manually execute the crawler which outputs txt files to `pet-store/pdd/`. This feature builds: (1) a synchronous txt file import into a new `crawled_products` table, (2) integration into the strategy search pipeline where discovered products are matched against crawled data by goods_id, (3) LLM-based structured field extraction from crawled content, and (4) goods.detail API fallback for missing fields. For matched products, this new pipeline replaces 002's PDD detail + LLM enrichment path. Existing products retain current data; only post-deployment strategy searches use the new pipeline.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 (async), Pydantic v2, LangChain, chardet (encoding detection)
**Storage**: PostgreSQL 15 (existing)
**Testing**: pytest (asyncio_mode=auto), pytest-asyncio
**Target Platform**: Linux server (Docker)
**Project Type**: web application (backend + admin frontend)
**Performance Goals**: 50 txt files imported within 5 min (SC-001); LLM extraction p95 ≤ 60s per product (SC-005 budget); goods_id matching ≤ 10ms per 100 records (SC-003)
**Constraints**: No modification of existing product attribute columns (FR-009); txt files stored in `pet-store/pdd/` directory; import runs synchronously (FR-001)
**Scale/Scope**: ~500 products in catalog; new `crawled_products` table; 2 new API endpoints; integration with existing strategy search flow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

基于项目宪法原则，每个功能实现计划 MUST 验证以下检查项：

- [x] **类型安全**: 新模型 `CrawledProduct` 使用 SQLAlchemy Column + Pydantic schema；导入/匹配/提取所有服务函数参数/返回值完整类型注解；Ruff + Pyright 零错误
- [x] **测试覆盖**: 规划单元测试（txt解析器、编码检测、字段映射）、集成测试（导入流程、匹配流程、LLM提取流程）、契约测试（新API端点）；目标覆盖率 ≥ 80%
- [x] **UX 一致性**: 管理后台新页面（导入结果、提取日志）复用 NutUI-React + 现有 admin 布局模式；不影响小程序用户端
- [x] **性能影响**: 导入操作为同步单次触发（非高频）；匹配查询为单次 `SELECT ... WHERE goods_id IN (...)`；LLM 调用已有限流机制；新增 `crawled_products` 表需 goods_id 唯一索引
- [x] **可观测性**: 导入结果记录到日志；LLM提取/详情补全通过 FR-011 的 Enrichment Log 记录；所有操作携带 request_id + user_id 追踪字段

## Project Structure

### Documentation (this feature)

```text
specs/003-data-collection-refinement/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   └── crawled_product.py    # NEW: CrawledProduct model
│   ├── schemas/
│   │   └── crawled_product.py    # NEW: Pydantic schemas for import/enrichment
│   ├── services/
│   │   ├── txt_importer.py       # NEW: txt file scanning, parsing, import logic
│   │   ├── crawled_product_service.py  # NEW: CRUD for crawled_products
│   │   └── enrichment_service.py # NEW: match + LLM extract + goods.detail flow
│   ├── api/v1/
│   │   └── admin_crawled.py      # NEW: import + enrichment log endpoints
│   └── utils/
│       └── encoding_detector.py  # NEW: chardet-based encoding detection
├── alembic/versions/
│   └── xxxx_crawled_products.py  # NEW: migration for crawled_products table
└── tests/
    ├── unit/
    │   ├── test_txt_parser.py
    │   ├── test_encoding_detector.py
    │   └── test_crawled_product_service.py
    ├── integration/
    │   ├── test_txt_import.py
    │   └── test_enrichment_flow.py
    └── contract/
        └── test_admin_crawled_api.py
```

**Structure Decision**: Single backend project (matches existing patterns). New `crawled_products` table is additive — no existing tables modified. New API endpoints follow existing `/api/v1/admin/collect/` convention. New services follow existing service-layer patterns (e.g., `collection_service.py`, `pdd_client.py`).

## Complexity Tracking

> No constitution violations. All changes are additive within existing architecture patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
