# Implementation Plan: Data Collection & Enrichment Module

**Branch**: `002-data-collection-module` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-data-collection-module/spec.md`

## Summary

Build the data collection pipeline for the pet supplies mini program: integrate Pinduoduo Duoduo Jinbao API to discover and fetch product data, scrape Xiaohongshu for real user reviews, use LLM to extract structured product fields and analyze review sentiment, and schedule recurring data refresh tasks. Expose search strategy management, collection monitoring, and manual retry interfaces in the admin backend.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (admin frontend)
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 (async), aiohttp, APScheduler, LangChain, Taro 3.x (existing mini program frontend, no changes needed)
**Storage**: PostgreSQL 15 (existing — extends products/reviews tables, adds new tables)
**Testing**: pytest (backend), jest (admin frontend)
**Target Platform**: Linux server (backend), WeChat Mini Program + H5 Admin (existing platforms)
**Project Type**: web-service extension (backend) + admin UI extension
**Performance Goals**: Single product seed-to-enriched < 5min, hourly price refresh for 500 products < 30min, XHS collection 30 notes/product < 10min
**Constraints**: PDD API 2000 calls/day, XHS 500 notes/day/account, LLM token costs per extraction/analysis
**Scale/Scope**: MVP — 500 products, 2 data sources (PDD + XHS), search strategies auto-discovery as primary acquisition method

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **类型安全**: All new Pydantic schemas for PDD API responses, XHS note data, search strategies, and fetch job records defined before implementation.
- [x] **测试覆盖**: Unit tests for PDD client (mocked API), XHS collector (mocked), LLM extractor (fixture data), scheduler jobs; integration tests for full pipeline; contract tests for new admin API endpoints.
- [x] **UX 一致性**: Admin pages follow existing peach-themed design. Mini program frontend receives enriched product data via existing API — no consumer-facing UI changes needed.
- [x] **性能影响**: Async I/O for all external API calls with semaphore-based concurrency control; batch DB operations with async SQLAlchemy; no N+1 in aggregation queries. Separate worker thread/process for long-running collection tasks to avoid blocking API server.
- [x] **可观测性**: Loguru structured logging for each collection step with task_id, product_id, source; Prometheus metrics for collection success/failure rates and duration; admin badge count for failures.

## Project Structure

### Documentation (this feature)

```text
specs/002-data-collection-module/
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
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── admin_collect.py   # NEW: Admin collection management endpoints
│   ├── models/
│   │   ├── product.py             # MODIFY: add status values
│   │   ├── review.py              # MODIFY: add XHS fields
│   │   ├── data_source.py         # MODIFY: add pdd platform support
│   │   └── collection.py          # NEW: SearchStrategy, collection models
│   ├── schemas/
│   │   └── collection.py          # NEW: Pydantic schemas for collection
│   ├── services/
│   │   ├── pdd_client.py          # NEW: PDD Duoduo Jinbao API client
│   │   ├── xhs_collector.py       # NEW: XHS note/comment scraper
│   │   ├── llm_extractor.py       # NEW: LLM product field extraction
│   │   ├── llm_analyzer.py        # NEW: LLM review analysis & aggregation
│   │   └── collection_service.py  # NEW: Orchestration service
│   ├── scheduler/
│   │   ├── __init__.py            # NEW: APScheduler setup
│   │   └── jobs.py                # NEW: Scheduled jobs
│   └── utils/
│       └── http_client.py         # NEW: Shared aiohttp session with retry
├── alembic/
│   └── versions/
│       └── 003_data_collection.py # NEW: Migration for 002
└── tests/
    ├── unit/
    │   ├── test_pdd_client.py
    │   ├── test_xhs_collector.py
    │   ├── test_llm_extractor.py
    │   └── test_llm_analyzer.py
    ├── integration/
    │   └── test_collection_pipeline.py
    └── conftest.py                # MODIFY: add collection fixtures

admin/src/
├── pages/
│   ├── Collection/                # NEW: Collection management page
│   ├── Strategies/                # NEW: Search strategy management
│   └── CollectionLogs/            # NEW: Collection log viewer
└── services/
    └── api.ts                     # MODIFY: add collection API calls

frontend/                          # NO CHANGES (consumes enriched data via existing API)
```

**Structure Decision**: This feature extends the existing backend with new services and models, extends the admin frontend with new management pages, and requires no changes to the mini program frontend (which consumes enriched product/review data through existing API endpoints).

## Complexity Tracking

No constitution violations identified. All extensions align with existing patterns.

| Aspect | Decision | Justification |
|--------|----------|---------------|
| PDD client | aiohttp + custom sign algorithm | Per design doc Section 2.2; async to avoid blocking |
| XHS collection | Third-party library (xhs) or direct API | Design doc mentions `from xhs import XHS`; cookie-managed session |
| Scheduler | APScheduler 3.x (AsyncIOScheduler) | Per design doc Section 6.1; async-compatible, lightweight |
| LLM | Reuse existing LangChain setup from 001 | Constitution compliance; shared model config |
| Admin pages | Extend existing React admin pattern | Follows 001 admin structure (antd + peach theme) |
| Review author privacy | API-level filtering (FR-017) | Author field stored but stripped from public endpoints |
