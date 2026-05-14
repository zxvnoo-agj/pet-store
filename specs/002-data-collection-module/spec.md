# Feature Specification: Data Collection & Enrichment Module

**Feature Branch**: `002-data-collection-module`
**Created**: 2026-05-14
**Status**: Draft
**Input**: User description: "数据采集模块：对接拼多多多多进宝API获取商品基础信息，通过小红书采集用户真实评价，使用LLM提取商品结构化字段和分析评价优缺点，实现定时采集任务调度"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acquire Products (Auto-Discovery + Manual Seeding) and Auto-Fetch Product Data (Priority: P1)

系统支持两种商品入库方式：(A) **自动发现**——运营人员配置搜索策略（关键词、分类、价格区间）后，系统自动从拼多多搜索并批量拉取宠物商品；(B) **手动录入**——运营人员输入单个商品的拼多多链接进行精准添加。商品入库后，系统自动获取完整信息并通过LLM提取结构化字段。

**Why this priority**: 商品数据是全部功能的基础。没有商品数据，浏览、搜索、AI推荐等所有面向用户的功能都无法运作。自动发现能力避免了逐一手工录入的繁琐，是数据采集模块的核心入口。

**Independent Test**: 运营人员在后台配置一条搜索策略（如关键词"猫粮"、价格区间100-500、按销量排序），启动采集后30分钟内看到系统自动发现并填充的宠物商品（含LLM提取的结构化信息和完整价格数据）。

**Acceptance Scenarios**:

**方式A — 自动发现:**
1. **Given** 运营人员在管理后台打开"商品采集配置"页面，**When** 配置搜索策略（关键词如"猫粮 幼猫"、分类ID、价格区间、排序方式、单次上限）并点击"启动采集"，**Then** 系统按策略调用拼多多搜索API，逐页拉取商品列表
2. **Given** 搜索API返回商品列表，**When** 系统处理每件商品，**Then** 系统按goods_id自动去重（已存在则跳过），新商品创建记录并异步触发详情获取和LLM提取
3. **Given** 自动发现任务正在运行，**When** 运营人员查看任务进度，**Then** 系统展示实时进度（已发现N件、新增M件、跳过K件重复）
4. **Given** 自动发现任务完成或达到上限，**When** 任务结束，**Then** 系统汇总本次采集结果（新增商品数、跳过数、失败数）并记录采集日志，搜索策略自动保存供下次复用
5. **Given** 已保存的搜索策略列表，**When** 运营人员点击某个已保存策略的"再次执行"，**Then** 系统使用该策略重新启动自动发现任务

**方式B — 手动录入:**
5. **Given** 运营人员在管理后台打开"手动添加商品"页面，**When** 输入商品名称和拼多多商品链接并提交，**Then** 系统创建一条商品记录（状态为"待采集"），并在后台任务队列中触发数据采集
6. **Given** 商品记录状态为"待采集"，**When** 后台采集任务执行，**Then** 系统调用拼多多API获取商品详情（标题、主图、轮播图、拼团价、单买价、优惠券信息、累计销量、评价分、评价数、分类、店铺名），并更新商品记录
7. **Given** 拼多多商品详情已获取，**When** LLM提取任务执行，**Then** 系统从商品标题与描述中提取品牌、规格重量、形态、产地、保质期、适用年龄、特殊配方、成分表（前8项）、营养亮点，并写入商品记录
8. **Given** 拼多多API返回错误（如商品下架、链接无效），**When** 采集任务执行失败，**Then** 系统记录错误日志并标记商品为"采集失败"，运营人员可在后台看到失败原因

---

### User Story 2 - Auto-Collect XHS Reviews for Real User Feedback (Priority: P1)

系统根据商品的品牌和名称自动搜索小红书相关笔记，采集用户的真实使用评价（笔记正文、评论、图片），通过LLM分析每条评价的优缺点标签、推荐态度和猫咪反应，存入评价表供前端展示。

**Why this priority**: 真实评价是小程序区别于纯电商平台的核心价值。用户依赖真实的、结构化的优缺点分析来做购买决策。没有评价数据，商品详情页将缺乏说服力。

