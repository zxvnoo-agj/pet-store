# Implementation Plan: 小红书评论采集完善

**Branch**: `008-xhs-review-improvement` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/008-xhs-review-enhancement/spec.md`

## Summary

将小红书评论采集从原有的"Product 维度定时任务"改为"SPU 维度管理员手动触发"。管理后台 SPU 列表页新增"评论采集"按钮，点击后自动搜索小红书笔记、采集评论、逐条 LLM 分析、并聚合生成 AI 总结。小程序端新增评价详情页，顶部展示 AI 总结，下方以卡片形式展示每条笔记及折叠的前10条评论。

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend/admin)
**Primary Dependencies**: FastAPI 0.110+, SQLAlchemy 2.0 (async), Pydantic v2, LangChain (LLM), Taro 3.x + React 18 + NutUI-React + Zustand (mini-program), React + Vite + TailwindCSS (admin)
**Storage**: PostgreSQL 15 (existing: spus, reviews, data_fetch_jobs tables)
**Testing**: pytest + pytest-asyncio (backend), manual testing (frontend/admin)
**Target Platform**: Linux server (backend), WeChat Mini-Program (frontend), Web browser (admin)
**Project Type**: Web service + mini-program + admin panel
**Performance Goals**: Collection < 2 min for 20 notes, AI summary < 60s, review page render < 2s
**Constraints**: XHS API rate limit ≥ 2s between requests, max 20 notes per collection
**Scale/Scope**: ~100 SPUs total, admin-operated (manual trigger), single collection per SPU at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **类型安全**: 所有 API 端点使用 Pydantic v2 模型定义请求/响应；前端使用 TypeScript 接口定义；Ruff + ESLint 静态检查零错误
- [x] **测试覆盖**: 后端新增 `test_xhs_collect_spu.py`（单元测试 XHSCollector、集成测试采集流程、契约测试 API 端点）；前端手动测试验收场景
- [x] **UX 一致性**: 管理后台遵循 TailwindCSS + glass-card 风格；小程序端复用 NutUI-React 组件和现有设计令牌；评价卡片样式与现有评论展示一致
- [x] **性能影响**: 采集为异步后台任务（asyncio.create_task），不阻塞 API 响应；每笔记间隔 ≥ 2s 控制并发；LLM 总结为独立步骤；前端分页加载笔记
- [x] **可观测性**: 采集过程记录结构化日志（Loguru + request_id）；采集任务状态可查询；LLM 调用失败记录详细错误信息

## Project Structure

### Documentation (this feature)

```text
specs/008-xhs-review-enhancement/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
backend/
├── app/
│   ├── api/v1/
│   │   ├── admin_collect.py        # MODIFY: change product→spu, add new SPU-based endpoint
│   │   └── spus.py                 # MODIFY: add GET /spus/{id}/reviews endpoint
│   ├── models/
│   │   └── spu.py                  # MODIFY: add ai_review_summary column
│   ├── schemas/
│   │   └── review.py               # NEW: XHS review display schemas
│   ├── services/
│   │   ├── xhs_collector.py        # MODIFY: SPU-aware collect, partial success
│   │   ├── llm_analyzer.py         # MODIFY: add aggregate summary function
│   │   └── review_service.py       # NEW: review query/display service
│   └── scheduler/
│       └── jobs.py                 # MODIFY: remove daily_review_fetch job
├── alembic/versions/               # NEW: migration for ai_review_summary
└── tests/
    └── test_xhs_collect_spu.py     # NEW: SPU-based collection tests

admin/
└── src/
    ├── pages/Spus/index.tsx         # MODIFY: add "评论采集" button in operations
    └── services/api.ts              # MODIFY: add triggerXHSForSpu API call

frontend/
└── src/
    ├── pages/product/
    │   ├── detail.tsx              # MODIFY: update reviews tab to show XHS notes
    │   └── reviews.tsx             # NEW: dedicated reviews page with AI summary
    └── services/
        └── api.ts                  # MODIFY: add reviews API calls
```

## Complexity Tracking

> No violations. All changes align with existing patterns and architecture.
