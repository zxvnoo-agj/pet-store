# Research: Data Collection Refinement

**Date**: 2026-05-17
**Feature**: 003-data-collection-refinement

## Research Topics

### 1. TXT File Format for Third-Party Crawler Output

**Decision**: Design a defined JSONL (JSON Lines) format for crawled product data, with each line representing one product. The format includes a `goods_id` (required unique key), `raw_html`, `raw_text`, `images` list, and optional metadata fields. The parser handles both single-product-per-file and batch multi-product-per-file variants.

**Rationale**:
- JSONL is machine-parseable, supports streaming reading for large files, and is trivial for the third-party crawler to emit
- Each line is self-contained — a parse error on one line does not affect subsequent lines
- `goods_id` is the mandatory field for deduplication; files without it are rejected per FR-002
- Encoding specified as UTF-8 (primary) with GBK fallback per FR-010

**TXT File Schema** (one JSON object per line):
```jsonl
{"goods_id": "123456789", "title": "皇家猫粮K36 2kg", "raw_html": "<html>...</html>", "raw_text": "商品描述文字...", "images": ["https://img.pddpic.com/xxx.jpg"], "crawled_at": "2026-05-17T10:00:00"}
{"goods_id": "987654321", "title": "冠能幼猫粮 1.5kg", "raw_text": "冠能幼猫粮...", "images": [], "crawled_at": "2026-05-17T10:01:00"}
```

**Field Definitions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| goods_id | string | Yes | PDD goods_id, unique key for matching |
| title | string | No | Product title from crawled page |
| raw_html | string | No | Raw HTML content of the crawled page |
| raw_text | string | No | Extracted plain text (cleaned from HTML) |
| images | string[] | No | List of product image URLs |
| crawled_at | string | No | ISO 8601 timestamp of crawl |

**Alternatives considered**:
- CSV format — cannot handle multi-line content (HTML) or embedded JSON easily
- Binary format (msgpack/protobuf) — not human-readable for operator debugging
- One file per product — requires N file reads for large batches, harder to track

### 2. Encoding Detection Strategy

**Decision**: Use `chardet` (or `charset-normalizer`) to detect encoding when UTF-8 decoding fails. Primary encoding is UTF-8; fallback to detected encoding with GBK/GB18030 as additional known encodings for Chinese crawler output.

**Rationale**:
- `chardet` is the de facto standard for Python encoding detection (used by requests, BeautifulSoup, etc.)
- The third-party crawler may output files in GBK (common for Chinese Windows tools)
- FR-010 explicitly requires UTF-8 and GBK support
- Encoding detection runs per-file (not per-line) for performance

**Implementation approach**:
```python
import chardet

def detect_and_read(file_path: str) -> str:
    with open(file_path, "rb") as f:
        raw = f.read()
    result = chardet.detect(raw)
    encoding = result["encoding"] if result["confidence"] > 0.7 else "utf-8"
    if encoding.lower() in ("gb2312", "gb18030"):
        encoding = "gbk"  # normalize Chinese encodings
    return raw.decode(encoding)
```

**Alternatives considered**:
- `charset-normalizer` — more accurate for mixed-encoding content, but larger dependency; `chardet` already in project's transitive deps via requests
- Trial-and-error decode loop (UTF-8 → GBK → Latin-1) — simpler but slower for large files

### 3. LLM Multimodal Extraction from Crawled Content

**Decision**: Use the existing LangChain + LLM infrastructure with a new extraction prompt optimized for crawled content (raw_text + image URLs). Text extraction takes priority; images supplement via vision model when text is insufficient. The existing `llm_extractor.py` is extended with a new `extract_from_crawled_content()` function.

**Rationale**:
- Feature 001/002 already provisions LLM access via LangChain (ChatOpenAI with DashScope/OpenAI)
- Crawled content differs from PDD API responses: may include raw HTML, may lack structured descriptions
- The extraction prompt is adapted to handle more varied input formats
- Vision model usage is optional — only invoked when `images` field is populated AND text extraction yields < 50% field completion

**Extraction Pipeline**:
1. Parse raw_text from crawled content (first 5000 chars, increased from 3000 for PDD titles)
2. Call text LLM with extraction prompt → get initial fields
3. If field completion < 50% AND images available → call vision LLM with first 3 images as supplement
4. Merge text + vision results (text takes precedence for factual fields, vision for form/type)

**New Extraction Prompt** (adapted for crawled content):
```
你是一个宠物食品和用品的结构化信息提取专家。从下面爬取的网页内容中提取结构化信息，返回JSON。

网页文本内容:
{raw_text}

请提取以下字段（如果信息不存在，字段设为null）：
- brand: 品牌名称
- spec_weight: 规格重量 (如"2kg", "400g")
- spec_form: 形态，只能是以下之一: "干粮","湿粮","冻干","风干","零食","罐头","保健品","用品","玩具" 或 null
- origin: 产地国家
- shelf_life: 保质期 (如"18个月")
- age_range: 适用年龄 (如"幼猫(4-12月)", "全年龄段")
- special_formula: 特殊配方标签，字符串数组 (如["无谷","低敏"])
- top_8_ingredients: 前8种成分，字符串数组
- nutrition_highlight: 营养亮点

只返回JSON，不要其他文字。
```

