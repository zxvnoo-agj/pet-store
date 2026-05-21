# Feature Specification: SPU 体系迁移

**Feature Branch**: `005-spu-migration`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "在004特性新建delta变更特性，需求如上：本次变更完成小程序应用迁移至SPU体系的全部三个阶段的需求。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 小程序首页展示SPU商品 (Priority: P1)

作为小程序用户，我希望在首页看到高质量的SPU商品推荐，而不是空的或低质量的爬虫数据，以便快速发现适合我的宠物用品。

**Why this priority**: 首页是用户第一入口，当前products表已空，用户看不到任何商品。SPU有33条高质量数据，可以立即恢复首页展示能力。

**Independent Test**: 可以独立测试：调用新的SPU列表接口，验证返回33条Royal Canin商品，包含完整的成分、营养、优缺点信息。

**Acceptance Scenarios**:

1. **Given** 用户打开小程序首页，**When** 页面加载时，**Then** 展示SPU商品列表（而非products），包含名称、品牌、价格区间、主图
2. **Given** 用户点击某个SPU商品，**When** 进入详情页，**Then** 展示完整的成分、营养分析、优缺点、适用对象等信息
3. **Given** 用户按分类筛选，**When** 选择"猫粮>干粮"，**Then** 只展示category_id=40的SPU商品

---

### User Story 2 - SPU多平台价格对比 (Priority: P2)

作为小程序用户，我希望在SPU详情页看到该商品在不同电商平台的价格对比，以便选择最优惠的购买渠道。

**Why this priority**: 多平台价格对比是SPU体系的核心价值之一，但需要依赖外部API抓取数据，实现复杂度高于P1。

**Independent Test**: 可以独立测试：为某个SPU手动创建2-3个spu_listings记录，调用详情接口验证返回多平台价格对比数据。

**Acceptance Scenarios**:

1. **Given** SPU详情页已加载，**When** 该SPU有关联的spu_listings时，**Then** 展示各平台价格对比表格（平台、店铺、价格、销量）
2. **Given** 用户查看价格对比，**When** 点击某个平台链接时，**Then** 跳转至对应电商平台的商品详情页（带推广参数）
3. **Given** SPU没有关联listings，**When** 进入详情页时，**Then** 展示"暂无价格信息"提示，不报错

---

### User Story 3 - 自动抓取和匹配电商列表 (Priority: P2)

作为系统，我希望自动从拼多多等电商平台抓取商品列表并匹配到正确的SPU，以便保持价格信息的实时性和准确性。

**Why this priority**: 自动抓取是维持SPU体系长期运作的基础，但可以通过手动导入作为过渡方案，因此优先级次于P1。

**Independent Test**: 可以独立测试：配置拼多多API密钥，触发抓取任务，验证新抓取的列表能正确匹配到现有SPU（基于标题相似度≥85%自动链接）。

**Acceptance Scenarios**:

1. **Given** 系统配置了拼多多API参数，**When** 触发关键词"Royal Canin 猫粮"的抓取任务时，**Then** 返回抓取的商品列表并自动匹配到对应SPU
2. **Given** 抓取到的商品标题与某个SPU相似度≥85%，**When** 匹配服务运行时，**Then** 自动创建spu_listings记录并状态设为"linked"
3. **Given** 抓取到的商品无法匹配任何SPU（相似度<60%），**When** 匹配服务运行时，**Then** 状态设为"unmatched"，进入人工审核队列

---

### User Story 4 - 搜索和分类浏览 (Priority: P1)

作为小程序用户，我希望通过搜索和分类浏览找到我需要的SPU商品，以便快速定位目标产品。

**Why this priority**: 搜索和分类是电商应用的核心功能，当前基于products的实现已不可用，必须迁移到SPU。

**Independent Test**: 可以独立测试：调用SPU搜索接口传入"幼猫"，验证返回包含"Kitten"相关SPU；调用分类接口验证三级分类结构正确。

**Acceptance Scenarios**:

