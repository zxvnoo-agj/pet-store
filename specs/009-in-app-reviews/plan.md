# Implementation Plan: 自建用户评价功能

**Branch**: `009-in-app-reviews` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-in-app-reviews/spec.md`

## Summary

将评价体系从依赖小红书自动采集扩展为产品内自建评价池。小程序用户可对 SPU 提交文字评价，默认进入审核中状态；后台支持按来源和状态筛选、审核用户评价、添加运营整理评价；小程序评价页统一展示所有已审核来源的"真实评价"，并保留 AI 总结能力。现有 `reviews` 表、SPU 评价页、后台评价审核页和 008 的 AI 总结流程将被复用并修正为 SPU 维度、多来源评价模型。

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend/admin)  
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 async, Pydantic v2, Loguru, Taro 3.x + React 18 + Zustand, React + Vite + TailwindCSS (admin)  
**Storage**: PostgreSQL 15 (`reviews`, `spus`, `users`) + optional Redis cache for hot SPU data  
**Testing**: pytest + pytest-asyncio for backend unit/integration/contract tests; TypeScript build checks and manual WeChat DevTools acceptance for mini-program UI  
**Target Platform**: Linux backend API, WeChat Mini Program, browser-based admin panel  
**Project Type**: Web service + mini-program + admin web application  
**Performance Goals**: review list first page < 2s with 50 reviews; admin approve/reject < 10s user workflow; non-streaming API p95 < 200ms where cache/DB load allows  
**Constraints**: page_size <= 100; user review text <= 500 chars; one user review per SPU; no image upload in this version; no table deletion; mini-program must not use `process.env`  
**Scale/Scope**: Initial scope covers ~100 SPUs, four review sources, text-only user submissions, admin moderation and summary regeneration hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **类型安全**: Plan includes Pydantic request/response schemas, `ReviewSource`/`ReviewStatus` enums, and frontend TypeScript interfaces for review submission/listing.
- [x] **测试覆盖**: Plan covers backend unit tests for validation/sensitive words, integration tests for submit/review/admin flows, and API contract tests for mini-program/admin endpoints.
- [x] **UX 一致性**: Mini-program work extends the existing product review tab with NutUI/Taro patterns and current design tokens; admin work extends the existing Reviews page.
- [x] **性能影响**: Review list remains paginated, ordered by indexed fields; duplicate checks use `(spu_id, user_id, source)` semantics; summary generation remains asynchronous/admin-triggered.
- [x] **可观测性**: Moderation, duplicate submission, admin approval/rejection, and summary regeneration will log structured events with user/admin/review/SPU identifiers.

## Project Structure

### Documentation (this feature)

```text
specs/009-in-app-reviews/
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
├── alembic/versions/                   # add review source/status/check constraints and reject reason if needed
├── app/
│   ├── api/v1/
│   │   ├── spus.py                     # extend GET reviews, add POST user review, include pending self card
│   │   ├── admin_reviews.py            # fix SPU relationship, source/status filters, reject reason, admin seed create
│   │   └── admin_collect.py            # save XHS auto reviews as source=xhs_auto
│   ├── models/review.py                # explicit source/status semantics, rejection metadata if required
│   ├── schemas/review.py               # ReviewCreate/UserReview/AdminReview contracts
│   └── services/
│       ├── review_service.py           # unified real review query, duplicate prevention, user submission
│       ├── sensitive_words.py          # local keyword matcher
│       └── llm_analyzer.py             # aggregate all approved sources
├── data/
│   └── sensitive_words.txt             # local Chinese sensitive-word seed list
└── tests/
    ├── unit/test_review_service.py
    ├── unit/test_sensitive_words.py
    ├── integration/test_in_app_reviews.py
    └── contract/test_review_api_contract.py

admin/
└── src/
    ├── pages/Reviews/index.tsx          # source/status filters, approval reject reason, add admin seed dialog
    └── services/api.ts                  # admin review create/reject/regenerate calls

frontend/
└── src/
    ├── pages/product/detail.tsx         # unified real reviews, write-review entry, pending self card
    ├── pages/product/review-create.*    # text-only review submission page if separated from detail
    └── services/api.ts                  # review list and submit contracts
```

**Structure Decision**: Use the existing three-surface architecture (`backend`, `frontend`, `admin`). Reuse `reviews` as the canonical table rather than adding a separate review pool, because the model already links `spu_id`, `user_id`, `status`, `source`, rating, content, recommendation and AI fields.

## Complexity Tracking

No constitution violations are expected. The only schema expansion is additive/constraint-oriented and avoids deleting tables.
