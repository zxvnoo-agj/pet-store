# Feature Specification: 生产上线准备

**Feature Branch**: `008-production-launch-prep`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "007特性需求为上线准备，包含上面的上线检查清单涉及到的任务"

## Clarifications

### Session 2026-05-26

- Q: 生产环境 API 域名是什么？ → A: pawpalai.cn，API 子域名为 api.pawpalai.cn，管理后台子域名为 admin.pawpalai.cn
- Q: 是否需要独立的预发布（staging）环境？ → A: 是，建立 staging 环境（staging.api.pawpalai.cn），所有变更先部署 staging 验证后再上线

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 小程序配置与域名备案 (Priority: P1)

运营人员完成微信小程序的注册、AppID 配置、域名备案和 HTTPS 证书部署，确保小程序可以正常提交审核。

**Why this priority**: 这是上线的阻塞项，没有 AppID 和 HTTPS 域名，小程序无法提交审核和发布。

**Independent Test**: 运营人员使用微信开发者工具打开项目，确认 AppID 已正确填写，API 请求成功返回数据。

**Acceptance Scenarios**:

1. **Given** 小程序项目已配置 AppID，**When** 使用微信开发者工具编译预览，**Then** 小程序正常启动，TabBar 各页面可正常跳转
2. **Given** 后端 API 已部署到生产服务器并配置 HTTPS 证书，**When** 小程序发起到生产域名的 API 请求，**Then** 请求成功并返回正确响应，无 SSL 错误
3. **Given** 生产域名已完成 ICP 备案，**When** 提交小程序审核，**Then** 审核系统不因域名未备案而拒绝

---

### User Story 2 - 后端生产/预发布环境部署 (Priority: P1)

运维人员将后端服务部署到生产环境和预发布（staging）环境，配置反向代理、数据库、缓存服务，替换所有占位符配置为正式值。所有变更先部署到 staging 验证，验证通过后再上线生产。

**Why this priority**: 后端是全部功能的基础，没有生产环境后端，前端无法正常工作。staging 环境降低上线风险。

**Independent Test**: 部署完成后分别访问 staging 和生产环境的健康检查端点，确认均返回正常。

**Acceptance Scenarios**:

1. **Given** 后端服务已部署到生产服务器，**When** 访问 `/health` 端点，**Then** 返回 `{"status": "ok"}` 状态码 200
2. **Given** 生产环境 `.env` 已配置正式密钥和凭据，**When** 调用微信登录接口，**Then** 可正常与微信服务器通信并返回 token
3. **Given** 反向代理已配置 HTTPS，**When** 使用 HTTPS 协议访问 API 端点，**Then** 返回有效响应，无证书错误
4. **Given** CORS 配置已更新为生产域名，**When** 来自生产域名的前端请求访问 API，**Then** 请求不被 CORS 拦截

---

### User Story 3 - 前端生产环境适配 (Priority: P2)

开发人员更新前端代码以适配生产环境，包括修复 API 地址、添加认证头、优化包体积、配置合法域名白名单。

**Why this priority**: 前端是用户直接接触的层，需要确保在生产环境中功能完整、体验流畅。

**Independent Test**: 使用生产构建命令构建小程序，在微信开发者工具中验证所有功能。

**Acceptance Scenarios**:

1. **Given** 前端 API 地址已更新为生产域名，**When** 小程序发起网络请求，**Then** 请求发送到正确的生产 API 地址
2. **Given** Chat SSE 请求已添加认证 Token，**When** 用户发送消息，**Then** 后端能正确验证用户身份
3. **Given** 前端构建已完成，**When** 检查主包大小，**Then** 主包体积小于 2MB
4. **Given** 图片 URL 全部使用 HTTPS 协议，**When** 小程序加载商品图片，**Then** 图片正常显示不报错
5. **Given** 微信小程序后台已配置合法域名白名单，**When** 小程序发起网络请求和文件下载，**Then** 请求不被拦截

---

### User Story 4 - 安全加固与监控 (Priority: P2)

开发人员对后端进行安全加固，配置日志、监控和告警，确保生产环境可观测性和安全性。

**Why this priority**: 生产环境必须可监控、可排错，安全加固防止数据泄露和攻击。

**Independent Test**: 验证监控指标端点可访问、错误日志可查询、安全配置生效。

**Acceptance Scenarios**:

1. **Given** 安全配置已更新，**When** 使用默认 Secret Key 尝试认证，**Then** 请求被拒绝
2. **Given** 限流中间件已配置，**When** 同一 IP 在短时间内发起大量请求，**Then** 返回 429 状态码
3. **Given** Prometheus 监控端点和日志轮转已配置，**When** 发生错误，**Then** 错误被记录到日志文件并可查询
4. **Given** Metrics 端点已添加身份验证，**When** 未授权用户访问 `/metrics`，**Then** 返回 401 或 403 状态码
5. **Given** 生产日志级别已调整为 INFO，**When** 系统正常运行，**Then** 日志不包含 DEBUG 级别信息

---

### User Story 5 - 合规与审核准备 (Priority: P3)

运营人员准备小程序审核所需的材料，包括用户隐私协议、服务协议、内容安全策略。

