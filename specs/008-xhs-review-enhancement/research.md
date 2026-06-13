# Research Notes: 小红书评论采集完善

**Feature**: 008-xhs-review-enhancement | **Date**: 2026-06-01

## 1. API 端点重构：Product → SPU

**Decision**: 新增 `POST /v1/admin/spus/{spu_id}/xhs-collect` 端点，旧 `POST /v1/admin/collect/products/{product_id}/xhs-collect` 移除。

**Rationale**: 系统已迁移至 SPU 维度，Review 表的 product_id 已重命名为 spu_id。Product 表即将废弃。新端点直接查询 SPU 模型，复用现有 `_run_xhs_collection` 逻辑，将其参数从 `Product` 改为 `Spu`。

**Alternatives considered**:
- 修改旧端点参数名 → 与 Product 模型耦合，不如新开
- 保留旧端点作为别名 → 增加维护负担

## 2. 定时任务移除

**Decision**: 删除 `backend/app/scheduler/jobs.py` 中的 `daily_review_fetch` 函数及对应的 `CronTrigger(hour=3)` 注册。

**Rationale**: 根据 spec 澄清（Q1），评论采集改为纯手动触发。旧定时任务存在已知缺陷（不调用 LLM 分析，仅覆盖前20商品）。移除后管理员通过后台按需触发更可控。

**Alternatives considered**:
- 保留定时任务作为补充 → 用户明确选择删除
- 改为手动加入队列后定时执行 → 复杂度高，无必要

## 3. SPU 模型变更：AI 总结字段

**Decision**: 在 `spus` 表新增 `ai_review_summary` 列（JSONB, nullable），存储聚合分析结果。

**Rationale**: SPU 已有的 `pros`/`cons` 字段是从单条 Review 汇总的标签数组，而 AI 总结是 LLM 直接生成的综合性文字内容（整体优缺点、推荐率、一句话总结），结构不同，分开存储更清晰。

**Schema**:
```json
{
  "overall_pros": ["颗粒大小适中", "适口性好"],
  "overall_cons": ["价格偏高"],
  "recommendation": "推荐",
  "recommend_rate": 0.85,
  "summary": "大部分用户反馈适口性好，猫咪爱吃，但价格偏高",
  "generated_at": "2026-06-01T12:00:00Z",
  "review_count": 15
}
```

**Alternatives considered**:
- 复用 `pros`/`cons` 字段 → 无法存储自然语言总结和推荐率
- 新建独立表 `spu_ai_summaries` → 一对一关系，过度设计

## 4. LLM 聚合总结

**Decision**: 在 `backend/app/services/llm_analyzer.py` 新增 `generate_spu_summary(reviews: list[dict])` 函数，接受该 SPU 所有 LLM 分析结果，调用 LLM 生成聚合总结。

**Rationale**: 与现有单条分析函数 `analyze_review` 在同一模块，共享 LLM 客户端配置。输入为已分析的 Review 数据（包含每条笔记的 pros/cons/recommendation/content 摘要），让 LLM 从整体角度归纳共性和分歧。

**Prompt 设计**:
```
你是宠物用品评价分析专家。以下是对同一商品的多条小红书笔记分析结果：
{各条笔记的分析摘要}
请综合分析所有评价，返回 JSON：
- overall_pros: 整体优点标签数组
- overall_cons: 整体缺点标签数组
- recommendation: "推荐"/"不推荐"/"中性"
- recommend_rate: 推荐占比 0.0-1.0
- summary: 一句话总结（50字以内）
```

**Alternatives considered**:
- 直接传原始笔记内容给 LLM → Token 消耗过大（20条×2000字）
- 用数学统计代替 LLM → 无法生成自然语言总结

## 5. 管理后台按钮集成

**Decision**: 在 `admin/src/pages/Spus/index.tsx` 的表格操作列中，新增"评论采集"按钮（使用 Search/RefreshCw 图标），点击后调用 `triggerXHSForSpu(spu.id)`。

**Rationale**: 管理员需要逐 SPU 触发采集，列表页是最高效的操作位置。按钮放在现有的编辑/删除按钮旁边，保持 UI 一致性。点击后调用异步 API，即时返回 job_id，后续可查询状态。

**状态显示**: 按钮点击后变为 loading 状态，完成后显示 "已采集 N 条" toast。失败时显示错误 toast。

**Alternatives considered**:
- 在 SPU 详情页添加按钮 → 操作路径长，需进入每个 SPU 详情
- 批量触发（勾选多个 SPU）→ spec 未要求，且并发限制复杂

## 6. 小程序端评价展示

**Decision**: 扩展现有的 SPU 详情页 `frontend/src/pages/product/detail.tsx` 的"评价"tab，或新增独立评价页。采用扩展现有 tab 的方式，但重构内容为：顶部 AI 总结卡片 + 笔记卡片列表。

**Reasoning**: 当前评价 tab 展示的是用户提交的评论（user review），需替换为小红书笔记展示。保留"真实评价" tab 名但内容更新为：AI 总结区 + 笔记卡片。每张卡片显示笔记正文、作者、点赞数、发布时间，点击展开前 10 条评论。

**UI 设计**:
- AI 总结卡片：渐变背景，显示整体优缺点标签 + 推荐率 + 一句话总结
- 笔记卡片：白色卡片，正文(>200字折叠)、作者昵称+头像占位、点赞数、小红书原文链接
- 评论折叠：`Text` 点击触发 `showComments` 状态切换

**Alternatives considered**:
- 新建独立评价页 `reviews.tsx` → 增加路由配置，当前 tab 模式足够
- 与现有用户评论混排 → 来源不同，体验差

## 7. 部分成功处理

**Decision**: 采集过程中每条笔记独立 try/except，失败时记录日志但继续下一条。最终 `_run_xhs_collection` 返回成功数和失败原因列表。数据库 job 状态设置 "partial_success" 而非 "failed"。

**Rationale**: Spec 澄清（Q3）要求保存已采集部分。实现方式是在 `collect_product_reviews` 中独立处理每条笔记，用 `collected`/`failed` 列表分别跟踪。任务结束时根据两者状态决定 job status。

**Job 状态枚举更新**: `pending`, `running`, `completed`, `partial_success`, `failed`

**Alternatives considered**:
- 全局 try/except → 一条失败全回滚，不满足需求
- 自动重试 → spec 未要求，管理员手动重新触发即可补全

## 8. 迁移策略

**Decision**: 使用 Alembic 生成 migration，添加 `ai_review_summary` 列到 `spus` 表（nullable, default NULL），无数据迁移需求。

**Rationale**: 新字段为可选，现有 SPU 不受影响。不影响已有 Review 数据。采集功能上线后逐步填充。

**Alternatives considered**: 无。
