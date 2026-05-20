# Quickstart Guide: Data Collection Refinement

**Date**: 2026-05-17
**Feature**: 003-data-collection-refinement

## Prerequisites

- Feature 001 + 002 backend running with PostgreSQL 15
- Feature 002 data collection pipeline operational (search strategies, PDD client, LLM)
- Third-party crawler tool configured to output JSONL txt files to `pet-store/pdd/`
- `chardet` package for encoding detection

## Environment Setup

Add to `backend/.env` (no new keys required — reuses existing 002 config):

```bash
# No new environment variables needed.
# Reuses existing PDD_CLIENT_ID, PDD_CLIENT_SECRET, PDD_PID from 002
# Reuses existing OPENAI_API_KEY / DASHSCOPE_API_KEY for LLM from 001
```

Install new dependency:

```bash
cd backend
pip install chardet
```

## Database Migration

```bash
cd backend
alembic upgrade head
```

This creates:
- `crawled_products` table (11 columns + indexes)
- No existing tables modified

## Verify Setup

```bash
# Check crawled_products table exists and is empty
curl http://localhost:8000/api/v1/admin/collect/crawled/products \
  -H "Authorization: Bearer <admin_token>"

# Expected: {"items": [], "total": 0, "page": 1, "page_size": 20}
```

## Manual Test: TXT File Import

### Step 1: Prepare test data

Create test txt files in `pet-store/pdd/`:

```bash
mkdir -p pet-store/pdd

cat > pet-store/pdd/test_batch.txt << 'EOF'
{"goods_id": "987654321", "title": "测试幼猫粮 1.5kg", "raw_text": "品牌：测试牌。规格：1.5kg。形态：干粮。产地：中国。保质期：12个月。适用：幼猫。配方：无谷低敏。成分：鸡肉、大米、鱼油。", "images": [], "crawled_at": "2026-05-17T10:00:00"}
{"goods_id": "123456789", "title": "测试成猫粮 2kg", "raw_text": "品牌：测试牌。规格：2kg。形态：干粮。产地：法国。保质期：18个月。适用：全阶段。成分：三文鱼、糙米、鸡脂。营养：高蛋白≥36%。", "images": [], "crawled_at": "2026-05-17T10:01:00"}
EOF

cat > pet-store/pdd/test_single.txt << 'EOF'
{"goods_id": "555555555", "title": "测试罐头 85g", "raw_text": "测试牌猫罐头。85g×12罐。湿粮。产地泰国。", "images": ["https://example.com/can.jpg"], "crawled_at": "2026-05-17T10:02:00"}
EOF
```

### Step 2: Trigger import

```bash
curl -X POST http://localhost:8000/api/v1/admin/collect/crawled/import \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"

# Expected:
# {"total_files": 2, "new_records": 3, "updated_records": 0, "failed_files": 0, "failed_details": [], "duration_seconds": <N>}
```

### Step 3: Verify imported data

```bash
curl http://localhost:8000/api/v1/admin/collect/crawled/products?page=1&page_size=20 \
  -H "Authorization: Bearer <admin_token>"

# Expected: 3 items in response
```

### Step 4: Test re-import (overwrite)

```bash
# Run import again
curl -X POST http://localhost:8000/api/v1/admin/collect/crawled/import \
  -H "Authorization: Bearer <admin_token>"

# Expected: new_records=0, updated_records=3 (overwrite existing)
```

### Step 5: Test encoding error handling

```bash
# Create a file with invalid encoding content
echo "garbage_bytes_���" > pet-store/pdd/bad_encoding.txt

curl -X POST http://localhost:8000/api/v1/admin/collect/crawled/import \
  -H "Authorization: Bearer <admin_token>"

# Expected: failed_files >= 1, failed_details includes "bad_encoding.txt"
```

## Manual Test: Enrichment Flow (Match + LLM + goods.detail)

### Prerequisites for enrichment test
- A product with goods_id exists in `external_products` (from strategy search or manual seed)
- Corresponding crawled data exists in `crawled_products` for that goods_id

### Step 1: Create a product linked to crawled data

```bash
# Manual seed a product with a goods_id that exists in crawled_products
curl -X POST http://localhost:8000/api/v1/admin/collect/products/seed \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 2,
    "product_name": "测试幼猫粮",
    "pdd_url": "https://mobile.yangkeduo.com/goods.html?goods_id=987654321"
  }'

# Expected: {"product_id": <N>, "status": "pending", ...}
```

### Step 2: Trigger re-match

```bash
curl -X POST http://localhost:8000/api/v1/admin/collect/products/<product_id>/rematch \
  -H "Authorization: Bearer <admin_token>"

# Expected: {"product_id": <N>, "goods_id": "987654321", "matched": true, "status": "enriching", ...}
```

### Step 3: Check product status after enrichment

```bash
# Wait ~30-60s for LLM extraction + goods.detail
curl http://localhost:8000/api/v1/admin/collect/products?status=active \
  -H "Authorization: Bearer <admin_token>"

# Expected: product appears with status="active", LLM fields populated
```

### Step 4: Verify extracted fields

```bash
curl http://localhost:8000/api/v1/admin/products/<product_id> \
  -H "Authorization: Bearer <admin_token>"

# Expected: brand="测试牌", spec_form="干粮", age_range="幼猫(4-12月)" (from LLM)
# Expected: price fields populated (from goods.detail)
```

## Manual Test: Unmatched Product Handling

### Step 1: Seed a product with no crawled data

```bash
curl -X POST http://localhost:8000/api/v1/admin/collect/products/seed \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 2,
    "product_name": "不存在的商品",
    "pdd_url": "https://mobile.yangkeduo.com/goods.html?goods_id=999999999"
  }'
```

### Step 2: Trigger re-match

```bash
curl -X POST http://localhost:8000/api/v1/admin/collect/products/<product_id>/rematch \
  -H "Authorization: Bearer <admin_token>"

# Expected: {"product_id": <N>, "goods_id": "999999999", "matched": false, "status": "pending", "message": "Product not found in crawled database..."}
```

## Manual Test: Enrichment Logs

```bash
curl http://localhost:8000/api/v1/admin/collect/enrichment/logs?page=1&page_size=10 \
  -H "Authorization: Bearer <admin_token>"

# Expected: enrichment task records with job_type="enrich_match", result JSONB with matched/unmatched counts
```

## Key Commands

```bash
# Run all tests for 003 module
cd backend
pytest tests/ -k "crawled or enrichment or txt_import" -v

# Run specific test files
pytest tests/unit/test_txt_parser.py -v
pytest tests/unit/test_encoding_detector.py -v
pytest tests/integration/test_txt_import.py -v
pytest tests/integration/test_enrichment_flow.py -v
pytest tests/contract/test_admin_crawled_api.py -v

# Generate new migration
cd backend
alembic revision --autogenerate -m "add_crawled_products_table"

# Full test suite
cd backend
pytest tests/ -v
```
