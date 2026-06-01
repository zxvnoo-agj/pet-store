Entire design of this project:
/PROJECT_REFERENCE.md

## WSL2 + 微信开发者工具 网络调试

### 架构
```
Windows WeChat DevTools / 真机
    ↕ (HTTP)
Windows WiFi IP (e.g. 192.168.31.x)
    ↕ portproxy (仅外部连接)
WSL2 (172.x.x.x) → uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 关键事实
- WSL2 自动将端口转发到 Windows `127.0.0.1`，但**不转发到 Windows 公网 IP**
- `netsh interface portproxy` 只转发**来自外部网络**（如手机）的连接，本机发给自己公网 IP 的请求 bypass portproxy

### 调试方式切换
API_HOST 定义在 `frontend/src/config/env.ts`，使用前修改此文件并 rebuild。

| 场景 | API_HOST | 原理 |
|------|----------|------|
| **DevTools** | `127.0.0.1` | WSL2 自动转发到 Windows localhost |
| **真机调试** | Windows WiFi IP | 手机 → Windows IP → portproxy → WSL2 |

### 首次设置（Windows 管理员 cmd）
```cmd
wsl hostname -I                             # 查 WSL2 IP
netsh interface portproxy add v4tov4 ^
  listenport=8000 listenaddress=0.0.0.0 ^
  connectport=8000 connectaddress=<WSL2_IP>
netsh interface portproxy show all          # 验证
```

### 报错排查
- `net::ERR_CONNECTION_TIMED_OUT` → 端口转发未设置，或 API_HOST 指向了无服务的 IP
- `ReferenceError: process is not defined` → 微信小程序运行时无 `process` 全局对象，不要在前端代码中使用 `process.env`（即使 Taro `defineConstants` 也不行）。改用独立 config 文件导出常量。

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/007-production-launch-prep/plan.md

Also refer to:
- Feature specification: specs/007-production-launch-prep/spec.md
- Feature 007 data model: specs/007-production-launch-prep/data-model.md
- Feature 007 deployment checklist: specs/007-production-launch-prep/contracts/deployment-checklist.md
- Feature 007 quickstart: specs/007-production-launch-prep/quickstart.md
- Feature 007 research notes: specs/007-production-launch-prep/research.md
- Feature 007 delta spec (首页场景快捷卡): specs/007-production-launch-prep/delta-spec.md
- Feature 007 delta plan (首页场景快捷卡): specs/007-production-launch-prep/delta-plan.md
- Feature 006 plan: specs/006-pet-profiles-ai/plan.md
- Feature 005 specification: specs/005-spu-migration/spec.md
- Feature 005 data model: specs/005-spu-migration/data-model.md
- Feature 005 API contracts: specs/005-spu-migration/contracts/api-contracts.md
- Feature 005 quickstart: specs/005-spu-migration/quickstart.md
- Feature 004 plan: specs/004-refract-goods/plan.md
- Feature 004 specification: specs/004-refract-goods/spec.md
- Feature 004 data model: specs/004-refract-goods/data-model.md
- Feature 004 API contracts: specs/004-refract-goods/contracts/api-contracts.md
- Feature 004 quickstart: specs/004-refract-goods/quickstart.md
- Feature 004 research notes: specs/004-refract-goods/research.md
- Feature 003 plan: specs/003-data-collection-refinement/plan.md
- Feature 003 specification: specs/003-data-collection-refinement/spec.md
- Feature 003 data model: specs/003-data-collection-refinement/data-model.md
- Feature 003 API contracts: specs/003-data-collection-refinement/contracts/api-contracts.md
- Feature 003 quickstart: specs/003-data-collection-refinement/quickstart.md
- Feature 003 research notes: specs/003-data-collection-refinement/research.md
- Feature 002 specification: specs/002-data-collection-module/spec.md
- Feature 002 data model: specs/002-data-collection-module/data-model.md
- Feature 002 API contracts: specs/002-data-collection-module/contracts/api-contracts.md
- Feature 002 quickstart: specs/002-data-collection-module/quickstart.md
- Feature 002 research notes: specs/002-data-collection-module/research.md
- Feature 001 plan: specs/001-pet-supplies-miniprogram/plan.md
- Feature 001 data model: specs/001-pet-supplies-miniprogram/data-model.md
<!-- SPECKIT END -->
