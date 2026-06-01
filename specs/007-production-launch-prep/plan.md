# Implementation Plan: 生产上线准备

**Branch**: `008-production-launch-prep` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-production-launch-prep/spec.md`

## Summary

完成微信小程序从开发环境到生产环境的上线准备工作，包括：域名备案与 HTTPS 配置、后端生产环境部署（含预发布环境）、前端生产适配（API 地址/认证/包体积）、安全加固与监控、合规审核准备。建立标准化部署流水线，确保系统可安全稳定运行。

## Technical Context

**Language/Version**: Python 3.11+ / TypeScript 5.x  
**Primary Dependencies**: FastAPI 0.110+, Nginx, PostgreSQL 15, Redis 7, MeiliSearch, Docker  
**Storage**: PostgreSQL 15, Redis 7  
**Testing**: pytest (backend), manual verification via WeChat DevTools  
**Target Platform**: WeChat mini-program (frontend) + Linux server (backend + admin SPA)  
**Project Type**: Web application (frontend + backend + admin) — production deployment  
**Performance Goals**: API p95 <500ms, main package cold start <5s, concurrent users 500+  
**Constraints**: Mini-program main package <2MB, all external URLs must be HTTPS, production API must have ICP filing  
**Scale/Scope**: ~1K users initially, 1 production server + 1 staging server, Docker Compose deployment, Nginx reverse proxy

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **类型安全**: 不涉及新类型定义。部署配置使用环境变量注入，Secret 不硬编码。
- [x] **测试覆盖**: 部署脚本和配置变更需经过 staging 环境验证。关键 API 端点的健康检查作为部署验证点。
- [x] **UX 一致性**: 前端适配不改变 UI 交互模式，仅修复 API 地址和认证逻辑。用户无感知。
- [x] **性能影响**: 引入 Nginx 反向代理和 HTTPS 会带来少量延迟开销（实测 <50ms）。CDN/缓存策略在后续优化。
- [x] **可观测性**: Prometheus + Grafana 监控、Loguru 结构化日志、错误日志分离轮转。

## Project Structure

### Documentation (this feature)

```text
specs/007-production-launch-prep/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (infrastructure topology)
├── quickstart.md        # Phase 1 output (deployment guide)
├── contracts/           # Phase 1 output
│   └── deployment-checklist.md
└── tasks.md             # Phase 2 output (speckit.tasks)
```

### Source Code (repository root)

```text
deploy/
├── production/
│   ├── docker-compose.yml     # Production app stack
│   ├── nginx/
│   │   ├── api.pawpalai.cn.conf
│   │   └── admin.pawpalai.cn.conf
│   └── .env.production.example
├── staging/
│   ├── docker-compose.yml
│   ├── nginx/
│   │   └── staging.api.pawpalai.cn.conf
│   └── .env.staging.example
└── scripts/
    ├── deploy.sh              # Deployment automation
    ├── backup.sh              # DB & Redis backup
    └── healthcheck.sh         # Post-deploy verification

backend/
├── Dockerfile                 # NEW: backend Dockerfile
└── app/main.py                # MODIFY: CORS origins, logging config

frontend/
├── src/services/api.ts        # MODIFY: API domain env var
├── src/services/webApi.ts     # MODIFY: API domain env var
├── src/pages/chat/index.tsx   # MODIFY: Add Bearer token to SSE
├── package.json               # MODIFY: Remove unused deps
├── project.config.json        # MODIFY: Add appid
└── config/prod.js             # MODIFY: Production env config

admin/
├── Dockerfile                 # NEW: admin Dockerfile (or serve via nginx)
└── nginx.conf                 # NEW: admin nginx config
```

**Structure Decision**: Follows Option 2 (Web application pattern). New `deploy/` directory for all production deployment artifacts, keeping infrastructure code separate from application code.

## Complexity Tracking

No constitution violations.

## Phase 0: Research & Unknowns

### Unknowns to Resolve

| Unknown | Research Task |
|---------|--------------|
| Production server specs (CPU/RAM) | Research minimal server requirements for FastAPI + PostgreSQL + Redis (1K users) |
| Nginx reverse proxy best practices for FastAPI | Best practices for FastAPI behind Nginx (buffering, timeouts, WebSocket/SSE) |
| HTTPS cert auto-renewal | Let's Encrypt certbot setup for multi-domain (api/admin) |
| WeChat MP domain whitelist | Review WeChat official docs for domain whitelist requirements |
| Docker multi-stage build for Python apps | Best practices for reducing Docker image size |
| Production PostgreSQL tuning | Basic PgTune recommendations for 1GB-2GB RAM server |
| Supervisor / systemd for process management | Compare Supervisor vs systemd for Python process management |
| Staging environment isolation | How to isolate staging from production (DB, Redis, domain) |
| SSL termination for SSE/WebSocket | Nginx proxy_pass configuration for streaming (disable buffering) |

### Research Decisions

- **Server specs**: Minimum 2 vCPU / 4GB RAM / 50GB SSD for production; staging can share or use smaller instance
- **Nginx + FastAPI**: Use `proxy_pass http://backend:8000` with `proxy_http_version 1.1`, disable buffering for SSE
- **HTTPS**: Let's Encrypt via certbot + cron for auto-renewal (--standalone mode)
- **Process manager**: Use systemd (native, no extra deps) over Supervisor
- **Docker build**: Multi-stage build for Python: builder stage (deps) → runtime stage (slim image)
- **PostgreSQL tuning**: shared_buffers=512MB, effective_cache_size=1.5GB for 2GB RAM server
- **Staging isolation**: Separate Docker Compose stack, separate PostgreSQL database name, separate Redis DB index
- **SSE + Nginx**: Add `proxy_buffering off; proxy_cache off;` for chat stream endpoint
- **WeChat domain whitelist**: Add `api.pawpalai.cn` to `request` and `downloadFile` domains

## Phase 1: Design & Contracts

### Infrastructure Topology

```text
Internet
  │
  ├── WeChat Mini Program ── HTTPS ── api.pawpalai.cn:443
  │                                       │
  │                                  [Nginx reverse proxy]
  │                                       │
  │                               [FastAPI (Docker)] ── PostgreSQL 15
  │                                       │              Redis 7
  │                                       │              MeiliSearch
  │
  └── Browser (Admin) ── HTTPS ── admin.pawpalai.cn:443
                                      │
                                 [Nginx serve static files]
                                      │
                                  [Admin SPA (Docker)]
                                      │
                                  [FastAPI (same stack)]
```

### Key Infrastructure Entities

- **Production Stack**: `docker-compose.yml` defining backend (FastAPI), postgres, redis, meilisearch, admin nginx
- **Nginx Config**: Virtual host config per subdomain, SSL termination, proxy pass
- **Deployment Script**: Shell script for zero-downtime deployment (docker-compose pull + up)
- **Backup Script**: pg_dump for PostgreSQL + Redis RDB/AOF backup
- **Monitoring**: Prometheus metrics + log file rotation

### Contracts

Deployment checklist defined in `contracts/deployment-checklist.md`.

### Agent Context Update

Update AGENTS.md to reference this plan.

## Artifacts to Generate

1. `research.md` — Phase 0 findings
2. `data-model.md` — Infrastructure topology
3. `contracts/deployment-checklist.md` — Deployment runbook
4. `quickstart.md` — Deployment guide for operators
