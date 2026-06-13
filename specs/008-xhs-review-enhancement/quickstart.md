# Quickstart: 小红书评论采集完善

**Feature**: 008-xhs-review-enhancement | **Date**: 2026-06-01

## Prerequisites

- Python 3.11+, Node.js 18+, PostgreSQL 15
- 小红书 Cookie 已配置: `XHS_COOKIE` 环境变量
- DashScope API Key 已配置: `DASHSCOPE_API_KEY` 环境变量
- 已有 SPU 数据（`brand` 和 `name` 字段有值）

## Quick Start

### 1. 数据库迁移

```bash
cd backend
alembic upgrade head
# 新增 ai_review_summary 列到 spus 表
```

### 2. 启动后端

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 启动管理后台

```bash
cd admin
pnpm dev
# 打开 http://localhost:5173，进入 SPU 管理页
```

### 4. 触发采集

1. 登录管理后台
2. 导航到 "SPU 管理" 页面
3. 找到目标 SPU，点击操作列中的 "评论采集" 按钮
4. 等待采集完成（约 1-2 分钟），页面显示 "已采集 N 条评论"

### 5. 查看结果

**管理后台**: 可在 Reviews 管理页查看采集的评论数据。

**小程序端**: 打开 SPU 详情页 → 点击 "真实评价" tab → 查看 AI 总结和笔记列表。

## Testing

### 后端测试

```bash
cd backend
pytest tests/test_xhs_collect_spu.py -v

# 或测试特定场景
pytest tests/ -k "xhs_collect" -v
```

### API 测试

```bash
# 手动触发采集 (需要 admin token)
curl -X POST http://localhost:8000/v1/admin/spus/1/xhs-collect \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 查询采集状态
curl http://localhost:8000/v1/admin/spus/1/xhs-collect/status?job_id=1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 获取 SPU 评价
curl http://localhost:8000/v1/spus/1/reviews?page=1
```

### 自动清理旧定时任务

```bash
# 验证 daily_review_fetch 已从 scheduler 移除
grep -r "daily_review_fetch" backend/app/scheduler/  # 应无匹配
```

## Key Files

| File | Role |
|------|------|
| `backend/app/services/xhs_collector.py` | XHS 采集核心逻辑 |
| `backend/app/services/llm_analyzer.py` | LLM 单条分析 + 聚合总结 |
| `backend/app/api/v1/admin_collect.py` | Admin API 端点 |
| `backend/app/api/v1/spus.py` | Mini-program SPU/Review API |
| `backend/app/scheduler/jobs.py` | 定时任务（移除 daily_review_fetch） |
| `admin/src/pages/Spus/index.tsx` | 管理后台 SPU 列表页 |
| `frontend/src/pages/product/detail.tsx` | 小程序 SPU 详情 + 评价 tab |