**Alternatives considered**:
- Always send images to vision model — higher token cost (~$0.01/image vs $0.001/text), not justified when text alone sufficient
- Skip vision entirely — loses form/type classification from product images, reduces accuracy for visually-heavy listings
- Use combined multi-modal prompt — more complex prompt engineering, risk of model confusion

**Token Cost Estimate** (per product):
- Text extraction: ~1500 input + ~400 output tokens ≈ $0.003
- Vision supplement (when needed, ~20% of products): ~2000 input (3 images) + ~400 output tokens ≈ $0.015
- Monthly estimate (500 products × 20 strategy runs): ~$15-25 USD (comparable to 002)

### 4. Pipeline Integration Point with Strategy Search

**Decision**: Hook into the strategy search completion flow via a post-execution callback pattern. After `data_fetch_jobs` record for a strategy execution is marked `completed`, the system iterates through discovered products, performs crawled DB matching, and triggers the enrichment flow for matched products.

**Rationale**:
- Minimizes changes to existing 002 code — the search strategy execution logic remains unchanged
- The existing `data_fetch_jobs` table already tracks job completion; a new `job_type` value (`"enrich_match"`) is used for enrichment tracking
- For matched products, 003's pipeline replaces 002's `pdd_client.fetch_detail()` + `llm_extractor.extract_product_fields()` calls
- For unmatched products, they stay pending; operators can trigger 002's original pipeline as fallback

**Integration Flow**:
```
Strategy Search (002, unchanged)
    │
    ├─► Search PDD API → Discover products (goods_id list)
    │
    └─► On completion (NEW 003 hook):
        ├─► For each discovered goods_id:
        │   ├─► Match against crawled_products.goods_id (single query)
        │   ├─► MATCHED → enrichment_service.enrich() (LLM extract + goods.detail)
        │   └─► UNMATCHED → mark status "pending", note "爬取数据未覆盖"
        └─► Log results to data_fetch_jobs (job_type="enrich_match")
```

**Code integration point**: `backend/app/services/collection_service.py` — the existing `execute_strategy()` method is extended with a post-processing step that dispatches to the new `enrichment_service.py`.

### 5. goods.detail Interface Reuse

**Decision**: Reuse the existing PDD `goods.detail` API client from Feature 002 (`backend/app/services/pdd_client.py` — `fetch_goods_detail()` method) for supplementary field completion.

**Rationale**:
- The PDD detail API returns: current price (group/single), coupon info, sales volume, store name/rating, gallery images, service tags
- These fields directly correspond to `specifications` JSONB fields and top-level columns (`min_group_price`, `min_normal_price`, `mall_name`, `gallery_urls`, `service_tags`)
- No new API integration required — the existing `pdd_client.py` already handles signature generation, rate limiting, and error retry
- Assumption confirmed: "The goods.detail interface (already defined or reusing Feature 002's PDD detail fetch or equivalent) remains available"

**Field Mapping from goods.detail to Product**:
| PDD API Field | Product Column/JSONB Path |
|---------------|--------------------------|
| min_group_price | products.min_group_price |
| min_normal_price | products.min_normal_price |
| coupon_discount | specifications.coupon_discount |
| coupon_start_time, coupon_end_time | specifications.coupon_{start,end}_time |
| sales_tip | specifications.sales_tip |
| goods_eval_score | specifications.goods_eval_score |
| goods_eval_count | specifications.goods_eval_count |
| mall_name | products.mall_name |
| mall_cps | specifications.mall_cps |
| gallery_urls | products.gallery_urls |
| detail_img_urls | products.detail_img_urls |
| service_tags | products.service_tags |

### 6. Synchronous Import Architecture for Large Batches

**Decision**: Implement synchronous import with batch processing for files up to ~200. For extremely large batches (>200 files), implement a configurable per-import file limit to keep response within HTTP timeout bounds. The import scans the directory, reads files sequentially, and returns a detailed summary.

**Rationale**:
- The spec clarification confirmed synchronous execution (operator triggers, waits, sees results)
- SC-001 targets 50 files in 5 minutes — achievable with sequential file I/O + DB inserts
- HTTP timeout (default 60s in FastAPI) requires that synchronous imports complete within a reasonable window
- Edge case "数百个txt文件" is handled by advising operators to split into batches or implementing a `max_files` parameter (default: 200)

**Performance Design**:
- INSERT uses SQLAlchemy `insert().on_conflict_do_update()` (PostgreSQL UPSERT) for goods_id deduplication
- Batch INSERT for every 50 files to amortize DB round trips
- File I/O is the bottleneck (not DB); sequential read is sufficient
- Memory: files processed one at a time, content discarded after parse → constant memory usage

**Alternatives considered**:
- Async background task (Celery/APScheduler) — rejected per spec clarification; adds infrastructure complexity not justified for MVP
- Streaming HTTP response with SSE progress — over-engineered for synchronous design; summary response at completion is sufficient

## Summary of Technical Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | TXT File Format | JSONL (one JSON object per line), goods_id required |
| 2 | Encoding Detection | chardet with UTF-8 primary, GBK fallback |
| 3 | LLM Extraction | Extended llm_extractor.py; text priority, vision supplement when needed |
| 4 | Pipeline Integration | Post-execution hook in collection_service.execute_strategy() |
| 5 | goods.detail | Reuse existing pdd_client.fetch_goods_detail() unchanged |
| 6 | Import Architecture | Synchronous with batch UPSERT, per-file error isolation |