**Independent Test**: 对一个已有商品数据的商品，手工触发一次小红书评价采集，能在10分钟内看到采集到的评价及其LLM分析结果（优缺点标签、推荐/不推荐）。

**Acceptance Scenarios**:

1. **Given** 商品已有基本信息和品牌名称，**When** 触发小红书评价采集（手动或定时），**Then** 系统根据"{品牌} {商品名} 测评"等关键词搜索小红书笔记
2. **Given** 搜索到相关笔记，**When** 采集笔记详情和评论，**Then** 系统保存笔记标题、正文、图片、作者、点赞数、发布时间，并按note_id去重
3. **Given** 笔记内容已采集，**When** LLM分析评价内容，**Then** 系统提取优缺点标签（每条4-8字中文标签）、推荐态度（推荐/不推荐/中性）、猫咪反应、置信度分数
4. **Given** 一个商品关联多条评价，**When** 标签聚合任务执行，**Then** 系统统计该商品所有评价的优缺点标签频次（按置信度加权），取Top8优点和Top6缺点更新到商品记录
5. **Given** 小红书API请求频率受限，**When** 触发限流，**Then** 系统等待后自动重试（最多3次），并控制请求间隔不低于2秒

---

### User Story 3 - Scheduled Price & Data Refresh (Priority: P2)

系统定时（每小时）更新所有上架商品的拼多多价格、优惠券、销量和评价数据，确保展示给用户的信息始终是最新的。

**Why this priority**: 价格和销量是用户决策的关键因素，拼多多商品价格变动频繁。定时更新确保数据时效性，但即使没有定时更新，核心浏览和AI推荐功能仍可使用已有数据。

**Independent Test**: 在管理后台修改一个商品的拼多多实际价格后，等待下一次定时任务执行（最长1小时），刷新商品详情页能看到更新后的价格。

**Acceptance Scenarios**:

1. **Given** 系统正常运行，**When** 每小时价格更新定时任务触发，**Then** 系统遍历所有上架商品，通过拼多多API获取最新价格、优惠券、销量和评价分并更新数据库
2. **Given** 单个商品价格更新失败（如API超时），**When** 定时任务处理该商品，**Then** 系统记录错误日志并继续处理下一个商品，不影响整体任务
3. **Given** 小红书评价增量采集定时任务触发（每日凌晨3点），**When** 任务执行，**Then** 系统按时间游标只采集上次采集之后发布的新笔记，避免重复

---

### User Story 4 - Collection Monitoring & Failure Handling (Priority: P2)

运营人员在管理后台能够查看每次采集任务的执行日志（任务名称、数据源、采集类型、采集数量、状态、错误信息），并能手动重试失败的任务。

**Why this priority**: 采集监控帮助运营人员及时发现数据问题，但不影响核心用户功能。监控和重试能力是运营工具的基本要求。

**Independent Test**: 运营人员在管理后台"采集日志"页面能看到所有历史采集记录，点击失败记录可查看详细错误信息。

**Acceptance Scenarios**:

1. **Given** 系统执行了多次采集任务，**When** 运营人员打开"采集日志"页面，**Then** 系统展示所有采集记录（按时间倒序），包含数据源、采集类型、状态、采集数量、开始/完成时间
2. **Given** 某次采集任务失败，**When** 运营人员查看该记录详情，**Then** 系统展示错误原因和失败时间
3. **Given** 某商品采集失败，**When** 运营人员点击"重新采集"，**Then** 系统重新触发该商品的采集任务
4. **Given** 存在失败的采集任务，**When** 运营人员查看管理后台导航菜单，**Then** "采集日志"菜单项展示红色角标显示失败任务数量

---

### User Story 5 - LLM Tag Aggregation to Product Level (Priority: P3)

系统每日定时将各商品所有小红书评价的LLM分析结果聚合为商品级别的优缺点标签和推荐率，更新到商品记录中，供前端商品列表和详情页展示。

**Why this priority**: 标签聚合是锦上添花的功能，依赖评价数据积累。若评价数量少，聚合结果参考价值有限。在评价积累到一定量后才有实际意义。

