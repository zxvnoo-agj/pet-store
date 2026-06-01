# Deployment Checklist: 生产上线

**Phase**: 1 — Design & Contracts  
**Date**: 2026-05-26  
**Plan**: [plan.md](../plan.md)

> Runbook for production deployment. Complete items in order. Check off as completed.

## Phase 0: Prerequisites (P1)

- [ ] Register WeChat Mini Program and get AppID → set in `frontend/project.config.json`
- [ ] Purchase production server (2C4G/50GB minimum)
- [ ] Purchase domain and complete ICP filing (if mainland China server)
- [ ] Configure DNS A records:
  - `api.pawpalai.cn` → production server IP
  - `admin.pawpalai.cn` → production server IP
  - `staging.api.pawpalai.cn` → staging server IP
- [ ] Obtain WeChat Mini Program AppID and AppSecret
- [ ] Obtain DashScope API key / OpenAI API key
- [ ] Generate random 64-char hex for SECRET_KEY: `openssl rand -hex 32`

## Phase 1: Server Setup (P1)

- [ ] Install Docker and Docker Compose on production server
- [ ] Open firewall ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] Create deploy user with sudo-less Docker access
- [ ] Clone repository on production server
- [ ] Run certbot for initial SSL certificate:
  ```bash
  certbot certonly --standalone -d api.pawpalai.cn -d admin.pawpalai.cn
  ```
- [ ] Set up cron for cert renewal: `0 3 * * 1 certbot renew --quiet && systemctl reload nginx`

## Phase 2: Backend Deployment (P1)

- [ ] Create `deploy/production/.env.production` with all secrets
- [ ] Copy `deploy/production/.env.production` to server as `.env`
- [ ] Create `deploy/production/docker-compose.yml` with app services
- [ ] Create Nginx configs for `api.pawpalai.cn` and `admin.pawpalai.cn`
- [ ] Create backend `Dockerfile` (multi-stage build)
- [ ] Test build: `docker compose -f deploy/production/docker-compose.yml build`
- [ ] Startup: `docker compose -f deploy/production/docker-compose.yml up -d`
- [ ] Verify: `curl https://api.pawpalai.cn/health`
- [ ] Verify: `curl https://api.pawpalai.cn/v1/categories`
- [ ] Apply Alembic migrations: `alembic upgrade head`

## Phase 3: Frontend Production Build (P2)

- [ ] Update `frontend/src/services/api.ts` — API base URL logic
- [ ] Update `frontend/src/services/webApi.ts` — API base URL logic
- [ ] Update `frontend/src/pages/chat/index.tsx` — Add Bearer token to SSE fetch
- [ ] Remove unused dependencies from `package.json` (`lucide-react`, etc.)
- [ ] Build WeChat mini program: `npm run build:weapp`
- [ ] Verify main package size < 2MB
- [ ] Upload built `dist/` to WeChat MP dev console via WeChat DevTools

## Phase 4: Security Hardening (P2)

- [ ] Update CORS origins in `backend/app/main.py`:
  ```python
  allow_origins=[
      "https://admin.pawpalai.cn",
      "https://staging.api.pawpalai.cn",
      "http://localhost:10086",
      "http://localhost:3001",
  ]
  ```
- [ ] Protect `/metrics` endpoint (IP whitelist or simple Bearer token)
- [ ] Remove unused dev routes (admin_products, admin_crawled stubs)
- [ ] Set `DEBUG: false` in production `.env`
- [ ] Adjust log level: `level="INFO"` for production, `ERROR`-level logs to separate file
- [ ] Configure rate limiting: 100 req/min per IP for general APIs, 20 req/min for auth

## Phase 5: Monitoring & Backup (P2)

- [ ] Verify log rotation: `logs/error_*.log` rotating daily, retain 30 days
- [ ] Configure Prometheus scrape target for `/metrics`
- [ ] Create `deploy/scripts/backup.sh`:
  ```bash
  pg_dump -U petshop petshop | gzip > /backups/db_$(date +%Y%m%d).sql.gz
  ```
- [ ] Create `deploy/scripts/healthcheck.sh` for post-deploy verification
- [ ] Schedule cron for daily backup: `0 2 * * * /opt/pet-store/deploy/scripts/backup.sh`

## Phase 6: Staging Environment (P2)

- [ ] Set up staging server (or use second Docker Compose on same server)
- [ ] Create `deploy/staging/.env.staging` with staging secrets
- [ ] Create `deploy/staging/docker-compose.yml` (reference same images)
- [ ] Configure `staging.api.pawpalai.cn` Nginx config
- [ ] Verify staging deployment: `curl https://staging.api.pawpalai.cn/health`

## Phase 7: WeChat Configuration (P2)

- [ ] Log into WeChat Mini Program backend (mp.weixin.qq.com)
- [ ] Add `https://api.pawpalai.cn` to `request` whitelist
- [ ] Add `https://api.pawpalai.cn` to `downloadFile` whitelist
- [ ] Add any third-party image CDN domains to `downloadFile` whitelist
- [ ] Configure development → production version switch

## Phase 8: Compliance & Review (P3)

- [ ] Create user privacy agreement page (static page or modal)
- [ ] Implement first-launch privacy consent popup
- [ ] Review all user data collection points for compliance
- [ ] Submit test version for WeChat review
- [ ] Fix any review rejection issues
- [ ] Release production version

## Rollback Plan

- **Docker rollback**: `docker compose pull <previous-tag>` then `docker compose up -d`
- **Database rollback**: Restore from latest backup: `gunzip -c /backups/db_*.sql.gz | psql -U petshop petshop`
- **Frontend rollback**: Revert to previous WeChat MP version in dev console
