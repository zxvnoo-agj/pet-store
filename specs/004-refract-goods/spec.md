# Feature Specification: Goods Module SPU Refactor

**Feature Branch**: `004-refract-goods`  
**Created**: 2026-05-20  
**Status**: Draft  
**Input**: User description: "创建004特性，命名和分支相同。当前特性旨在重构商品模块。当前商品列表会从ddk接口中通过关键词搜索先录入商品部分信息。由于电商平台同一类商品会有不同名称不同店铺等，导致同一类商品重复展示，信息很多，但是密度很小。现在改造为以 品牌-种类-商品名称+型号，SPU聚合。以猫粮为例：商品下详细信息包括成分、营养组成、优缺点、参考价格。一种商品，在电商平台会有多个链接，因此下面展示链接列表、店铺、价格区间。         商品的基础信息、详细信息支持手动录入。 关于电商链接等信息从ddk中采集获取，并通过商品信息匹配至对应商品（可借助小参数模型实现匹配）。需要重构前端商品展示、后端逻辑、数据模型。你可以读取数据库、代码查看现有的数据模型，逻辑，进行改动。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Creates SPU Master Data (Priority: P1)

As an administrator, I want to manually create and edit a product's basic and detailed information so that the system maintains a canonical, high-quality source of truth for each unique product.

**Why this priority**: Without accurate master data, aggregation and matching have no foundation. This is the core data entry path.

**Independent Test**: Can be fully tested by creating a new SPU with brand, category, name, model, and detailed attributes (e.g., ingredients, nutrition, pros/cons) and verifying it appears correctly in the management list.

**Acceptance Scenarios**:

1. **Given** the admin is on the product management page, **When** they create a new SPU with required fields (brand, pet type, parent category, child category, name, model) and optional detailed attributes, **Then** the SPU is persisted and visible in the product list.
2. **Given** an existing SPU, **When** the admin edits its detailed attributes, **Then** the changes are saved and reflected on the SPU detail view.
3. **Given** the admin is creating an SPU with ingredient/nutrition images, **When** they upload product packaging images, **Then** the system uses vision LLM to auto-extract ingredients and nutrition data into structured fields.
4. **Given** the admin has filled in ingredients and nutrition, **When** they click "AI Generate Pros & Cons", **Then** the system uses LLM to analyze the data and auto-generate pros and cons lists.

---

### User Story 2 - View Aggregated Product List (Priority: P1)

As an administrator, I want to browse the product catalog grouped by SPU rather than raw seller listings so that I can manage products without wading through duplicate entries.

**Why this priority**: This directly solves the information-density problem described in the feature goal and is the primary visible improvement for users.

**Independent Test**: Can be fully tested by importing numerous raw listings and confirming the UI displays only one card per unique product, with a consolidated price range.

**Acceptance Scenarios**:

1. **Given** multiple raw e-commerce listings belong to the same SPU, **When** the admin views the product list, **Then** only one aggregated entry per SPU is displayed, showing its reference price range.
2. **Given** the product list page, **When** the admin applies filters by brand or category, **Then** the results aggregate correctly at the SPU level.

---

### User Story 3 - Auto-Collect and Match E-commerce Listings (Priority: P2)

As the system, I want to ingest e-commerce data from external APIs and automatically link seller listings to the correct existing SPU so that price and availability information stay current with minimal manual effort.

**Why this priority**: Automating the linkage reduces maintenance overhead and keeps the catalog dynamic, but it depends on the existence of SPU master data.

**Independent Test**: Can be fully tested by triggering a data import and verifying that imported listings appear nested under the correct SPU detail view.

**Acceptance Scenarios**:

1. **Given** a scheduled or manual fetch from an external e-commerce data source, **When** new listings are imported, **Then** the system attempts to semantically match each listing to an existing SPU and classifies it into one of three tiers (high/medium/low confidence).
2. **Given** a listing has a high confidence match (≥85%) to an existing SPU, **When** matching completes, **Then** the listing is automatically linked, and the SPU's price range is updated.

---

### User Story 4 - Admin Reviews Unmatched Listings (Priority: P2)

As an administrator, I want to review listings that could not be automatically matched so that I can manually assign them to the correct SPU or decide to create a new SPU.

**Why this priority**: Ensures data quality and coverage when automated matching fails, preventing data loss.

**Independent Test**: Can be fully tested by importing listings with ambiguous or novel product data and verifying they appear in a dedicated review queue for manual action.

**Acceptance Scenarios**:

1. **Given** automated matching completes, **When** the admin opens the review queue, **Then** medium-confidence listings (60-84%) are displayed with top candidate SPU suggestions for quick confirmation, and low-confidence listings (<60%) are displayed as unmatched requiring manual SPU selection or creation.
2. **Given** a medium-confidence listing in the review queue, **When** the admin confirms the suggested SPU match, **Then** the listing is linked and removed from the queue with a single click.
3. **Given** a low-confidence listing in the review queue, **When** the admin either selects an existing SPU or creates a new SPU and confirms, **Then** the listing is linked and removed from the queue.

