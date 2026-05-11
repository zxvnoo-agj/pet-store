# Feature Specification: Pet Supplies Assistant Mini Program

**Feature Branch**: `feature/001-pet-supplies-miniprogram`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "我的需求是做一个微信小程序。该小程序面向群体是养宠物人士，具体需求在初步的前后端设计文档中pet-supplies-miniprogram-design.md。并且目前已有了前端交互原型（暂时为web）。参考以上资料。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Pet Products by Category (Priority: P1)

养宠用户打开小程序后，能够按宠物类型（猫、狗等）和商品品类（主粮、零食、玩具等）浏览宠物用品，快速找到目标商品。

**Why this priority**: 商品浏览是用户接触小程序的核心入口，没有浏览功能则其他所有功能失去意义。这是用户发现商品的最基础路径。

**Independent Test**: 用户能够不借助搜索和AI助手，仅通过分类导航找到特定品类的商品列表，并查看商品概要信息。

**Acceptance Scenarios**:

1. **Given** 用户首次打开小程序，**When** 用户选择宠物类型（如"猫咪"），**Then** 系统展示该宠物类型下的商品分类导航（主粮、零食、玩具等）
2. **Given** 用户已选择宠物类型，**When** 用户点击某一分类（如"主粮"），**Then** 系统展示该分类下的商品列表，包含商品名称、品牌、价格区间、评分和评价数量
3. **Given** 用户正在浏览商品列表，**When** 用户应用筛选条件（如价格范围、品牌），**Then** 列表实时更新，仅展示符合条件的商品
4. **Given** 用户正在浏览商品列表，**When** 用户切换排序方式（如按评分、按价格），**Then** 列表按选定规则重新排序

---

### User Story 2 - View Product Details with Structured Reviews (Priority: P1)

用户查看商品详情时，能够看到结构化的商品信息（优缺点标签、多维度评分、成分/规格）以及真实用户评价，辅助购买决策。

**Why this priority**: 宠物用品选购高度依赖真实评价和成分分析。结构化展示优缺点和评分能显著降低用户的决策成本，是小程序的核心价值主张之一。

**Independent Test**: 用户能够进入任意商品详情页，查看完整的商品信息、优缺点标签、评分分布和评价列表，无需登录或其他前置操作。

**Acceptance Scenarios**:

1. **Given** 用户在商品列表中，**When** 用户点击某一商品卡片，**Then** 系统展示该商品的详情页，包含商品图片、名称、品牌、价格区间
2. **Given** 用户在商品详情页，**When** 页面加载完成，**Then** 系统展示该商品的优缺点标签（如"营养均衡"、"适口性好"等）
3. **Given** 用户在商品详情页，**When** 用户查看评分区域，**Then** 系统展示综合评分及各维度评分（性价比、质量、适口性等）
4. **Given** 用户在商品详情页，**When** 用户下滑至评价区域，**Then** 系统展示用户评价列表，支持按评分、时间、 helpful 数排序
5. **Given** 用户在评价列表中，**When** 用户点击评价标签（如"适口性好"），**Then** 系统筛选展示带有该标签的评价

---

### User Story 3 - AI Shopping Assistant (Priority: P1)

用户通过与AI对话的方式，描述自己的养宠场景和需求（如"3个月幼猫推荐什么猫粮？预算200元"），获得个性化的商品推荐和购买建议。

**Why this priority**: AI助手是小程序区别于普通电商应用的核心差异化功能，能够解决养宠新手"不知道买什么"的痛点，显著提升用户粘性。

**Independent Test**: 用户能够在任意页面唤起AI助手，输入自然语言问题后，获得基于真实商品数据的推荐回答，且回答中包含可点击跳转的商品卡片。

**Acceptance Scenarios**:

1. **Given** 用户在首页或商品详情页，**When** 用户点击AI助手入口，**Then** 系统打开对话界面，展示欢迎语和快捷问题推荐
2. **Given** 用户在AI对话界面，**When** 用户输入问题（如"3个月幼猫吃什么粮好？"），**Then** AI分析需求并调用商品检索，返回符合条件的商品推荐
3. **Given** AI已返回商品推荐，**When** 用户点击推荐商品卡片，**Then** 系统跳转至该商品详情页
4. **Given** 用户正在与AI对话，**When** AI需要查询数据库（如搜索商品、查看评价），**Then** 系统实时展示"正在搜索..."等状态提示
5. **Given** 用户已登录，**When** 用户发送消息，**Then** 系统保存对话历史，用户可在"我的"页面查看历史会话

