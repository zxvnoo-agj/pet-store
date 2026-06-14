Entire design of this project:
/PROJECT_REFERENCE.md

不要进行任何删除表的操作，若要删除务必征得用户同意后再执行
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

## 产品数据导入（SPU）

将 JSON 格式的产品数据导入 SPU 表的固定流程：

```bash
cd backend
venv/bin/python scripts/import_products.py /path/to/products.json
# 支持多个文件：file1.json file2.json
# 先验证不写入：--dry-run / -n
```

### JSON 格式要求

每个产品需包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `brand` | string | 是 | 品牌名 |
| `name` | string | 是 | 产品名 |
| `model` | string | 是 | 型号（唯一标识） |
| `pet_type` | string | 是 | `cat` 或 `dog` |
| `category_id` | int | 是 | 对应 `categories` 表的 ID |
| `description` | string | 否 | 产品描述 |
| `ingredients` | array | 否 | 成分列表 |
| `nutrition` | object | 否 | 营养成分 |
| `pros` | array | 否 | 优点列表 |
| `cons` | array | 否 | 缺点列表 |
| `extra_attrs` | object | 否 | 额外属性 |
| `status` | string | 否 | 默认 `active` |

### 去重逻辑

基于 `(brand, category_id, name, model)` 唯一约束自动跳过已存在的记录。

### 报错排查
- `net::ERR_CONNECTION_TIMED_OUT` → 端口转发未设置，或 API_HOST 指向了无服务的 IP
- `ReferenceError: process is not defined` → 微信小程序运行时无 `process` 全局对象，不要在前端代码中使用 `process.env`（即使 Taro `defineConstants` 也不行）。改用独立 config 文件导出常量。

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/009-in-app-reviews/plan.md

Also refer to:
- Feature 009 specification: specs/009-in-app-reviews/spec.md
- Feature 009 data model: specs/009-in-app-reviews/data-model.md
- Feature 009 API contracts: specs/009-in-app-reviews/contracts/api-contracts.md
- Feature 009 quickstart: specs/009-in-app-reviews/quickstart.md
- Feature 009 research notes: specs/009-in-app-reviews/research.md
- Feature specification: specs/008-xhs-review-enhancement/spec.md
- Feature 008 data model: specs/008-xhs-review-enhancement/data-model.md
- Feature 008 API contracts: specs/008-xhs-review-enhancement/contracts/api-contracts.md
- Feature 008 quickstart: specs/008-xhs-review-enhancement/quickstart.md
- Feature 008 research notes: specs/008-xhs-review-enhancement/research.md
- Feature 007 plan: specs/007-production-launch-prep/plan.md
- Feature 007 specification: specs/007-production-launch-prep/spec.md
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