1. **Given** 用户在搜索框输入"幼猫"，**When** 执行搜索时，**Then** 返回名称、描述或成分中包含"幼猫"的SPU列表
2. **Given** 用户选择分类"猫咪 > 猫粮 > 干粮"，**When** 浏览分类页时，**Then** 只展示pet_type=cat且category_id对应干粮的SPU
3. **Given** 用户按价格排序，**When** 选择"价格从低到高"时，**Then** 按price_min升序排列SPU列表

---

### Edge Cases

- **空数据**: products表为空时，小程序不应报错，而是展示SPU数据
- **无listings**: SPU没有关联listings时，详情页应正常展示SPU信息，价格显示"暂无"
- **API失效**: 拼多多API不可用时，抓取任务应标记失败，不影响现有SPU展示
- **重复抓取**: 同一goods_id不应重复创建spu_listings记录
- **分类变更**: SPU的category_id变更后，分类浏览应实时反映

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须提供小程序端SPU列表接口（分页、筛选、排序），替代现有的products列表接口
- **FR-002**: 系统必须提供小程序端SPU详情接口，返回完整的成分、营养、优缺点、extra_attrs等信息
- **FR-003**: 系统必须支持按分类（三级分类体系）筛选SPU
- **FR-004**: 系统必须支持按关键词搜索SPU（搜索范围：名称、品牌、描述、成分）
- **FR-005**: 系统必须支持SPU详情页展示关联的spu_listings（多平台价格对比）
- **FR-006**: 系统必须支持从拼多多API抓取商品列表并存储为spu_listings
- **FR-007**: 系统必须支持基于LLM语义匹配的自动SPU-listing关联（相似度≥85%自动链接）
- **FR-008**: 系统必须支持手动审核未匹配的listings（60%≤相似度<85%的候选记录）
- **FR-009**: 小程序端首页、分类页、搜索页、详情页必须从products迁移到SPU体系
- **FR-010**: 管理后台必须支持触发SPU列表抓取任务并查看任务状态
- **FR-011**: 系统必须处理SPU没有listings的情况（详情页正常展示，价格显示"暂无"）
- **FR-012**: 系统必须保证spu_listings的幂等性（同一platform+goods_id不重复创建）

### Key Entities *(include if feature involves data)*

- **SPU (Standard Product Unit)**: 标准化商品单元，包含品牌、名称、型号、成分、营养、优缺点等完整属性。身份键：UNIQUE(brand, category_id, name, model)
- **SPU Listing**: 电商平台的商品列表，关联到SPU。包含平台、店铺、标题、价格、URL等信息。通过match_confidence和match_status追踪匹配状态
- **Product (Legacy)**: 旧商品表，保留向后兼容但不再维护。当前为空，未来可废弃

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 小程序首页加载时间不超过3秒（包含SPU列表接口调用）
- **SC-002**: SPU详情页展示完整信息（成分、营养、优缺点）的覆盖率100%
- **SC-003**: 用户可以通过搜索在5秒内找到目标SPU（搜索结果相关性≥80%）
- **SC-004**: 自动匹配准确率≥85%（基于标题语义相似度的人工抽样验证）
- **SC-005**: 小程序端所有商品展示页面从products平滑迁移到SPU，无功能降级
- **SC-006**: 管理后台可以触发抓取任务，任务状态可追踪（进行中/完成/失败）

## Assumptions

- 小程序前端使用Taro 3.x + React技术栈，API调用方式保持不变（仅替换接口路径和响应字段映射）
- 拼多多API密钥已配置（PDD_CLIENT_ID和PDD_CLIENT_SECRET环境变量）
- SPU数据质量足够高（已有33条Royal Canin数据作为种子），可以直接面向用户展示
- 用户可以接受SPU体系下商品数量较少但质量较高的现状（vs products体系数量多但质量低）
- spu_listings的自动匹配使用现有的SpuMatchingService（基于LLM语义匹配）
- 小程序端的收藏、评价功能暂时继续关联products表，后续迭代迁移（本特性scope外）