**Why this priority**: 合规是上线的必要条件，但不影响核心功能开发，可作为独立工作流进行。

**Independent Test**: 在小程序管理后台提交审核，验证审核是否通过。

**Acceptance Scenarios**:

1. **Given** 小程序已包含用户隐私协议页面，**When** 用户首次打开小程序，**Then** 弹窗展示隐私协议并获得用户同意
2. **Given** 小程序已提交审核，**When** 微信团队审核，**Then** 不因缺少必要协议而被拒绝
3. **Given** 数据备份策略已配置，**When** 数据库和缓存定期执行备份，**Then** 备份文件可正常恢复

### Edge Cases

- **HTTPS 证书过期**: 部署证书自动续期机制（如 Let's Encrypt），并在证书过期前发送告警
- **API 域名迁移**: 如果未来需要更换域名，应使用环境变量配置而非硬编码
- **审核被拒**: 准备审核被拒的应急预案，明确各类拒因的修复流程
- **服务降级**: 核心依赖（数据库、Redis）不可用时，系统应有降级策略而非直接返回 500

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 支持通过环境变量配置生产环境 API 域名（正式域名为 `api.pawpalai.cn`），不得硬编码域名
- **FR-002**: 前端构建 MUST 根据 `TARO_ENV` 和 `NODE_ENV` 自动选择正确的 API 地址（生产环境为 `https://api.pawpalai.cn/v1`）
- **FR-003**: Chat SSE 请求 MUST 携带用户的 Bearer Token 进行身份验证
- **FR-004**: 前端主包体积 MUST 控制在 2MB 以内，超出时需配置分包策略
- **FR-005**: 所有外部图片和资源 URL MUST 使用 HTTPS 协议
- **FR-006**: 微信小程序后台 MUST 配置 `request`、`downloadFile`、`uploadFile` 的合法域名白名单
- **FR-007**: 后端 Secret Key MUST 使用生产环境随机生成的密钥，不得使用默认值
- **FR-008**: 后端 CORS 配置 MUST 仅允许生产域名（`https://api.pawpalai.cn`、`https://admin.pawpalai.cn`）和白名单域名
- **FR-009**: 后端 MUST 配置速率限制，防止单个 IP 过度请求
- **FR-010**: 后端 Metrics 端点 MUST 添加身份验证或仅限内网访问
- **FR-011**: 后端日志 MUST 按级别分离（错误日志独立记录），生产环境日志级别为 INFO
- **FR-012**: 后端 MUST 配置 HTTPS（通过反向代理 Nginx/Caddy），开发环境除外
- **FR-013**: 生产环境 MUST 使用真实的微信 AppID 和 AppSecret 进行登录
- **FR-014**: 小程序 MUST 提供用户隐私协议页面，首次启动时弹窗获取用户同意
- **FR-015**: PostgreSQL 和 Redis MUST 配置定期数据备份策略
- **FR-016**: 生产环境和 staging 环境 MUST 配置进程管理器（如 Supervisor 或 systemd）确保后端服务崩溃后自动重启
- **FR-017**: 未使用的依赖（如 `lucide-react`）MUST 从 `package.json` 中移除以减小包体积
- **FR-018**: 系统 MUST 部署预发布（staging）环境（`staging.api.pawpalai.cn`），镜像生产环境配置，用于上线前验证

### Key Entities *(include if feature involves data)*

- **部署清单 (Deployment Checklist)**: 记录上线前所有需要完成的配置项和验证项，按领域分类（基础设施、安全、合规等）
- **环境配置 (Environment Config)**: 按环境（开发/生产）分离的配置集，包括 API 域名、密钥、凭据等敏感信息

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可在 5 分钟内完成从小程序打开到浏览商品的完整流程，无网络错误提示
- **SC-002**: 生产 API 的 p95 响应时间不超过 500ms（不含 AI 流式响应）
- **SC-003**: 主包体积控制在 2MB 以内，小程序可在 5 秒内完成冷启动加载
- **SC-004**: 系统支持 500 并发用户同时使用，不出现服务不可用
- **SC-005**: 错误监控可捕获 95% 以上的生产异常，开发团队可在 15 分钟内收到告警
- **SC-006**: 小程序一次性通过微信审核（或仅在 1 轮退回后通过）
- **SC-007**: 数据库备份可在 30 分钟内完成恢复

## Assumptions

- 生产服务器使用 Linux 系统，已安装 Docker 和 Docker Compose
- 使用 Let's Encrypt 免费 SSL 证书，通过 certbot 自动续期
- 使用 Nginx 作为反向代理处理 TLS 终结和静态文件服务
- 正式域名 `pawpalai.cn`，API 子域名 `api.pawpalai.cn`（生产）和 `staging.api.pawpalai.cn`（预发布），管理后台子域名 `admin.pawpalai.cn`
- ICP 备案流程由业务方自行处理，开发团队提供域名信息
- 微信小程序审核流程独立进行，不与开发时间线绑定
- 生产环境与开发环境完全隔离，使用独立的数据库和缓存实例
- Prometheus + Grafana 用于生产监控（基础设施方向，不在本 spec 详细展开）
