# Implementation Plan: 首页场景快捷卡（Delta Plan）

**Branch**: `007-production-launch-prep` | **Date**: 2026-05-29 | **Spec**: [delta-spec.md](./delta-spec.md)
**Input**: Delta specification from `/specs/007-production-launch-prep/delta-spec.md`

## Summary

将首页「问问 AI 助手」橙色横幅替换为横向滑动的「场景快捷推荐」模块，提供 6 个宠物养护场景卡片。用户点击卡片后原地触发搜索 API 过滤商品列表，同时优化 SpuCard 视觉层级和首页问候语。这是一个纯前端 UI/UX 变更，不涉及后端数据模型变更。

## Technical Context

**Language/Version**: TypeScript 5.x / Taro 3.x + React 18  
**Primary Dependencies**: Taro UI, Tailwind CSS, NutUI-React (design tokens)  
**Storage**: N/A (纯前端变更，场景配置使用静态 JSON)  
**Testing**: WeChat DevTools 真机预览 + 视觉走查  
**Target Platform**: WeChat mini-program (微信小程序)  
**Project Type**: Mobile app (mini-program) — frontend UI enhancement  
**Performance Goals**: 场景卡片渲染 <100ms，搜索 API 响应 p95 <500ms  
**Constraints**: 主包体积已接近 2MB 上限，新增代码需精简；横向滚动需兼容 iOS/Android 小程序  
**Scale/Scope**: 仅影响首页 (`pages/index/index.tsx`) 和商品卡片组件 (`components/SpuCard`)

## Constitution Check

*GATE: Must pass before implementation. Re-check after code review.*

- [x] **类型安全**: 新增场景配置数据结构和组件 props 需定义完整 TypeScript 类型。
- [x] **测试覆盖**: 前端 UI 变更以真机预览测试为主，搜索过滤逻辑需验证空状态、加载状态、错误状态。
- [x] **UX 一致性**: 场景卡片使用 NutUI-React 设计令牌（圆角、间距、色彩），保持与现有首页风格一致。
- [x] **性能影响**: 搜索 API 调用需加防抖/节流，避免快速切换场景时重复请求；图片懒加载保持现有策略。
- [x] **可观测性**: 场景卡片点击事件需上报埋点（如有现有埋点体系），便于追踪点击率指标。

**No constitution violations.**

## Project Structure

### Files to Modify

```text
frontend/src/pages/index/index.tsx          # MODIFY: 移除 AI 横幅，新增场景快捷卡区域
frontend/src/components/SpuCard.tsx         # MODIFY: 优化商品卡片视觉层级
frontend/src/services/api.ts                # MODIFY: 新增搜索 API 调用方法（如尚未存在）
frontend/src/app.config.ts                  # VERIFY: 确认无需新增页面路由
```

### Files to Create

```text
frontend/src/config/scenarios.ts            # NEW: 场景卡片静态配置（各宠物类型的 6 个场景）
frontend/src/components/ScenarioCard.tsx    # NEW: 场景卡片组件（可复用）
frontend/src/components/ScenarioSection.tsx # NEW: 场景快捷推荐区域组件（含横向滑动、清除按钮）
```

## Phase 0: Research & Unknowns

### Unknowns to Resolve

| Unknown | Resolution | Status |
|---------|-----------|--------|
| 后端搜索 API 是否已支持多关键词搜索？ | 检查现有 `/v1/spus/search` 或 `/v1/spus` 接口是否支持 `keywords` 参数 | ✅ 假设已存在，如不存在需在任务中补充 |
| SpuCard 组件是否在其他页面复用？ | 检查 `SpuCard` 引用位置，确认样式调整的影响范围 | ✅ 已在 Assumptions 中声明影响可控 |
| Taro 横向滚动最佳实践 | `scroll-view` vs CSS `overflow-x`，微信小程序兼容性 | ✅ `scroll-view` 是 Taro 推荐方案 |

**Decision**: 使用 Taro `scroll-view` 组件实现横向滑动，场景配置使用静态 TypeScript 常量，搜索 API 复用现有接口或新增轻量封装。

## Phase 1: Design & Contracts

### Data Model (Frontend State)

场景模块涉及以下前端状态：

```typescript
// 场景卡片配置
interface ScenarioConfig {
  id: string;
  petType: string;        // 'cat' | 'dog' | 'bird' | ...
  icon: string;           // emoji，如 '✨'
  title: string;          // 主标题，如 '美毛亮毛'
  subtitle: string;       // 副标题，如 '鱼油 / 美毛粮'
  keywords: string[];     // 搜索关键词，如 ['鱼油', '卵磷脂', '美毛粮']
}

// 场景区域组件状态
interface ScenarioState {
  activeScenarioId: string | null;  // 当前选中的场景 ID
  isLoading: boolean;               // 搜索加载状态
  filteredSpus: Spu[];              // 过滤后的商品列表
  error: string | null;             // 错误信息
}
```

### API Contract

**搜索商品** (复用或轻量封装现有接口)

- **Endpoint**: `GET /v1/spus/search` 或 `GET /v1/spus`
- **Query Parameters**:
  - `keywords`: string (必填) — 逗号分隔的关键词列表，如 `"鱼油,卵磷脂,美毛粮"`
  - `pet_type`: string (可选) — 当前选中的宠物类型，如 `"cat"`
- **Response**: 标准 `ApiResponse<Spu[]>` 格式

### Quickstart (Developer Notes)

1. 复制 `scenarios.ts` 配置到项目中
2. 在 `index.tsx` 中引入 `ScenarioSection` 组件替换 AI 横幅
3. 实现搜索 API 调用和状态管理
4. 更新 `SpuCard` 样式
5. WeChat DevTools 预览验证横向滑动、加载状态、空状态

## Implementation Phases

### Phase 1: 基础组件搭建
- 创建 `scenarios.ts` 静态配置（猫咪 6 场景 + 其他宠物类型模板）
- 创建 `ScenarioCard` 和 `ScenarioSection` 组件
- 在 `index.tsx` 中替换 AI 横幅，接入场景区域

### Phase 2: 搜索与状态集成
- 实现场景点击 → 调用搜索 API → 更新商品列表
- 实现加载状态（skeleton/loading spinner）
- 实现空状态提示 + 「查看更多商品」入口
- 实现「清除筛选」按钮

### Phase 3: 视觉优化
- 优化 `SpuCard` 组件：标题加粗、价格右下角橙色、评分弱化
- 调整首页问候语文案
- 场景区域使用 `#FFF4EA` 浅色背景

### Phase 4: 验证与走查
- WeChat DevTools 真机预览
- 测试各宠物类型场景切换
- 测试空状态、网络异常、快速切换场景
- 确认主包体积增量 <50KB

## Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 搜索 API 响应慢导致加载等待 | 中 | 添加 loading skeleton，设置超时处理 |
| 主包体积超限 | 高 | 新组件代码精简，删除 AI 横幅代码后净增量应极小 |
| 横向滚动在低端机上卡顿 | 低 | 使用 `scroll-view` 原生实现，避免复杂 CSS transform |
| 场景关键词匹配结果为空 | 中 | 空状态引导用户清除筛选或查看更多商品 |
