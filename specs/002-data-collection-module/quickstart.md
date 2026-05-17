# Quickstart Guide: Data Collection & Enrichment Module

**Date**: 2026-05-14
**Feature**: 002-data-collection-module

## Prerequisites

- Feature 001 backend running with PostgreSQL 15
- PDD Duoduo Jinbao API credentials (`client_id`, `client_secret`, `pid`)
- XHS account with valid cookie
- LLM API key (same as Feature 001)

## Environment Setup

Add to `backend/.env`:

```bash
# PDD Duoduo Jinbao API
PDD_CLIENT_ID=your_client_id
PDD_CLIENT_SECRET=your_client_secret
PDD_PID=your_promotion_pid

# XHS Credentials
XHS_COOKIE=your_xhs_cookie_string
XHS_BACKUP_COOKIE=backup_cookie_string

# LLM (reuse from 001)
OPENAI_API_KEY=sk-...
```

## Database Migration

```bash
cd backend
alembic upgrade head
```

This creates:
- `search_strategies` table
- `external_products` table
- `price_history` table
- Adds 4 columns to `reviews`
- Adds 3 columns to `data_fetch_jobs`
- Seeds `data_sources` with PDD and XHS entries

## Verify Setup

```bash
# Check data sources are seeded
curl http://localhost:8000/api/v1/admin/collect/sources \
  -H "Authorization: Bearer <admin_token>"

# Expected: 2 entries (pdd, xiaohongshu)
```

## Manual Test: Single Product Seed

1. Access admin backend → Collection → Add Product
2. Enter: name="皇家幼猫粮K36", pdd_url="https://mobile.yangkeduo.com/goods.html?goods_id=123456"
3. Submit — product created with status="pending"
4. Wait ~30s — status transitions through "enriching" → "active"
5. Open product detail — verify PDD data + LLM-extracted fields populated

## Manual Test: Auto-Discovery

1. Access admin backend → Collection → Strategies
2. Create strategy: name="猫粮测试", keywords=["猫粮"], max_items=20
3. Click "Execute" — SSE progress stream shows real-time counts
4. Wait for completion (< 5 min for 20 products)
5. Check Collection → Products — new products in "active" status

## Manual Test: XHS Review Collection

1. Find a product with brand name populated
2. Click "Collect XHS Reviews"
3. Wait ~2-5 min — reviews appear in admin review list with source="crawled"
4. Verify LLM tags (pros/cons), confidence score, recommendation stance

## Scheduler Verification

```bash
# Check scheduler is running
curl http://localhost:8000/api/v1/admin/collect/scheduler/status

# Trigger hourly price refresh manually for testing
curl -X POST http://localhost:8000/api/v1/admin/collect/scheduler/trigger/hourly_price_update \
  -H "Authorization: Bearer <admin_token>"
```

## Key Commands

```bash
# Run all tests for collection module
cd backend
pytest tests/ -k "collection or pdd or xhs" -v

# Run specific test file
pytest tests/unit/test_pdd_client.py -v

# Generate new migration after model changes
cd backend
alembic revision --autogenerate -m "003_data_collection"
```
