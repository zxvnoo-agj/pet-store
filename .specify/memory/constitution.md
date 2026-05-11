<!--
SYNC IMPACT REPORT
Version: 0.0.0 → 1.0.0
Modified principles: N/A (initial creation)
Added sections:
  - I. Type Safety & Static Analysis
  - II. Test-Driven Quality
  - III. Cross-Platform UX Consistency
  - IV. Performance by Design
  - V. Observability & Data Integrity
  - Technical Stack Requirements
  - Development Workflow & Quality Gates
  - Governance
Removed sections: N/A
Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check section aligned)
  - ✅ .specify/templates/spec-template.md (aligned with testing/UX principles)
  - ✅ .specify/templates/tasks-template.md (aligned with testing/performance task types)
  - ⚠️ .specify/templates/commands/*.md (directory does not exist, no action needed)
Follow-up TODOs: None
-->

# 宠物用品选购助手小程序 Constitution

## Core Principles

### I. Type Safety & Static Analysis

- **前端** MUST 启用 TypeScript 严格模式 (`strict: true`)，禁止隐式 `any`。
- **后端** MUST 为所有函数参数、返回值和 Pydantic 模型添加完整的类型注解。
- **静态检查** MUST 在 CI 中运行 ESLint (前端) 和 Ruff + Pyright/mypy (后端)，零错误方可合并。
- **数据契约** MUST 通过 Pydantic v2 模型定义所有 API 请求/响应，拒绝运行时类型不一致。

**Rationale**: 类型安全是代码质量的第一道防线。Taro + FastAPI 的生态系统原生支持强类型，利用类型系统可在编译/静态分析阶段消除大量缺陷。

### II. Test-Driven Quality

- **测试策略** MUST 覆盖三层：单元测试（业务逻辑）、集成测试（模块交互）、契约测试（API 接口）。
- **覆盖率门槛** MUST 达到行覆盖率 ≥ 80%，核心服务层 ≥ 90%；未达标代码禁止合并。
- **API 契约** MUST 与 OpenAPI 规范保持一致；任何接口变更 MUST 同步更新契约测试。
- **回归保护** MUST 在每次 PR 中运行完整测试套件；失败的测试 MUST 在合并前修复。

**Rationale**: 宠物用品数据涉及多源采集与 NLP 处理，逻辑复杂。测试是防止数据流水线回归和 Agent 推理错误的唯一可靠手段。

### III. Cross-Platform UX Consistency

- **设计系统** MUST 基于 NutUI-React 组件库，禁止绕过设计令牌（Design Tokens）自行硬编码样式。
- **多端一致性** MUST 保证微信小程序与后续 H5/APP 扩展在色彩、字体、间距、交互模式上保持一致。
- **响应式适配** MUST 支持不同屏幕尺寸的安全区域与刘海屏适配。
- **无障碍** SHOULD 遵循 WCAG 2.1 AA 标准，确保关键交互可被辅助技术访问。

**Rationale**: 用户以养宠新手为主，一致、直观的界面能降低学习成本，建立品牌信任感。

### IV. Performance by Design

- **小程序体积** MUST 主包体积 < 2MB，采用 Tree Shaking、代码分割与懒加载。
- **API 响应** MUST 非流式接口 p95 延迟 < 200ms；流式 SSE 首字节时间 (TTFB) < 500ms。
- **数据库查询** MUST 避免 N+1 查询；所有列表查询 MUST 携带合理的分页上限（page_size ≤ 100）。
- **缓存策略** MUST 对热点数据（商品列表、分类树）实施 Redis 缓存，TTL 根据业务敏感度设定（默认 300s）。
- **并发控制** MUST 对第三方 API 调用实施限流与熔断（如 asyncio.Semaphore），防止级联故障。

**Rationale**: 小程序运行在移动网络环境，性能直接影响用户留存。Agent 对话的流式体验对延迟尤为敏感。

### V. Observability & Data Integrity

- **结构化日志** MUST 使用 Loguru 输出 JSON 格式日志，包含 request_id、user_id、耗时等追踪字段。
- **监控告警** MUST 通过 Prometheus + Grafana 采集关键指标（QPS、P95 延迟、错误率、AI Token 消耗）。
- **数据验证** MUST 在应用层（Pydantic）、ORM 层（SQLAlchemy）和数据库层（CHECK 约束）三级校验数据。
- **隐私合规** MUST 遵循《个人信息保护法》；用户对话记录保留 30 天后自动清理；敏感配置 MUST 通过环境变量注入。

**Rationale**: 系统涉及用户隐私数据、电商数据采集和 LLM 调用，可观测性与合规性是生产运营的底线。

## Technical Stack Requirements

- **前端**: Taro 3.x + React 18 + TypeScript 5.x + NutUI-React + Zustand
- **后端**: Python 3.11+ + FastAPI 0.110+ + SQLAlchemy 2.0 (async) + Pydantic v2 + LangChain
- **数据存储**: PostgreSQL 15 (含 PGVector) + Redis 7 + Meilisearch (可选)
- **基础设施**: Docker + Docker Compose (开发) / Kubernetes (生产) + GitHub Actions + Prometheus/Grafana + Loki
- **版本控制**: Git，主干开发或功能分支模型；所有代码变更 MUST 通过 Pull Request 合并

## Development Workflow & Quality Gates

- **代码审查** MUST 由至少一名维护者审查通过；审查清单包括：类型安全、测试覆盖、性能影响、安全漏洞。
- **CI 门禁** MUST 在 PR 阶段执行：lint → type-check → test → build；任一阶段失败即阻断合并。
- **文档同步** MUST 在接口变更时同步更新 OpenAPI 文档和设计文档；代码与文档不一致视为缺陷。
- **Agent 提示词版本控制** MUST 将 System Prompt 纳入版本控制；提示词变更 MUST 经过 A/B 测试或人工评估。

## Governance

- **宪法至上**: 本 Constitution 的优先级高于任何其他开发实践或临时决策。
- **修订程序**: 任何原则修订 MUST 提交书面提案，说明理由、影响范围与迁移计划；经维护者团队多数同意后生效。
- **版本控制**: 遵循语义化版本（SemVer）。MAJOR = 原则移除或重新定义；MINOR = 新增原则或重大扩展；PATCH = 措辞澄清。
- **合规审查**: 每季度审查一次原则遵守情况，审查结果记录于 `.specify/memory/constitution-review.md`。

**Version**: 1.0.0 | **Ratified**: 2026-05-11 | **Last Amended**: 2026-05-11