**Independent Test**: 对一个已有10条以上评价分析结果的商品，触发标签聚合后，商品记录的pros/cons/recommend_rate字段被更新。

**Acceptance Scenarios**:

1. **Given** 某商品有N条已LLM分析的评价，**When** 标签聚合任务执行，**Then** 系统汇总所有评价的优缺点标签（按置信度加权），取Top N更新商品表
2. **Given** 某商品有N条评价包含推荐/不推荐标记，**When** 标签聚合计算推荐率，**Then** 系统计算推荐占比（加权）写入商品表的recommend_rate字段
3. **Given** 商品评价数为0，**When** 聚合任务执行，**Then** 系统跳过该商品，不修改现有字段

---

### Edge Cases

- **拼多多API日调用额度耗尽**: 系统在接近日限额（2000次/日）时优先保证商品详情查询，暂停非必要的搜索类请求
- **自动发现搜索结果为空**: 关键词过于狭窄或分类ID不正确时，搜索可能返回0结果。系统提示运营人员调整搜索策略
- **自动发现任务被中断**: 自动发现任务运行中服务重启时，系统从中断点恢复（基于已采集的goods_id去重），不丢失进度
- **小红书搜索无结果**: 对于一些冷门商品或新上市产品，可能搜索不到任何小红书笔记。系统记录"无结果"状态，运营人员可手动调整搜索关键词后重试
- **LLM返回格式异常**: LLM返回非JSON或缺少字段时，系统使用默认值填充并记录警告日志，不中断采集流程
- **商品描述超长截断**: 拼多多商品描述可能非常长，LLM提取时截断至前3000字符，确保不超出LLM上下文限制
- **同一商品被多次录入**: 系统通过拼多多goods_id去重——自动发现模式下静默跳过，手动录入时提示运营人员"该商品已录入"
- **评价增量采集游标丢失**: 如果游标记录丢失，系统降级为全量采集（最多30条），并重新建立游标
- **定时任务重叠执行**: 如果上一次定时任务尚未完成即触发下一次，系统跳过本次执行并记录警告日志，防止并发采集冲突
- **小红书cookie失效**: 小红书采集依赖登录态cookie，cookie失效时系统通知运营人员更新，支持备用账号切换

## Requirements *(mandatory)*

### Functional Requirements

**Explicitly Out of Scope**: Integration with other e-commerce platforms (JD/Taobao), manual editing of collected review content by operators, user-submitted reviews (handled in Feature 001), price trend visualization/charts, and advanced analytics dashboards.

- **FR-001**: System MUST allow operators to configure and save PDD product search strategies (keywords, category ID, price range, sort type, max items); operators MUST be able to execute and re-execute saved strategies from the admin backend
- **FR-001a**: During auto-discovery, system MUST show real-time progress (items found, new items added, duplicates skipped, failures)
- **FR-001b**: System MUST also support manual product seeding via PDD product link for precision addition
- **FR-002**: System MUST automatically fetch product details from PDD Duoduo Jinbao API, including: product name, description, main image, gallery images, group purchase price, single purchase price, coupon discount/validity, cumulative sales, evaluation score/count, category name, and store name/rating
- **FR-003**: System MUST extract structured product fields via LLM from the product title and description, including: brand, spec weight, form (dry/wet/freeze-dried/air-dried/snack/canned/supplement/supply/toy), origin, shelf life, age range, special formula tags, top 8 ingredients, and nutrition highlights
- **FR-004**: System MUST deduplicate products by PDD goods_id across both auto-discovery and manual seeding; duplicate products MUST be silently skipped in auto-discovery mode, and alerted to the operator in manual mode
- **FR-004a**: System MUST track product collection status through states: PENDING (awaiting collection) → ENRICHING (data fetch/LLM in progress) → ACTIVE (ready for display); failures transition to FAILED state with manual retry returning to PENDING
- **FR-005**: System MUST search Xiaohongshu (XHS) for product-related user notes using keyword templates combining brand and product name
- **FR-006**: System MUST collect note details (title, content, images, author, likes, publish time) and comment content for each found note
- **FR-007**: System MUST deduplicate XHS notes by note_id; already-collected notes MUST NOT be re-inserted
- **FR-008**: System MUST analyze each collected review via LLM to extract pros tags, cons tags, recommendation stance (recommended/not recommended), summary, confidence score, and cat reaction
- **FR-009**: System MUST periodically update product prices, coupons, sales data, and evaluation scores from PDD API at hourly intervals
- **FR-010**: System MUST perform incremental XHS review collection daily (early morning), using timestamp cursors to only fetch notes published since the last successful collection
- **FR-011**: System MUST aggregate all LLM-analyzed review tags to the product level (Top-8 pros, Top-6 cons, and recommendation rate) on a daily schedule
- **FR-012**: System MUST log every data collection task execution with: data source, collection type (full/incremental), items count, status (running/success/failed), error details, start time, and completion time
- **FR-013**: System MUST allow operators to view collection logs and manually retry failed collection tasks from the admin backend; the admin navigation menu MUST display a badge count of failed tasks
- **FR-014**: System MUST enforce rate limits for external APIs: minimum 2-second interval between PDD requests; minimum 2-second interval between XHS requests with daily cap of 500 notes per account
- **FR-015**: System MUST handle API errors gracefully with automatic retries (exponential backoff, max 3 retries) and must not block other collection tasks when a single item fails
- **FR-016**: System MUST support XHS login credential (cookie) updates via configuration, with support for backup accounts
- **FR-017**: System MUST NOT expose XHS author names or other personally identifiable information to mini program end users; author names MUST only be visible in the admin backend

