# Research: 生产上线准备

**Phase**: 0 — Research & Unknowns  
**Date**: 2026-05-26  
**Plan**: [plan.md](./plan.md)

## Production Server Specifications

- **Decision**: Minimum 2 vCPU / 4GB RAM / 50GB SSD for production server
- **Rationale**: FastAPI (async) + PostgreSQL + Redis + MeiliSearch stack requires at least 4GB RAM to avoid OOM under 500 concurrent users. 50GB SSD for ~6 months of data growth.
- **Alternatives considered**:
  - 1 vCPU / 2GB RAM: Insufficient for concurrent LLM calls + DB + Redis
  - 4 vCPU / 8GB RAM: Better but overkill for initial 1K users; can scale up later
  - Cloud (阿里云/腾讯云): 2C4G 轻量应用服务器 ~¥100/month, sufficient

## Nginx + FastAPI Best Practices

- **Decision**: Use `proxy_pass http://backend:8000` with SSE-specific config
- **Rationale**: Nginx handles SSL termination, static file serving, and reverse proxy efficiently
- **Key config**:
  ```nginx
  location /v1/chat/stream {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding on;
  }
  
  location / {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```
- **Alternatives considered**: Caddy (simpler config, auto HTTPS) — good alternative but Nginx is more standard

## HTTPS Certificate Auto-Renewal

- **Decision**: certbot standalone mode + crontab for weekly renewal
- **Rationale**: Let's Encrypt certificates valid for 90 days; weekly renewal ensures safety margin
- **Commands**:
  ```bash
  certbot certonly --standalone -d api.pawpalai.cn -d admin.pawpalai.cn
  0 3 * * 1 certbot renew --quiet && systemctl reload nginx
  ```

## Docker Multi-Stage Build

- **Decision**: Multi-stage build with pip cache optimization
- **Rationale**: Reduces final image size from ~1GB to ~200MB
- **Approach**: Stage 1 installs all deps; Stage 2 copies only runtime files
- **Key patterns**:
  ```dockerfile
  FROM python:3.11-slim AS builder
  RUN pip install --user -r requirements.txt

  FROM python:3.11-slim
  COPY --from=builder /root/.local /root/.local
  COPY ./app /app
  ```

## Production PostgreSQL Tuning

- **Decision**: Shared_buffers=512MB, effective_cache_size=1.5GB for 2GB RAM
- **Rationale**: Standard PgTune recommendation for 2GB RAM / SSD storage
- **Additional settings**: random_page_cost=1.1 (SSD), work_mem=16MB, maintenance_work_mem=128MB

## Process Management

- **Decision**: systemd over Supervisor for production
- **Rationale**: systemd is native on Linux, no additional dependency, handles auto-restart and logging
- **Alternatives considered**: Supervisor (additional Python dep), Docker restart policy (for containerized deployments)

## Staging Environment Isolation

- **Decision**: Separate Docker Compose stack on same or separate server
- **Rationale**: Minimal cost while maintaining full isolation
- **Isolation strategy**:
  - Separate network namespace (Docker network)
  - PostgreSQL: separate database name (`petshop_staging`)
  - Redis: separate DB index (`DB 1`)
  - Separate `.env.staging` with staging-specific secrets
  - Separate subdomain: `staging.api.pawpalai.cn`

## SSE Streaming with Nginx

- **Decision**: Disable buffering for SSE endpoints only
- **Rationale**: SSE (Server-Sent Events) requires real-time streaming; Nginx buffering would delay or batch chunks
- **Key settings**: `proxy_buffering off; proxy_cache off; proxy_set_header Connection ''; proxy_http_version 1.1;`

## WeChat Domain Whitelist

- **Decision**: Register `api.pawpalai.cn` in WeChat MP backend
- **Required domains**:
  - `request`: `https://api.pawpalai.cn`
  - `downloadFile`: `https://api.pawpalai.cn` (for product images if proxied)
  - `uploadFile`: (none currently)
  - `socket`: (none currently)
- **Note**: If product images are loaded directly from third-party CDNs (e.g., PDD), those domains also need whitelisting
