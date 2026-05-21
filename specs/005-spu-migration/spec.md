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

### User Story 4 - AI购物助手迁移至SPU体系 (Priority: P1)

作为小程序用户，我希望通过与AI对话的方式获得基于SPU数据的个性化商品推荐和购买建议，以便解决"不知道买什么"的痛点。

**Why this priority**: AI助手是小程序区别于普通电商应用的核心差异化功能。在SPU体系迁移过程中，AI助手必须从基于products表切换到基于SPU表进行商品检索和推荐，确保推荐结果指向高质量的SPU商品详情页。

**Independent Test**: 可以独立测试：在AI对话界面输入"3个月幼猫推荐什么猫粮"，验证AI返回的推荐商品基于SPU数据，且点击后跳转到SPU详情页（而非product详情页）。

**Acceptance Scenarios**:

1. **Given** 用户在首页或SPU详情页，**When** 用户点击AI助手入口，**Then** 系统打开对话界面，AI助手基于SPU数据库回答商品推荐问题
2. **Given** 用户在AI对话界面输入问题（如"3个月幼猫吃什么粮好？"），**When** AI分析需求并调用商品检索时，**Then** 系统查询SPU表（而非products表），返回符合条件的SPU商品推荐
3. **Given** AI已返回SPU商品推荐，**When** 用户点击推荐商品卡片时，**Then** 系统跳转至该SPU商品详情页（展示成分、营养、优缺点等完整信息）
4. **Given** AI需要查询商品数据库（如搜索SPU、查看评价），**When** 系统执行查询时，**Then** 实时展示"正在搜索..."等状态提示
5. **Given** 用户已登录，**When** 用户发送消息时，**Then** 系统保存对话历史，用户可在"我的"页面查看历史会话（会话中的商品链接指向SPU详情页）
6. **Given** 用户在SPU详情页点击"让AI帮我选"或类似入口，**When** 唤起AI助手时，**Then** AI助手自动携带当前SPU上下文，可以针对该SPU回答对比、评价相关问题

---

### User Story 5 - 搜索和分类浏览 (Priority: P1)

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
- **AI服务不可用**: 当AI服务繁忙或超时时，系统应提示用户"服务繁忙，请稍后重试"，并保留对话上下文
- **AI推荐空结果**: AI助手查询SPU后无匹配结果时，应友好提示用户调整需求，并推荐相关热门SPU分类

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
- **FR-009a**: 系统必须支持收藏功能从products迁移到SPU体系（用户收藏列表、收藏/取消收藏操作均基于SPU）
- **FR-009b**: 系统必须支持评价功能从products迁移到SPU体系（评价提交、展示、筛选均基于SPU）
- **FR-010**: 管理后台必须支持触发SPU列表抓取任务并查看任务状态
- **FR-011**: 系统必须处理SPU没有listings的情况（详情页正常展示，价格显示"暂无"）
- **FR-012**: 系统必须保证spu_listings的幂等性（同一platform+goods_id不重复创建）
- **FR-013**: AI助手必须基于SPU数据库（而非products表）进行商品检索和推荐
- **FR-014**: AI助手返回的商品推荐卡片必须链接到SPU详情页，展示完整的成分、营养、优缺点信息
- **FR-015**: AI助手响应必须基于真实的SPU数据，禁止虚构不存在的商品
- **FR-016**: AI助手新产生的对话中，商品推荐链接必须正确指向SPU详情页。历史会话中的旧product链接因products表删除将无法跳转

### Key Entities *(include if feature involves data)*

- **SPU (Standard Product Unit)**: 标准化商品单元，包含品牌、名称、型号、成分、营养、优缺点等完整属性。身份键：UNIQUE(brand, category_id, name, model)
- **SPU Listing**: 电商平台的商品列表，关联到SPU。包含平台、店铺、标题、价格、URL等信息。通过match_confidence和match_status追踪匹配状态
- **Product (Legacy)**: 旧商品表，将在本次迁移中删除。不再保留向后兼容，所有功能完全切换至SPU体系
- **Chat Session**: 用户与AI助手的对话线程，包含消息记录（user/assistant/tool角色）及引用的SPU商品。迁移后对话中的商品引用需指向SPU而非products

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 小程序首页加载时间不超过3秒（包含SPU列表接口调用）
- **SC-002**: SPU详情页展示完整信息（成分、营养、优缺点）的覆盖率100%
- **SC-003**: 用户可以通过搜索在5秒内找到目标SPU（搜索结果相关性≥80%）
- **SC-004**: 自动匹配准确率≥85%（基于标题语义相似度的人工抽样验证）
- **SC-005**: 小程序端所有功能（浏览、搜索、AI推荐、收藏、评价）从products平滑迁移到SPU，无功能降级
- **SC-006**: 管理后台可以触发抓取任务，任务状态可追踪（进行中/完成/失败）
- **SC-007**: AI助手在10秒内返回基于SPU数据的相关商品推荐（从用户提交问题到展示推荐结果）
- **SC-008**: AI助手推荐的商品卡片点击后100%跳转到正确的SPU详情页（无404或错误页面）
- **SC-009**: AI助手响应基于真实SPU数据，不虚构商品（人工抽检100条推荐，准确率100%）

## Clarifications

### Session 2026-05-21

- **Q**: 历史会话中的商品链接如何处理？products表删除后是否还需要兼容旧链接？ → **A**: products表将删除，不再兼容旧商品表。历史会话中的旧product链接无法继续跳转，以SPU体系为主。系统仅支持链接跳转（通过ddk接口获取推广链接），不存在支付、订单、物流等功能。
- **Q**: SPU当前仅33条数据，AI助手切换数据源后推荐覆盖度不足怎么办？ → **A**: 后续会持续添加SPU数据，无需考虑当前数据量限制。AI助手按SPU数据可用情况进行推荐，数据量问题不在本次迁移考虑范围内。
- **Q**: 收藏/评价功能是否在本次迁移范围内？ → **A**: 是的，收藏、评价、用户认证、SPU编辑等全部功能都在本次迁移范围内。本次迁移是完整的SPU体系切换，不存在"后续迭代"的遗留项。

## Assumptions

- 小程序前端使用Taro 3.x + React技术栈，API调用方式保持不变（仅替换接口路径和响应字段映射）
- 拼多多API密钥已配置（PDD_CLIENT_ID和PDD_CLIENT_SECRET环境变量）
- SPU数据质量足够高（已有33条Royal Canin数据作为种子），可以直接面向用户展示
- 用户可以接受SPU体系下商品数量较少但质量较高的现状（vs products体系数量多但质量低）
- spu_listings的自动匹配使用现有的SpuMatchingService（基于LLM语义匹配）
- AI助手使用现有的对话接口和LLM服务，仅需将商品检索数据源从products表切换为SPU表
- AI助手推荐结果中的商品卡片数据结构需要适配SPU详情页所需的字段（成分、营养、优缺点等）
- 系统仅支持电商平台的链接跳转（通过拼多多ddk接口获取推广链接），不支持小程序内直接支付、下单、物流跟踪等功能