### Key Entities

- **External Product Mapping**: Records linking internal products to external platform identifiers (PDD goods_id, PDD product URL). Stores platform name, external ID, external URL, promotion position ID (PID), and primary source flag.
- **Collection Log**: Execution records of each data collection task, tracking data source (PDD/XHS), collection type (full/incremental), timestamp cursor for incremental sync, count of items collected, status, and error information.
- **Product (Extended)**: The existing Product entity is enriched with PDD-sourced fields (group purchase price, single purchase price, coupon details, sales volume, store info) and LLM-extracted fields (spec weight, form, origin, shelf life, age range, special formula, nutrition highlights, recommendation rate). See Assumptions for detailed field mapping.

  **Product Collection States**:
  ```
  ┌─────────┐  discovery   ┌───────────┐  PDD detail  ┌────────┐
  │ PENDING │ ───────────► │ ENRICHING │ ────────────►│ ACTIVE │
  └─────────┘              └───────────┘              └────────┘
       ▲                         │                        │
       │                         │ on failure              │ deactivate
       │                         ▼                        ▼
       │                     ┌────────┐              ┌──────────┐
       └─── manual retry ────│ FAILED │              │ INACTIVE │
                             └────────┘              └──────────┘
  ```
  - **PENDING**: Product record created, awaiting data collection
  - **ENRICHING**: PDD detail API call or LLM extraction in progress
  - **ACTIVE**: All data collected and ready for display to end users
  - **FAILED**: Data collection failed (PDD API error, product offline, etc.); operator can manually retry to return to PENDING
  - **INACTIVE**: Operator manually deactivated the product (inherited from 001 data model)
- **Review (Extended for XHS)**: The existing Review entity supports XHS-sourced evaluations with external note ID, note author (stored in full but only returned in admin APIs — not exposed to mini program end users), note publish time, note likes count, and structured LLM analysis results (confidence score, cat reaction summary).

### Data Model Considerations

This feature extends the existing data model defined in `specs/001-pet-supplies-miniprogram/data-model.md`. The data model already defines Phase 2 entities (`data_sources`, `fetch_logs`, `external_products`, `price_history`) that this feature implements. Specific considerations:

| Aspect | Existing (001 Data Model) | Changes for 002 |
|--------|---------------------------|-----------------|
| **external_products** | Table defined with fields: id, product_id, source_id, external_id, external_url, external_name, current_price, original_price, sales_count, last_sync_at | Add `pid` (promotion position ID) field; `platform` field aligns with data source type |
| **fetch_logs** | Table defined as entity for collection task logs | Add `collection_type` field (full/incremental) and `cursor_value` (timestamp for incremental sync) |
| **products** | Existing fields: name, brand, price_min/max, image_urls, pros/cons, ratings, description, ingredients, specifications | Add PDD-specific data to `specifications` JSONB (group_price, coupon_discount, sales_tip, goods_eval_score, mall_name, etc.); add LLM-extracted fields similarly (spec_weight, spec_form, origin, shelf_life, age_range, special_formula, nutrition_highlight); add `recommend_rate` to `ratings` JSONB |
| **reviews** | Existing fields: id, product_id, user_id, rating, content, images, tags, is_recommended, source, source_url, helpful_count, status, llm_review_result | Add `external_note_id` VARCHAR(64), `author` VARCHAR(64), `note_published_at` TIMESTAMPTZ, `note_likes` INTEGER; use existing `llm_review_result` JSONB for LLM analysis output (confidence, cat_mood, summary); `source` field value 'crawled' supports XHS origin |
| **price_history** | Table defined for price trend tracking | Use as defined; populated alongside product price updates |

**Important**: These modifications extend the 001 data model without conflicting with its structures. No existing columns are removed or repurposed; only new columns are added and existing JSONB fields are used for structured storage.

## Clarifications

### Session 2026-05-14

- Q: How should operators be notified of critical collection task failures? → A: Admin dashboard badge only (red badge on "采集日志" menu showing failure count, no push notification)
- Q: Should collected XHS author names be anonymized? → A: Store full author names, visible only in admin backend (not exposed to mini program users)
- Q: Should search strategies be one-time or saved for recurring use? → A: Save & manual trigger — strategies are saved, operators can re-run with one click; no automatic schedule
- Q: What states does a product go through during the collection lifecycle? → A: pending → enriching → active; failures → failed (manual retry returns to pending)
- Q: What is explicitly out of scope for this feature? → A: Other e-commerce platforms (JD/Taobao), and manual review content editing by operators are out of scope

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can configure a search strategy and see the first batch of auto-discovered products (with LLM-extracted fields) within 30 minutes of launching the discovery task
- **SC-001b**: A single manually seeded product (via PDD link) is fully populated with data within 5 minutes of submission
- **SC-002**: 90% of PDD API calls (both search and detail) complete successfully and return valid product data
- **SC-003**: LLM extraction achieves 85% field completion rate for products with adequate descriptions (brand, spec_weight, spec_form, age_range filled)
- **SC-004**: For products with established brand names, XHS collection finds at least 5 relevant notes within the first collection run
- **SC-005**: LLM review analysis produces at least 1 pros tag and 1 cons tag for 80% of collected reviews with substantive content
- **SC-006**: Hourly price updates complete for all active products (up to 500) within 30 minutes
- **SC-007**: System maintains data freshness: product prices reflect PDD data no older than 2 hours
- **SC-008**: Collection task failure rate does not exceed 5% for any single scheduled run (excluding PDD/XHS platform outages)
- **SC-009**: Operators can view collection history and retry failed tasks within 3 clicks from the admin dashboard
- **SC-010**: Auto-discovery via a single search strategy can yield at least 20 new unique products per run for common pet supply categories

## Assumptions

- PDD Duoduo Jinbao API credentials (client_id, client_secret, pid) are available and configured; API daily call quota of 2000 is sufficient for the MVP product catalog (~500 products); auto-discovery uses search API and detail API, both counted against the quota
- Initial pet supply categories and search keywords are pre-configured based on common pet supply categories; operators can adjust strategies as needed
- XHS data collection uses a third-party library or API with valid login credentials; a backup account is available for credential rotation
- LLM extraction and analysis use an existing LLM service (as established in Feature 001, the AI assistant already uses LLM capabilities)
- The initial product catalog starts with ~50 manually seeded products before scaling
- PDD API provides product descriptions in HTML format which may require cleaning before LLM extraction
- XHS search results are limited to 30 notes per product for MVP to balance data coverage and collection time
- Tag aggregation uses LLM confidence-weighted counting; products with fewer than 3 reviews may have less reliable aggregated tags
- Existing user authentication and admin backend from Feature 001 are reused for the seed product management and log viewing features
- The cron/scheduler infrastructure (e.g., APScheduler or similar) is provisioned as part of the backend deployment