---

### User Story 4 - Compare Multiple Products (Priority: P2)

用户在选购过程中，能够选择2-4个商品进行横向对比，直观比较各自的价格、评分、优缺点差异。

**Why this priority**: 对比功能是选购决策的高级需求，能够帮助用户在多款相似商品中快速定位最优选择。适合在核心浏览和AI推荐功能之后实现。

**Independent Test**: 用户能够从商品列表或详情页选择多个商品加入对比，进入对比页面后看到结构化的对比表格。

**Acceptance Scenarios**:

1. **Given** 用户在商品详情页，**When** 用户点击"加入对比"按钮，**Then** 系统将该商品加入对比栏，并提示用户已选择N个商品
2. **Given** 用户已选择2-4个商品，**When** 用户点击"开始对比"，**Then** 系统展示对比页面，横向展示各商品的品牌、价格、评分、优缺点
3. **Given** 用户在对比页面，**When** 用户点击某一商品卡片，**Then** 系统跳转至该商品详情页
4. **Given** 用户在对比页面，**When** 用户点击"让AI帮我选"，**Then** AI根据对比商品生成选购建议

---

### User Story 5 - Save Favorite Products (Priority: P2)

已登录用户能够将感兴趣的商品加入收藏，方便后续快速查看和购买决策。

**Why this priority**: 收藏功能提升用户留存和回访率，但属于增强型功能而非MVP核心。用户即使不登录也能浏览和使用AI助手。

**Independent Test**: 已登录用户能够在商品详情页收藏/取消收藏商品，并在"我的"页面查看收藏列表。

**Acceptance Scenarios**:

1. **Given** 用户已登录并在商品详情页，**When** 用户点击收藏按钮，**Then** 系统将该商品加入用户收藏列表，按钮状态变为"已收藏"
2. **Given** 用户已登录，**When** 用户进入"我的-收藏"页面，**Then** 系统展示该用户所有收藏的商品列表
3. **Given** 用户在收藏列表中，**When** 用户点击某一收藏商品，**Then** 系统跳转至该商品详情页
4. **Given** 用户在收藏列表中，**When** 用户点击取消收藏，**Then** 系统从收藏列表中移除该商品

---

### Edge Cases

- **无网络连接**: 用户在网络不稳定或离线状态下打开小程序，系统应展示缓存的分类和商品数据（如有），并提示网络异常
- **商品无评价**: 某些商品尚无用户评价，系统应展示"暂无评价"提示，而非空白区域
- **AI服务不可用**: 当AI服务繁忙或超时时，系统应提示用户"服务繁忙，请稍后重试"，并保留对话上下文
- **搜索结果为空**: 用户搜索或筛选条件无匹配商品时，系统应展示空状态提示，并推荐相关分类或热门商品
- **多宠家庭切换**: 用户同时养多种宠物，切换宠物类型后，首页、分类和推荐内容应相应更新
- **敏感内容过滤**: 用户提交的评价由 LLM 自动审核，未通过审核的评价不展示，并进入管理员后台待人工复核

## Requirements *(mandatory)*

### Functional Requirements

**Explicitly Out of Scope**: Direct product purchase, payment processing, order tracking, shopping cart, shipping logistics, and user community features (Q&A forums, photo sharing). The app redirects users to external e-commerce platforms (JD/Taobao) via source URLs for actual transactions.

- **FR-001**: System MUST allow users to browse products organized by pet type and product category
- **FR-002**: System MUST display structured product information including name, brand, price range, ratings, and pros/cons tags
- **FR-003**: System MUST display authentic user reviews with ratings, content, tags, and helpful counts
- **FR-004**: System MUST provide an AI conversational interface for users to ask product recommendations and pet care questions
- **FR-005**: System MUST allow users to compare 2-4 products side by side with key attributes
- **FR-006**: System MUST support user authentication via WeChat mini program login
- **FR-007**: Authenticated users MUST be able to save products to favorites and view their favorite list
- **FR-008**: System MUST support product search by keywords with suggestions and filtering
- **FR-009**: System MUST provide structured product data including ingredients, specifications, and multi-dimensional ratings
- **FR-010**: AI responses MUST be based on real product data in the system and MUST NOT fabricate non-existent products
- **FR-011**: System MUST provide an H5 admin backend for product catalog management, category configuration, and review moderation
- **FR-012**: User-submitted reviews MUST pass an automated LLM content review before publication; rejected reviews MUST be queued for admin manual review

