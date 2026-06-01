# Data Model: 生产上线准备

**Phase**: 1 — Design & Contracts  
**Date**: 2026-05-26  
**Plan**: [plan.md](./plan.md)

> Note: This feature is infrastructure-focused and does not introduce new database entities. This document defines the infrastructure topology, environment configuration model, and deployment artifact structure.

## Infrastructure Topology

### Production Environment

```
┌─────────────────────────────────────────────────────┐
│                  Production Server                   │
│                   (2C4G / 50GB SSD)                  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           Nginx Reverse Proxy (host)          │   │
│  │  api.pawpalai.cn:443  admin.pawpalai.cn:443   │   │
│  └────────────┬─────────────────────┬───────────┘   │
│               │                     │                │
│        ┌──────▼──────┐      ┌──────▼──────┐         │
│        │  FastAPI    │      │  Admin SPA  │         │
│        │  (Docker)   │      │  (Nginx)    │         │
│        │  :8000      │      │  static     │         │
│        └──────┬──────┘      └─────────────┘         │
│               │                                      │
│  ┌────────────┼────────────────────────────┐         │
│  │     Docker Network: petstore_prod       │         │
│  │  ┌──────────┐ ┌──────┐ ┌────────────┐  │         │
│  │  │PostgreSQL│ │Redis │ │MeiliSearch │  │         │
│  │  │ :5432    │ │:6379 │ │ :7700      │  │         │
│  │  └──────────┘ └──────┘ └────────────┘  │         │
│  └─────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────┘
```

### Staging Environment

Same topology as production, with the following differences:

| Attribute | Production | Staging |
|-----------|-----------|---------|
| API Domain | `api.pawpalai.cn` | `staging.api.pawpalai.cn` |
| Admin Domain | `admin.pawpalai.cn` | `staging.admin.pawpalai.cn` |
| DB Name | `petshop` | `petshop_staging` |
| Redis DB | `0` | `1` |
| SSL Cert | production Let's Encrypt | staging Let's Encrypt (or self-signed) |
| Data | real data | anonymized subset |

## Environment Configuration Model

### Configuration Dimensions

| Dimension | Values |
|-----------|--------|
| Environment | `development`, `staging`, `production` |
| Source | `.env` file (12-factor app) |
| Frontend mode | `TARO_ENV` (h5/weapp) + `NODE_ENV` (development/production) |

### Required Environment Variables

```yaml
# Backend (.env)
DATABASE_URL: "postgresql+asyncpg://user:pass@host:5432/dbname"
REDIS_URL: "redis://host:6379/0"
SECRET_KEY: "<random-64-char-hex>"
WECHAT_APP_ID: "<mp-appid>"
WECHAT_APP_SECRET: "<mp-secret>"
DASHSCOPE_API_KEY: "<dashscope-key>"
DASHSCOPE_MODEL: "deepseek-v4-flash"
MEILISEARCH_URL: "http://meilisearch:7700"
MEILISEARCH_API_KEY: "<meili-key>"
DEBUG: "false"

# Frontend (build-time via Taro env API)
TARO_ENV: "weapp"        # Build target
NODE_ENV: "production"    # Build mode
```

### Frontend API Resolution Logic

```
IF TARO_ENV == 'weapp' AND NODE_ENV == 'production'
  → https://api.pawpalai.cn/v1
ELSE
  → http://127.0.0.1:8001/v1
```

## Deployment Artifact Structure

```
deploy/
├── production/
│   ├── docker-compose.yml       # Production stack definition
│   ├── nginx/
│   │   ├── api.pawpalai.cn.conf # API reverse proxy config
│   │   └── admin.pawpalai.cn.conf # Admin static file config
│   ├── .env.production.example  # Production env template
│   └── Dockerfile               # Backend (could be shared with root)
├── staging/
│   ├── docker-compose.yml       # Staging stack (references prod images)
│   ├── nginx/
│   │   └── staging.api.pawpalai.cn.conf
│   └── .env.staging.example
└── scripts/
    ├── deploy.sh                # Pull images + restart stack
    ├── backup.sh                # pg_dump + redis-cli bgsave + upload
    └── healthcheck.sh           # Check /health + /metrics endpoints
```