---

### Edge Cases

- What happens when a collected listing cannot be matched to any existing SPU with confidence ≥60%? It is classified as low-confidence and enters the manual review queue for administrator action (either select existing SPU or create new SPU).
- How does the system handle price updates for already-linked listings? Existing linked listings are updated in place with new prices; the SPU's computed price range is recalculated.
- What happens when two different SPUs have nearly identical identifiers (collision risk)? The system should flag potential duplicates during SPU creation or matching, prompting admin confirmation.
- How to handle duplicate listings from the same shop for the same SPU? The system deduplicates by shop and URL, keeping the latest price.
- What happens when a listing's confidence score is exactly on a threshold boundary (e.g., 84.9% vs 85%)? The system uses strict comparison (≥85% for high, ≥60% for medium) and rounds to one decimal place before classification.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support creating and editing SPU master records containing brand, pet type, parent category, child category, product name, model, and detailed attributes (e.g., ingredients, nutrition, pros/cons).
- **FR-002**: System MUST display a product list aggregated at the SPU level, collapsing multiple seller listings into a single entry.
- **FR-003**: System MUST collect e-commerce listings (shop name, price, URL) from external data sources and persist them as child records associated with an SPU.
- **FR-004**: System MUST provide an automated semantic matching mechanism using a three-tier confidence strategy: high confidence (≥85%) listings are automatically linked; medium confidence (60-84%) listings are presented as candidates in the review queue for quick admin confirmation; low confidence (<60%) listings are marked as unmatched requiring admin action.
- **FR-005**: Admin MUST be able to manually review, correct, or create linkages between collected listings and SPUs.
- **FR-006**: System MUST compute and display a consolidated price range (minimum and maximum prices) across all currently linked listings for an SPU.
- **FR-007**: System MUST allow filtering and searching the product list by brand, parent category, child category, pet type, and product name.
- **FR-008**: System MUST support AI-assisted SPU detail entry by parsing ingredient/nutrition images via vision LLM and auto-populating structured fields.
- **FR-009**: System MUST support converting text descriptions of nutrition facts into structured JSON via LLM.
- **FR-010**: System MUST support one-click generation of pros and cons by analyzing ingredients and nutrition data via LLM.

### Key Entities *(include if feature involves data)*

- **SPU (Standard Product Unit)**: A canonical product definition keyed by brand, category, product name, and model. Contains fixed detailed attributes (ingredients, nutrition, pros/cons, reference price) plus an extensible `extra_attrs` JSONB field for category-specific properties.
- **E-commerce Listing**: A specific seller offering on a platform, including shop name, current price, and URL. Always belongs to exactly one SPU.
- **Brand / Category**: Hierarchical classification dimensions used to organize and filter SPUs.
- **Raw Feed Item**: An unprocessed record imported from an external e-commerce API prior to matching and linking.
- **AI Extraction Service**: Backend service using vision and text LLMs to parse product packaging images and generate structured SPU attributes (ingredients, nutrition, pros/cons).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Product list information density improves such that a single view displays at least 3 times more unique products than the previous flat-list approach (i.e., duplicate seller listings are eliminated from the primary view).
- **SC-002**: Admin can create a complete SPU profile (basic and detailed information) within 5 minutes.
- **SC-003**: Automated matching correctly associates at least 80% of incoming e-commerce listings with the appropriate SPU without manual intervention.
- **SC-004**: Users can view a consolidated price range (min-max) for any given SPU derived from live data across multiple sellers.
- **SC-005**: Admin can reduce SPU detail entry time by at least 50% through AI-assisted image parsing and auto-generation of ingredients, nutrition, and pros/cons.

## Clarifications

### Session 2026-05-20

- **Q**: SPU的详细属性（成分、营养、优缺点等）应该采用哪种数据结构？ → **A**: 固定字段 + 扩展属性模式。核心属性（成分、营养、优缺点、参考价）为固定字段，同时支持自定义键值对扩展（`extra_attrs` JSONB），不同品类可添加差异化属性。
- **Q**: SPU的"参考价格"应该如何计算和展示？ → **A**: 展示价格区间（最低价-最高价），直观反映市场价格分布。
- **Q**: 自动匹配结果的置信度阈值和分流策略是什么？ → **A**: 三级匹配策略：高置信度（≥85%）自动关联；中置信度（60%-84%）作为候选推荐展示在审核队列中供快速确认；低置信度（<60%）标记为无法匹配，需管理员创建新SPU或手动选择。

## Assumptions

- External e-commerce API provides sufficient listing metadata (title, shop, price) to enable semantic matching.
- SPU master data is primarily authored and curated by administrators.
- Manual matching workflow is available as a fallback for automated matching failures.
- A product is considered identical across sellers if it shares brand, category, product name, and model; minor seller-specific title variations are expected.