### Key Entities

- **Product**: Represents a pet supply item with attributes including name, brand, price range, category, structured pros/cons, multi-dimensional ratings, ingredients, and specifications
- **Category**: Hierarchical classification of products by pet type (cat, dog, bird, etc.) and product type (food, toy, healthcare, etc.)
- **Review**: User-generated evaluation of a product containing rating, textual content, tags extracted from content, images, and helpfulness count
- **Chat Session**: A conversation thread between user and AI assistant, containing messages with roles (user/assistant/tool) and referenced products
- **Favorite**: A user's bookmarked product for quick access later

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find products in a target category within 3 taps from the home page
- **SC-002**: 90% of users can complete a product detail review within 2 minutes of opening the app
- **SC-003**: AI assistant provides a relevant product recommendation within 10 seconds of user query submission
- **SC-004**: 85% of users find the structured pros/cons information helpful for purchase decisions (measured by user feedback or engagement)
- **SC-005**: Product comparison feature allows users to compare 4 products simultaneously with all key attributes visible without scrolling
- **SC-006**: Authenticated users can access their favorited products within 2 taps from any page
- **SC-007**: Search functionality returns relevant results within 2 seconds for 95% of queries
- **SC-008**: The app supports browsing and core functionality (product browsing, detail viewing) without requiring user login

## Clarifications

### Session 2026-05-11

- **Q**: The specification does not explicitly define what is outside the scope of this mini program. For example, should the app support direct product purchase, order tracking, payment integration, or user community features (Q&A, photo sharing)? → **A**: The app does NOT support direct purchase, payment, order tracking, or community features within the mini program. Users are redirected to external e-commerce platforms (JD/Taobao) via deep links with product source URLs. The app focuses purely on information aggregation, structured reviews, AI recommendations, and decision assistance.
- **Q**: How should the system keep product prices, availability, and reviews up to date? → **A**: Data is refreshed via scheduled batch collection jobs running daily at midnight. Product prices and reviews are synchronized from e-commerce platform APIs (JD/Taobao). For detailed pipeline design, refer to `pet-supplies-miniprogram-design.md` Section 4 (Data Collection & Processing).
- **Q**: Should the admin backend (H5) for product management, category configuration, and review moderation be part of this feature or a separate feature? → **A**: A basic H5 admin backend is included in this feature, supporting product CRUD, category management, and review moderation. It serves as the internal operations interface for maintaining the product catalog and content quality.
- **Q**: Should the AI strictly limit itself to product-related queries, or can it also answer general pet care questions? → **A**: The AI acts as a broad pet advisor, answering product recommendations, general care tips, nutrition, grooming, and common behavioral questions. It MUST include explicit disclaimers for medical/health questions and redirect users to consult a veterinarian for diagnosis or treatment advice. Safety guardrails and content policies MUST be implemented to prevent harmful advice.
- **Q**: Should user reviews be published immediately or held for moderation? → **A**: User-submitted reviews are held for automated pre-moderation by an LLM content reviewer. Reviews are published only after passing the LLM review (no sensitive content, no spam, relevant to the product). Failed reviews are flagged for admin review in the H5 admin backend.

## Assumptions

- Users have stable internet connectivity for AI assistant interactions; product browsing MAY work with cached data in poor network conditions
- Product catalog data is maintained through an H5 admin backend and synchronized daily at midnight from e-commerce platform APIs (JD/Taobao)
- User reviews are a mix of user-generated content (UGC) and aggregated reviews from external platforms
- The WeChat mini program platform provides user identity (openid) for authentication without requiring separate account registration
- AI assistant responses are generated using large language models with access to the product database via tool calling
- Image storage and CDN delivery are handled by cloud object storage services
- The primary market is Chinese-speaking pet owners, so all content and AI interactions are in Chinese
