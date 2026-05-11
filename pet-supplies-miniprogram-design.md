# 宠物用品选购助手小程序 — 前后端设计文档

> 版本: v1.0  
> 日期: 2026-05-10  
> 状态: 设计阶段  

---

## 一、项目概述

### 1.1 项目背景

养宠人群在购买宠物用品时面临信息分散、品牌众多、评价真伪难辨的问题。本小程序旨在聚合宠物用品信息，以结构化方式展示产品优缺点及网友真实评价，并通过AI Agent提供智能问答服务，辅助用户做出购买决策。

### 1.2 核心目标

1. **信息聚合** — 按宠物种类、用品品类多维度组织商品信息
2. **评价汇聚** — 收集并展示真实用户对产品优缺点评价
3. **智能问答** — Agent对话式交互，回答购买咨询、推荐产品
4. **决策辅助** — 通过对比分析帮助用户快速做出选择

### 1.3 目标用户

- 养宠新手（需要选购指导）
- 资深养宠人士（寻找更优产品）
- 多宠家庭（需要跨品类比较）

---

## 二、技术栈选型

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   微信小程序端     │  │   H5（管理后台）  │  │   未来扩展APP │  │
│  │  Taro + React    │  │   React SPA      │  │   ReactNative│  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │ HTTPS/WSS
┌─────────────────────────────────▼─────────────────────────────────┐
│                        接入网关层                                 │
│                    Nginx + SSL 终结                               │
│              限流 / 负载均衡 / 静态资源缓存                          │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
┌─────────────────────────────────▼─────────────────────────────────┐
│                        API服务层 (FastAPI)                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │  用户模块   │ │  商品模块   │ │  评价模块   │ │  Agent模块   │  │
│  │  User      │ │  Product   │ │  Review    │ │  Chat/Agent  │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │  分类模块   │ │  收藏模块   │ │  搜索模块   │ │  系统管理     │  │
│  │  Category  │ │  Favorite  │ │  Search    │ │  Admin       │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
┌───────────▼──────────┐ ┌───────▼────────┐ ┌─────────▼──────────┐
│      数据存储层       │ │    缓存层       │ │    AI服务层         │
│   PostgreSQL 15      │ │   Redis 7      │ │  大语言模型API       │
│  ├─ 用户数据          │ │  ├─ Session    │ │  ├─ 文心一言        │
│  ├─ 商品信息          │ │  ├─ 热点缓存    │ │  ├─ 通义千问        │
│  ├─ 评价数据          │ │  ├─ 限流计数    │ │  ├─ OpenAI         │
│  ├─ 对话记录          │ │  └─ 全文索引    │ │  └─ Embedding      │
│  └─ 分类体系          │ │                │ │                    │
└──────────────────────┘ └────────────────┘ └────────────────────┘
```

### 2.2 技术选型详述

| 层级 | 技术项 | 选型 | 理由 |
|------|--------|------|------|
| **客户端** | 跨端框架 | **Taro 3.x** | 支持微信小程序/H5/APP，React语法生态成熟 |
| | 开发语言 | **TypeScript** | 类型安全，IDE友好，便于维护 |
| | UI组件 | **NutUI-React** | 京东出品，电商场景组件丰富，适配Taro |
| | 状态管理 | **Zustand** | 轻量（~1KB），避免Redux模板代码，适合小程序 |
| | 网络请求 | **Taro.request** 封装的HttpClient | 统一拦截、错误处理、Token刷新 |
| | 构建工具 | Webpack5 / Vite | Taro内置，支持代码分割优化包体积 |
| **服务端** | 运行时 | **Python 3.11+** | 生态丰富，AI/ML库支持完善，适合Agent开发 |
| | Web框架 | **FastAPI 0.110+** | 高性能异步框架，自动生成OpenAPI文档，原生依赖注入 |
| | ORM | **SQLAlchemy 2.0** | Python ORM事实标准，异步支持，迁移用Alembic |
| | 验证 | **Pydantic v2** | FastAPI原生集成，高性能数据校验与序列化 |
| | 文档 | **FastAPI自动Swagger** | 基于类型注解自动生成交互式API文档 |
| | 日志 | **Loguru** | 现代化日志库，自动结构化输出，开发友好 |
| | Agent框架 | **LangChain (Python版)** | Python生态更成熟，与FastAPI异步天然契合 |
| **数据层** | 主数据库 | **PostgreSQL 15** | JSONB支持半结构化数据（产品属性/评价），全文搜索 |
| | 缓存 | **Redis 7** | Session、热点数据、限流、排行榜 |
| | 搜索引擎 | **Meilisearch** (可选) | 轻量级全文搜索，容错拼写，适合商品搜索 |
| **AI服务** | LLM接入 | **LangChain (Python)** | Python版生态更完善，ReAct/Tool Calling支持更成熟 |
| | 向量检索 | **PGVector (PostgreSQL插件)** | 同一数据库管理业务数据和向量 |
| | 向量数据库 | **PGVector** (PostgreSQL插件) | 同一数据库管理文档向量和业务数据 |
| | 模型选择 | 文心ERNIE / 通义千问 / GPT-4o | 根据场景选择，Agent推理用强模型，简单问答用轻量模型 |
| **基础设施** | 容器化 | **Docker + Docker Compose** | 开发环境一致性，简化部署 |
| | 编排(生产) | **Kubernetes** (可选) | 服务发现、自动扩缩容 |
| | CI/CD | **GitHub Actions** | 自动化测试、构建、部署 |
| | 监控 | **Prometheus + Grafana** | 指标采集与可视化 |
| | 日志收集 | **Loki** | 轻量级日志聚合 |

### 2.3 选型对比说明

#### 为何选择Taro而非原生开发或uni-app？

| 维度 | 原生开发 | uni-app (Vue) | **Taro (React)** |
|------|----------|---------------|------------------|
| 跨端能力 | 仅微信 | 微信/H5/APP/快应用 | 微信/H5/APP/百度/支付宝 |
| 学习成本 | 需学WXML/WXSS | Vue生态 | **React生态，团队熟悉** |
| 组件生态 | 有限 | uni-ui | **NutUI + 任意React组件** |
| TypeScript | 支持一般 | 支持 | **原生TS支持** |
| 包体积优化 | 一般 | 一般 | **Tree Shaking + 分包** |
| 未来扩展 | 低 | 中 | **高（可转RN）** |

#### 为何选择FastAPI而非Django/Flask？

- **原生异步支持**：基于Starlette + ASGI，SSE流式响应、高并发Agent对话性能优异
- **自动API文档**：基于类型注解自动生成Swagger/ReDoc文档，无需额外配置
- **依赖注入系统**：原生Dependency Injection，服务层解耦，测试友好
- **Pydantic深度集成**：请求/响应模型自动校验、序列化，与Python类型系统无缝衔接
- **Agent生态契合**：LangChain Python + FastAPI异步Streamlit，ReAct流式输出天然适配

---

## 三、数据库设计

### 3.1 ER关系图

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │   products   │       │  categories  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │◄─────│ id (PK)      │
│ openid (UQ)  │  │    │ category_id  │──────│ name         │
│ nickname     │  │    │ name         │       │ pet_type     │
│ avatar       │  │    │ brand        │       │ parent_id    │───┐
│ created_at   │  │    │ price_range  │       │ level        │   │
└──────────────┘  │    │ image_urls   │       │ sort_order   │   │
                  │    │ pros (JSONB) │       └──────────────┘   │
                  │    │ cons (JSONB) │                          │
                  │    │ description  │       ┌──────────────┐   │
                  │    │ source_url   │       │  categories  │   │
                  │    │ created_at   │       │ (parent)     │◄──┘
                  │    └──────────────┘       └──────────────┘
                  │           │
                  │    ┌──────┴──────┐
                  │    │             │
                  │    ▼             ▼
                  │ ┌──────────┐  ┌──────────┐
                  │ │ reviews  │  │favorites │
                  │ ├──────────┤  ├──────────┤
                  └►│ user_id  │  │ user_id  │
                    │ product_id│  │ product_id│
                    │ rating   │  │ created_at│
                    │ content  │  └──────────┘
                    │ images   │
                    │ likes    │
                    │ created_at
                    └──────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│chat_sessions │       │chat_messages │       │  ai_tools    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄─────│ session_id   │       │ id (PK)      │
│ user_id      │       │ role         │       │ name         │
│ title        │       │ content      │       │ description  │
│ model        │       │ tool_calls   │       │ schema       │
│ created_at   │       │ tokens_used  │       │ is_active    │
└──────────────┘       │ created_at   │       └──────────────┘
                       └──────────────┘
```

### 3.2 表结构定义

#### 3.2.1 用户表 (users)

```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    openid          VARCHAR(64) UNIQUE NOT NULL,        -- 微信openid
    unionid         VARCHAR(64),                         -- 微信unionid（多应用打通）
    nickname        VARCHAR(64),                         -- 昵称
    avatar_url      VARCHAR(256),                        -- 头像URL
    pet_types       JSONB DEFAULT '[]',                  -- 用户养的宠物类型 ["cat", "dog"]
    profile         JSONB DEFAULT '{}',                  -- 扩展信息（养宠年限等）
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_openid ON users(openid);
```

#### 3.2.2 分类表 (categories)

```sql
CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(64) NOT NULL,               -- 分类名称（如：猫粮、狗玩具）
    pet_type        VARCHAR(32) NOT NULL,                -- 宠物类型：cat/dog/bird/fish/reptile/small_pet
    parent_id       INTEGER REFERENCES categories(id),   -- 父分类（支持二级分类）
    level           INTEGER DEFAULT 1,                   -- 层级 1=一级 2=二级
    icon            VARCHAR(128),                        -- 图标URL或class
    sort_order      INTEGER DEFAULT 0,                   -- 排序权重
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 示例数据：
-- (1, '猫粮', 'cat', null, 1, 'icon-cat-food', 1, true)
-- (2, '干粮', 'cat', 1, 2, null, 1, true)
-- (3, '湿粮', 'cat', 1, 2, null, 2, true)
-- (4, '狗粮', 'dog', null, 1, 'icon-dog-food', 2, true)
```

#### 3.2.3 商品表 (products)

```sql
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    category_id     INTEGER NOT NULL REFERENCES categories(id),
    name            VARCHAR(128) NOT NULL,               -- 商品名称
    brand           VARCHAR(64),                         -- 品牌
    price_min       DECIMAL(10,2),                       -- 最低价格
    price_max       DECIMAL(10,2),                       -- 最高价格
    currency        VARCHAR(8) DEFAULT 'CNY',
    image_urls      JSONB DEFAULT '[]',                  -- 商品图片数组
    
    -- 核心：优缺点结构化存储
    pros            JSONB DEFAULT '[]',                  -- ["高蛋白", "适口性好", "无谷物"]
    cons            JSONB DEFAULT '[]',                  -- ["价格偏高", "包装易破"]
    
    -- 核心：多维度评分
    ratings         JSONB DEFAULT '{}',                  -- {"overall": 4.5, "cost_performance": 4.2, "quality": 4.6, "taste": 4.3}
    
    description     TEXT,                                -- 商品描述
    ingredients     JSONB DEFAULT '[]',                  -- 成分列表（食品类）
    specifications  JSONB DEFAULT '{}',                  -- 规格参数（通用键值对）
    
    source_url      VARCHAR(256),                        -- 来源链接（京东/淘宝）
    source_platform VARCHAR(32),                         -- 来源平台
    
    status          VARCHAR(16) DEFAULT 'active',        -- active/inactive/deleted
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_pet_type ON categories(pet_type) INCLUDE (products);
CREATE INDEX idx_products_brand ON products(brand);
```

#### 3.2.4 评价表 (reviews)

```sql
CREATE TABLE reviews (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES users(id),        --  nullable = 匿名/爬取评价
    
    -- 评价内容
    rating          DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content         TEXT NOT NULL,                         -- 评价正文
    images          JSONB DEFAULT '[]',                  -- 评价图片
    
    -- 标签化（从内容提取或用户选择）
    tags            JSONB DEFAULT '[]',                  -- ["适口性好", "毛色变亮"]
    is_recommended  BOOLEAN,                             -- 是否推荐
    
    -- 元数据
    source          VARCHAR(32) DEFAULT 'user',          -- user/crawled（用户提交/爬取）
    source_url      VARCHAR(256),                        -- 原评价链接（爬取时）
    helpful_count   INTEGER DEFAULT 0,                   -- 有用数
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

#### 3.2.5 收藏表 (favorites)

```sql
CREATE TABLE favorites (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
```

#### 3.2.6 对话会话表 (chat_sessions)

```sql
CREATE TABLE chat_sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    title           VARCHAR(128),                        -- 会话标题（自动生成或用户修改）
    model           VARCHAR(32) DEFAULT 'ernie-bot',     -- 使用的模型
    system_prompt   TEXT,                                -- 系统提示词（可针对会话定制）
    metadata        JSONB DEFAULT '{}',                  -- 扩展信息
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.7 对话消息表 (chat_messages)

```sql
CREATE TABLE chat_messages (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content         TEXT NOT NULL,
    
    -- Agent相关
    tool_calls      JSONB DEFAULT NULL,                  -- 工具调用记录 [{"tool": "search_products", "args": {}, "result": {}}]
    tokens_used     INTEGER,                             -- Token消耗（计费/监控）
    
    -- 关联商品（当Agent推荐时）
    referenced_products JSONB DEFAULT '[]',              -- [product_id, ...]
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
```

### 3.3 数据流说明

```
┌──────────────────────────────────────────────────────────────┐
│                     数据初始化流程                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 分类数据 ──────────────► 手动录入（运营后台）               │
│     categories          宠物种类 × 品类 = 基础分类体系          │
│                                                              │
│  2. 商品数据 ──────────────► 人工录入 + 爬虫采集                │
│     products            来源：京东/淘宝/拼多多API或爬虫          │
│                         初始数据：品牌、价格、成分、描述         │
│                                                              │
│  3. 评价数据 ──────────────► 用户UGC + 爬虫采集                │
│     reviews             来源：电商平台评价爬取 + 小程序用户提交   │
│                         NLP提取标签：优缺点、关键词             │
│                                                              │
│  4. 向量数据 ──────────────► 商品信息Embedding化               │
│     pgvector            商品名+描述+优缺点 → 向量存储           │
│                         用于Agent语义检索                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 四、外部数据获取方案

### 4.1 问题分析

小程序的核心价值依赖于**商品信息**（价格、品牌、规格）和**真实评价**（优缺点、使用体验）。这些数据分散在不同平台，需要设计一套可靠的数据采集与更新机制。

```
数据来源分布:
┌─────────────────────────────────────────────────────────────┐
│                     外部数据源                               │
├──────────────────┬──────────────────────────────────────────┤
│   电商平台        │   社交平台                               │
├──────────────────┼──────────────────────────────────────────┤
│ • 淘宝/天猫      │ • 小红书（种草笔记）                      │
│ • 京东           │ • 知乎（问答评测）                        │
│ • 拼多多         │ • 什么值得买（评测文章）                   │
│ • 抖音电商       │ • 豆瓣小组（养宠讨论）                     │
├──────────────────┼──────────────────────────────────────────┤
│ 数据: 价格/销量  │ 数据: 真实体验/优缺点/口碑                │
│   /品牌/规格/官方│        /场景化使用反馈                     │
│   评价           │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### 4.2 数据采集策略

#### 4.2.1 采集方式优先级

| 优先级 | 方式 | 说明 | 适用场景 |
|--------|------|------|----------|
| **P0** | **官方开放平台API** | 京东/淘宝开放平台提供的商品API | 商品基础信息、价格、官方评价 |
| **P1** | **第三方数据服务商** | 有赞、魔镜、炼丹炉等电商数据服务 | 多平台聚合数据 |
| **P2** | **程序化爬虫** | 无API时的补充手段 | 社交平台评价、社区讨论 |
| **P3** | **用户UGC** | 小程序用户主动提交 | 真实使用反馈 |

#### 4.2.2 各数据源获取方案

**电商平台数据**

| 平台 | 数据项 | 获取方式 | 频率 |
|------|--------|----------|------|
| **京东** | 商品信息/价格/评价 | 京东开放平台API（宙斯） | 价格: 每日 / 评价: 每日增量 |
| **淘宝/天猫** | 商品信息/价格/评价 | 淘宝开放平台API（TOP） | 价格: 每日 / 评价: 每日增量 |
| **拼多多** | 商品价格/销量 | 第三方数据服务或API | 每日 |

**社交平台数据**

| 平台 | 数据项 | 获取方式 | 频率 |
|------|--------|----------|------|
| **小红书** | 种草笔记/使用体验 | 小红书开放API / 关键词搜索 | 每日增量 |
| **知乎** | 问答/评测文章 | 知乎开放API / 搜索接口 | 每周 |
| **什么值得买** | 评测文章/评分 | RSS/开放接口 | 每周 |
| **豆瓣小组** | 讨论帖/推荐 | 定期爬取 | 每周 |

### 4.3 数据采集架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     数据采集调度中心                              │
│                    (APScheduler + Celery)                       │
├─────────────┬─────────────┬──────────────┬──────────────────────┤
│ 定时任务     │  任务队列    │   任务执行    │     数据写入          │
├─────────────┼─────────────┼──────────────┼──────────────────────┤
│ • 全量更新   │ Redis队列   │  API采集器   │  PostgreSQL          │
│ • 增量更新   │ (RQ/Celery) │  爬虫引擎    │  (商品/评价/价格)    │
│ • 实时监控   │             │  NLP处理     │                      │
│             │             │              │  Meilisearch         │
│             │             │              │  (搜索索引)          │
└─────────────┴─────────────┴──────────────┴──────────────────────┘
```

#### 采集任务类型

```python
# app/scheduler/jobs.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

# 1. 商品价格每日更新
scheduler.add_job(
    update_product_prices,           # 任务函数
    trigger=CronTrigger(hour=3),     # 每天凌晨3点执行
    id="daily_price_update",
    name="商品价格每日更新",
)

# 2. 评价每日增量采集
scheduler.add_job(
    fetch_new_reviews,
    trigger=CronTrigger(hour=4),     # 每天凌晨4点执行
    id="daily_review_fetch",
    name="评价增量采集",
)

# 3. 社交平台内容每周更新
scheduler.add_job(
    fetch_social_content,
    trigger=CronTrigger(day_of_week="mon", hour=5),  # 每周一凌晨5点
    id="weekly_social_fetch",
    name="社交平台内容采集",
)

# 4. 热门商品监控（高频）
scheduler.add_job(
    monitor_hot_products,
    trigger=CronTrigger(hour="*/6"),  # 每6小时执行
    id="hot_product_monitor",
    name="热门商品监控",
)
```

### 4.4 数据处理流水线

```
原始数据 ──► 采集 ──► 清洗 ──► NLP处理 ──► 融合 ──► 存储
               │        │         │          │        │
               ▼        ▼         ▼          ▼        ▼
            API/爬虫  去重/过滤  标签提取   多源整合  PG+向量
                     格式统一  情感分析   评分聚合
```

#### 4.4.1 数据清洗

```python
# app/data_pipeline/cleaner.py

class DataCleaner:
    """数据清洗: 去重、过滤、格式化"""

    async def clean_reviews(self, raw_reviews: list) -> list:
        cleaned = []
        for review in raw_reviews:
            # 1. 内容去重（相似度>90%视为重复）
            if await self.is_duplicate(review['content']):
                continue
            # 2. 过滤无效内容
            if len(review['content']) < 5:      # 太短
                continue
            if self.is_spam(review['content']):  # 垃圾信息
                continue
            # 3. 格式化
            cleaned.append({
                'content': self.normalize_text(review['content']),
                'rating': self.normalize_rating(review['rating']),
                'source': review['source'],
                'source_url': review.get('url'),
                'created_at': self.parse_date(review['date']),
            })
        return cleaned
```

#### 4.4.2 NLP处理（核心）

```python
# app/data_pipeline/nlp.py

class ReviewNLP:
    """NLP处理: 从评价中提取优缺点标签、情感分析"""

    def __init__(self):
        # 使用LLM API进行标签提取（也可本地部署轻量模型）
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    async def extract_tags(self, review_text: str) -> dict:
        """
        从单条评价中提取:
        - 优点标签 (pros)
        - 缺点标签 (cons)
        - 情感倾向 (positive/negative/neutral)
        - 关联维度 (taste/quality/price/packaging...)
        """
        prompt = f"""
分析以下宠物用品评价，提取关键信息:

评价: {review_text}

要求输出JSON格式:
{{
  "pros": ["优点标签1", "优点标签2"],
  "cons": ["缺点标签1"],
  "sentiment": "positive/negative/neutral",
  "aspects": {{"适口性": "positive", "价格": "negative"}},
  "is_recommended": true/false
}}
"""
        result = await self.llm.ainvoke(prompt)
        return json.loads(result.content)

    async def batch_extract(self, reviews: list) -> list:
        """批量处理评价（并发控制）"""
        semaphore = asyncio.Semaphore(10)  # 限流10并发
        async def process(review):
            async with semaphore:
                tags = await self.extract_tags(review['content'])
                return {**review, **tags}
        return await asyncio.gather(*[process(r) for r in reviews])
```

#### 4.4.3 数据融合

```python
# app/data_pipeline/fusion.py

class DataFusion:
    """多源数据融合: 将同一商品在不同平台的数据整合"""

    async def fuse_product_data(self, product_id: int):
        """
        融合逻辑:
        1. 取京东/淘宝的商品基础信息（品牌、规格等）
        2. 聚合多平台价格（取价格区间）
        3. 合并所有平台评价
        4. 汇总优缺点标签（按频次排序）
        5. 计算综合评分
        """
        sources = await self.fetch_sources(product_id)

        # 价格融合
        prices = [s.price for s in sources if s.price]
        price_min, price_max = min(prices), max(prices)

        # 评价融合
        all_reviews = []
        for source in sources:
            reviews = await self.get_reviews(source.id)
            all_reviews.extend(reviews)

        # 标签聚合
        pros_counter = Counter()
        cons_counter = Counter()
        for review in all_reviews:
            for tag in review.get('pros', []):
                pros_counter[tag] += 1
            for tag in review.get('cons', []):
                cons_counter[tag] += 1

        # 更新商品
        await self.update_product(
            product_id=product_id,
            price_min=price_min,
            price_max=price_max,
            pros=[tag for tag, _ in pros_counter.most_common(10)],
            cons=[tag for tag, _ in cons_counter.most_common(10)],
            review_count=len(all_reviews),
        )
```

### 4.5 数据存储设计（采集相关）

#### 新增表结构

```sql
-- 4.5.1 数据源配置表
CREATE TABLE data_sources (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(64) NOT NULL,          -- 数据源名称: jd/taobao/xiaohongshu
    type            VARCHAR(32) NOT NULL,          -- 类型: ecommerce/social
    api_endpoint    VARCHAR(256),                  -- API地址
    api_key         VARCHAR(256),                  -- API密钥(加密存储)
    config          JSONB DEFAULT '{}',            -- 其他配置参数
    is_active       BOOLEAN DEFAULT TRUE,
    last_fetch_at   TIMESTAMPTZ,                   -- 上次采集时间
    fetch_count     INTEGER DEFAULT 0,             -- 采集次数
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5.2 采集任务日志表
CREATE TABLE fetch_logs (
    id              SERIAL PRIMARY KEY,
    task_name       VARCHAR(128) NOT NULL,         -- 任务名称
    source_id       INTEGER REFERENCES data_sources(id),
    status          VARCHAR(16) NOT NULL,          -- success/failed/partial
    items_fetched   INTEGER DEFAULT 0,             -- 采集数量
    items_new       INTEGER DEFAULT 0,             -- 新增数量
    items_updated   INTEGER DEFAULT 0,             -- 更新数量
    error_message   TEXT,                          -- 错误信息
    started_at      TIMESTAMPTZ,                   -- 开始时间
    completed_at    TIMESTAMPTZ,                   -- 完成时间
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5.3 外部商品映射表（关联内部商品与外部平台商品）
CREATE TABLE external_products (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER REFERENCES products(id),  -- 内部商品ID
    source_id       INTEGER REFERENCES data_sources(id),
    external_id     VARCHAR(128) NOT NULL,            -- 外部平台商品ID
    external_url    VARCHAR(512),                      -- 外部商品链接
    external_name   VARCHAR(256),                      -- 外部平台商品名
    current_price   DECIMAL(10,2),                     -- 当前价格
    original_price  DECIMAL(10,2),                     -- 原价
    sales_count     INTEGER,                           -- 销量
    last_sync_at    TIMESTAMPTZ,                       -- 上次同步时间
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, source_id)
);

-- 4.5.4 评价来源追踪表
CREATE TABLE review_sources (
    id              SERIAL PRIMARY KEY,
    review_id       INTEGER REFERENCES reviews(id),
    source_id       INTEGER REFERENCES data_sources(id),
    external_url    VARCHAR(512),                      -- 原始评价链接
    external_user   VARCHAR(128),                      -- 外部平台用户名
    fetch_log_id    INTEGER REFERENCES fetch_logs(id),  -- 关联采集批次
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5.5 价格历史表（用于价格趋势）
CREATE TABLE price_history (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER REFERENCES products(id),
    source_id       INTEGER REFERENCES data_sources(id),
    price           DECIMAL(10,2) NOT NULL,
    recorded_at     TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_price_history_product (product_id, recorded_at)
);
```

### 4.6 合规与风险控制

#### 4.6.1 法律合规

| 风险点 | 应对措施 |
|--------|----------|
| **数据抓取协议违规** | 优先使用官方API；爬虫严格遵循 robots.txt；控制频率（≤1次/秒） |
| **用户隐私** | 社交平台评价只取公开内容；不存储用户个人信息；匿名化处理 |
| **商业数据** | 价格数据标注来源和更新时间；不篡改原始评价内容；注明"仅供参考" |
| **版权** | 不直接搬运完整文章；只提取结构化标签和摘要；保留原文链接 |

#### 4.6.2 技术防护

```python
# 爬虫防封策略
CRAWLER_CONFIG = {
    "request_interval": 1.0,           # 请求间隔 ≥ 1秒
    "random_user_agent": True,          # 随机User-Agent
    "proxy_rotation": True,             # 代理IP轮换
    "respect_robots_txt": True,         # 遵守robots.txt
    "max_retries": 3,                   # 最大重试次数
    "retry_delay": [5, 10, 30],        # 递增延迟重试
    "circuit_breaker": {               # 熔断机制
        "failure_threshold": 10,        # 10次失败触发熔断
        "recovery_timeout": 300,        # 5分钟后恢复
    },
}
```

### 4.7 实施建议

#### 第一阶段：MVP（上线初期）

> 人工+API的方式快速跑通

1. **手动录入种子数据**：前期100-200款热门商品手动录入（品牌、名称、规格）
2. **接入京东API**：获取价格和官方评价（京东开放平台需申请）
3. **NLP批处理**：对采集的评价批量提取优缺点标签
4. **每日定时更新**：价格每日凌晨更新，评价每日增量

#### 第二阶段：自动化（稳定后）

1. **接入多个平台**：淘宝、拼多多、小红书
2. **爬虫补充**：针对没有API的平台使用可控爬虫
3. **用户UGC**：开放用户提交评价功能
4. **实时监控**：热门商品价格和库存监控

#### 第三阶段：智能化（规模扩大）

1. **商品自动发现**：自动识别新上市的热门商品
2. **评价实时同步**：评价变化实时推送
3. **竞品监控**：自动对比同类商品价格变化

---

## 五、API接口设计

### 4.1 接口规范

- **Base URL**: `https://api.petshop.example.com/v1`
- **认证方式**: JWT (JSON Web Token)，通过 `Authorization: Bearer <token>` 请求头传递
- **请求格式**: `Content-Type: application/json`
- **响应格式**: 统一包装（通过 FastAPI 自定义响应类 + `response_model` 自动序列化）

```python
# app/schemas/common.py —— 统一响应模型

from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Optional, List

T = TypeVar("T")


class Pagination(BaseModel):
    page: int = 1
    page_size: int = 20
    total: int = 0
    total_pages: int = 0


class ApiResponse(BaseModel, Generic[T]):
    code: int = Field(default=0, description="0=成功, 非0=业务错误码")
    message: str = Field(default="success", description="提示信息")
    data: Optional[T] = Field(default=None, description="业务数据")
    pagination: Optional[Pagination] = Field(default=None, description="分页信息")


# 错误响应
class ErrorResponse(BaseModel):
    code: int
    message: str
    detail: Optional[dict] = None


# 分页请求参数
class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
```

### 4.2 用户模块

#### POST /auth/wechat-login
微信登录，换取Token

```python
# app/routers/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.schemas.user import TokenResponse, WechatLoginRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/wechat-login", response_model=TokenResponse)
async def wechat_login(body: WechatLoginRequest):
    """
    微信登录，换取JWT Token
    """
    token, user = await AuthService.wechat_login(
        code=body.code,
        encrypted_data=body.encrypted_data,
        iv=body.iv,
    )
    return {
        "token": token,
        "expires_at": int(time.time()) + 7 * 24 * 3600,
        "user": user,
    }
```

```python
# app/schemas/user.py —— Pydantic请求/响应模型

class WechatLoginRequest(BaseModel):
    code: str = Field(description="微信login接口获取的code")
    encrypted_data: Optional[str] = Field(default=None, description="可选：获取用户信息")
    iv: Optional[str] = Field(default=None, description="可选")


class UserInfo(BaseModel):
    id: int
    nickname: str
    avatar_url: str


class TokenResponse(BaseModel):
    token: str = Field(description="JWT Token")
    expires_at: int = Field(description="过期时间戳")
    user: UserInfo
```

### 4.3 分类模块

#### GET /categories
获取分类树（首页导航用）
```typescript
// Query Parameters
// ?petType=cat  可选，筛选特定宠物类型

// Response
{
  categories: [
    {
      id: 1,
      name: "猫粮",
      petType: "cat",
      icon: "https://...",
      children: [
        { id: 2, name: "干粮", petType: "cat", ... },
        { id: 3, name: "湿粮", petType: "cat", ... }
      ]
    }
  ]
}
```

### 4.4 商品模块

#### GET /products
商品列表（支持筛选和分页）

```python
# app/routers/product.py

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.schemas.product import ProductListResponse, ProductDetailResponse
from app.services.product_service import ProductService
from app.schemas.common import ApiResponse, Pagination, PageParams

router = APIRouter(prefix="/products", tags=["商品"])


@router.get("", response_model=ApiResponse[ProductListResponse])
async def list_products(
    category_id: int = Query(None, description="分类ID"),
    pet_type: str = Query(None, description="宠物类型"),
    brand: str = Query(None, description="品牌筛选"),
    min_price: float = Query(None, description="最低价格"),
    max_price: float = Query(None, description="最高价格"),
    sort: str = Query("rating_desc", description="排序方式"),
    page: PageParams = Depends(),
):
    """商品列表 —— 支持多条件筛选、排序、分页"""
    products, total = await ProductService.search(
        category_id=category_id,
        pet_type=pet_type,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        page=page.page,
        page_size=page.page_size,
    )
    return {
        "code": 0,
        "data": {"products": products},
        "pagination": Pagination(
            page=page.page,
            page_size=page.page_size,
            total=total,
            total_pages=(total + page.page_size - 1) // page.page_size,
        ),
    }
```

```python
# app/schemas/product.py —— Pydantic响应模型

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class PriceRange(BaseModel):
    min: float
    max: float


class Ratings(BaseModel):
    overall: float
    cost_performance: float = Field(alias="costPerformance")
    quality: float
    taste: float
    packaging: float


class ProductSummary(BaseModel):
    """商品列表项（精简）"""
    id: int
    name: str
    brand: str
    price_range: PriceRange
    image_urls: List[str]
    ratings: Ratings
    pros: List[str]
    cons: List[str]
    review_count: int


class ProductDetail(ProductSummary):
    """商品详情（完整）"""
    category: dict
    description: str
    ingredients: List[str]
    specifications: Dict[str, str]
    favorite_count: int


class ProductListResponse(BaseModel):
    products: List[ProductSummary]


class ProductDetailResponse(BaseModel):
    product: ProductDetail
```

#### GET /products/{id}
商品详情

```python
@router.get("/{product_id}", response_model=ApiResponse[ProductDetailResponse])
async def get_product_detail(product_id: int):
    """商品详情 —— 包含完整信息、优缺点、评价统计"""
    product = await ProductService.get_by_id(product_id)
    return {
        "code": 0,
        "data": {"product": product},
    }
```

#### GET /products/:id/reviews
商品评价列表
```typescript
// Query Parameters
// ?rating=5      评分筛选
// ?sort=latest   排序：latest/most_helpful/highest/lowest
// ?page=1&pageSize=10

// Response
{
  reviews: [
    {
      id: 1,
      user: { nickname: "猫奴小王", avatar: "https://..." },
      rating: 5,
      content: "我家猫咪特别爱吃，吃完毛色变亮了！",
      images: ["https://..."],
      tags: ["适口性好", "毛色变亮"],
      isRecommended: true,
      helpfulCount: 23,
      createdAt: "2026-04-15T10:30:00Z"
    }
  ],
  summary: {
    ratingDistribution: { "5": 120, "4": 80, "3": 24, "2": 6, "1": 4 },
    topTags: ["适口性好", "营养均衡", "性价比高", "便便正常"],
    recommendRate: 0.87  // 推荐率
  }
}
```

#### POST /products/:id/reviews
提交评价（需登录）
```typescript
// Request
{
  rating: 5,
  content: "评价内容...",
  images: ["base64或上传后的URL"],  // 可选
  tags: ["适口性好"],               // 可选
  isRecommended: true               // 可选
}

// Response - 创建成功的review对象
```

#### POST /products/:id/favorite
收藏/取消收藏（需登录）
```typescript
// Response
{ isFavorited: true }  // 当前收藏状态
```

#### GET /products/compare
商品对比（支持2-4个商品）
```typescript
// Query Parameters
// ?ids=1,2,3

// Response
{
  products: [
    { id: 1, name: "...", brand: "...", pros: [...], cons: [...], ratings: {...} },
    { id: 2, name: "...", brand: "...", pros: [...], cons: [...], ratings: {...} }
  ],
  comparison: {
    dimensions: ["品牌", "价格区间", "适口性", "营养均衡", "性价比"],
    // 结构化对比数据
  }
}
```

### 4.5 搜索模块

#### GET /search
全局搜索（商品+品类+品牌）
```typescript
// Query Parameters
// ?q=幼猫 干粮      搜索关键词
// ?petType=cat      宠物类型筛选

// Response
{
  suggestions: ["幼猫 干粮 推荐", "幼猫 干粮 皇家", "幼猫 干粮 性价比"],
  products: [...],
  categories: [{ id: 2, name: "干粮" }],
  brands: ["皇家", "渴望", "爱肯拿"]
}
```

### 4.6 Agent对话模块（核心）

#### POST /chat/sessions
创建新会话
```typescript
// Request
{
  title?: string;      // 可选，默认自动生成
  systemPrompt?: string; // 可选，定制系统提示
}

// Response
{
  sessionId: 1,
  title: "新对话",
  createdAt: "2026-05-10T08:00:00Z"
}
```

#### GET /chat/sessions
获取会话列表（需登录）
```typescript
// Response
{
  sessions: [
    { id: 1, title: "3个月幼猫吃什么粮", messageCount: 12, updatedAt: "2026-05-10T10:00:00Z" },
    { id: 2, title: "猫粮性价比对比", messageCount: 8, updatedAt: "2026-05-09T15:30:00Z" }
  ]
}
```

#### GET /chat/sessions/:id/messages
获取会话消息历史
```typescript
// Response
{
  messages: [
    { id: 1, role: "user", content: "3个月幼猫推荐什么猫粮？", createdAt: "..." },
    { id: 2, role: "assistant", content: "对于3个月幼猫，建议选择...", toolCalls: [...], createdAt: "..." }
  ]
}
```

#### POST /chat/stream
发送消息（流式SSE接口）—— **核心Agent交互接口**

```python
# app/routers/chat.py —— 流式SSE接口

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

from app.agents.agent import AgentService
from app.schemas.chat import ChatMessageRequest
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Agent对话"])


@router.post("/stream")
async def chat_stream(
    body: ChatMessageRequest,
    agent_service: AgentService = Depends(),
):
    """
    Agent对话 —— SSE流式响应

    响应格式：
    ```
    event: thinking
    data: {"message": "正在分析您的需求..."}

    event: tool_call
    data: {"tool": "search_products", "args": {"pet_type": "cat", "max_price": 200}}

    event: tool_result
    data: {"tool": "search_products", "result": [...]}

    event: message
    data: {"content": "根据您的需求...", "isComplete": true}

    event: done
    data: {"messageId": 42, "tokensUsed": 256}
    ```
    """
    async def event_generator():
        async for event in agent_service.chat_stream(
            session_id=body.session_id,
            user_input=body.content,
            context=body.context.model_dump() if body.context else {},
        ):
            yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```

```python
# app/schemas/chat.py —— Pydantic模型

class ChatContext(BaseModel):
    """对话上下文"""
    current_product_id: Optional[int] = Field(default=None, description="当前浏览的商品ID")
    pet_type: Optional[str] = Field(default=None, description="当前宠物类型")


class ChatMessageRequest(BaseModel):
    """发送消息请求"""
    session_id: int = Field(description="会话ID")
    content: str = Field(min_length=1, max_length=2000, description="消息内容")
    context: Optional[ChatContext] = Field(default=None, description="可选上下文")
```

#### POST /chat/sessions/:id/clear
清空会话历史
```typescript
// Response
{ success: true }
```

### 4.7 Agent工具接口（内部调用）

Agent可调用的工具集：

| 工具名 | 描述 | 入参 | 出参 |
|--------|------|------|------|
| `search_products` | 商品检索 | petType, category, keywords, priceRange | 商品列表 |
| `get_product_detail` | 商品详情 | productId | 完整商品信息 |
| `get_reviews_summary` | 评价摘要 | productId | 评价统计、标签 |
| `compare_products` | 商品对比 | productIds[] | 对比分析 |
| `get_price_trend` | 价格走势 | productId, period | 历史价格数据 |
| `web_search` | 网络搜索 | query | 搜索结果摘要 |
| `recommend_by_pet` | 按宠物推荐 | petType, age, weight, specialNeeds | 推荐商品 |

### 4.8 错误码定义

| Code | 说明 | 处理建议 |
|------|------|----------|
| 0 | 成功 | - |
| 1001 | 参数错误 | 检查请求参数 |
| 1002 | 未授权 | 重新登录 |
| 1003 | 资源不存在 | 检查ID是否正确 |
| 1004 | 操作频繁 | 稍后重试 |
| 2001 | Agent服务繁忙 | 提示用户稍后重试 |
| 2002 | Agent Token不足 | 提示联系管理员 |
| 5000 | 服务器内部错误 | 记录日志，联系开发 |

---

## 六、Agent设计

### 5.1 Agent架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Agent 架构                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐    │
│   │   用户输入    │────►│   意图识别层      │────►│   执行决策    │    │
│   │   (自然语言)  │     │   Intent Router   │     │   ReAct Loop │    │
│   └──────────────┘     └──────────────────┘     └──────┬───────┘    │
│                                                        │            │
│                       ┌────────────────────────────────┘            │
│                       ▼                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│   │   直接回答    │◄───│   工具调用    │◄───│   结果整合    │        │
│   │   (闲聊/常识) │    │   Tool Call  │    │   Synthesize  │        │
│   └──────────────┘    └──────┬───────┘    └──────┬───────┘        │
│                              │                    │                 │
│         ┌────────────────────┼────────────────────┘                 │
│         │                    │                                      │
│         ▼                    ▼                                      │
│   ┌──────────┐      ┌──────────────┐     ┌──────────────┐         │
│   │  LLM     │      │  数据库查询   │     │  搜索引擎     │         │
│   │  推理    │      │  PostgreSQL  │     │  Web Search  │         │
│   └──────────┘      └──────────────┘     └──────────────┘         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 System Prompt 设计

```
你是一位专业的宠物用品顾问，擅长根据用户需求推荐合适的宠物用品。

你的能力包括：
1. 根据宠物类型、年龄、体重、健康状况推荐合适的食品、用品
2. 对比不同品牌产品的优缺点
3. 分析商品评价，给出购买建议
4. 解答养宠过程中的常见问题

工作原则：
- 回答需基于数据库中的真实产品信息，不编造不存在的商品
- 推荐时说明理由，引用具体产品数据
- 对不确定的问题坦诚告知，不猜测
- 使用中文回答，语气友好专业

当前对话上下文：
- 用户宠物类型：{{petType}}
- 当前浏览商品：{{currentProduct}}
- 对话历史：{{history}}
```

### 5.3 ReAct 执行流程

```
用户: "3个月幼猫推荐什么猫粮？预算200"

Agent思考:
1. 识别意图：产品推荐（幼猫粮，预算200）
2. 调用工具 search_products(petType=cat, category=猫粮, ageStage=幼猫, maxPrice=200)
3. 获取结果：皇家K36(¥168), 渴望幼猫(¥189), 网易严选(¥129)
4. 调用工具 get_reviews_summary(productIds=[1,2,3])
5. 获取评价摘要：皇家适口性好但价格高，渴望蛋白质高但部分软便，网易性价比高但品质一般
6. 综合生成推荐回答，附产品对比
```

### 5.4 流式响应设计

采用SSE（Server-Sent Events）实现打字机效果，提升用户体验：

| Event | 说明 |
|-------|------|
| `thinking` | Agent思考中提示 |
| `tool_call` | 开始调用工具 |
| `tool_result` | 工具返回结果 |
| `message` | 生成内容片段（可多次） |
| `done` | 生成完成，附元数据 |
| `error` | 发生错误 |

---

## 七、前端页面设计

### 6.1 页面清单

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/pages/index/index` | 宠物类型选择、推荐内容、快捷入口 |
| 分类页 | `/pages/category/category` | 宠物种类×品类二级导航 |
| 商品列表 | `/pages/product/list` | 筛选、排序、分页 |
| 商品详情 | `/pages/product/detail` | 信息、评价、对比入口 |
| 商品对比 | `/pages/product/compare` | 多商品横向对比 |
| 评价列表 | `/pages/review/list` | 筛选、排序 |
| 搜索页 | `/pages/search/search` | 搜索建议、历史记录、热门搜索 |
| 对话列表 | `/pages/chat/list` | 历史会话管理 |
| 对话详情 | `/pages/chat/detail` | Agent对话界面（核心页面） |
| 我的 | `/pages/mine/mine` | 个人信息、收藏、设置 |
| 收藏页 | `/pages/mine/favorites` | 收藏商品列表 |

### 6.2 核心页面布局

#### 首页
```
┌──────────────────────────────┐
│ [Logo]  宠物好物助手  [搜索]  │  顶部栏
├──────────────────────────────┤
│                              │
│  [🐱 猫咪]  [🐶 狗狗]        │  宠物类型快速切换
│  [🐦 鸟类]  [🐟 水族]        │  （横向滚动）
│                              │
├──────────────────────────────┤
│  推荐分类                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 主粮  │ │ 零食  │ │ 玩具  │ │  分类入口（网格）
│  │ 🍖   │ │ 🍪   │ │ 🧸   │ │
│  └──────┘ └──────┘ └──────┘ │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 用品  │ │ 保健  │ │ 医疗  │ │
│  │ 🛁   │ │ 💊   │ │ 🏥   │ │
│  └──────┘ └──────┘ └──────┘ │
├──────────────────────────────┤
│  热门推荐                    │
│  ┌────────────────────────┐  │
│  │ [图片] 皇家猫粮 K36      │  │  商品卡片（横向滚动）
│  │ ⭐4.5  ¥168  💬234      │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ [图片] 渴望六种鱼        │  │
│  │ ⭐4.7  ¥389  💬567      │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  [🏠]  [📂]  [💬]  [👤]    │  底部TabBar
└──────────────────────────────┘
```

#### 商品详情页
```
┌──────────────────────────────┐
│ [←] 皇家猫粮 K36      [⭐]  │  导航栏
├──────────────────────────────┤
│                              │
│         [商品大图]            │  轮播图
│                              │
├──────────────────────────────┤
│ 皇家猫粮 K36 室内成猫粮       │
│ ¥128 ~ ¥458                 │  价格区间
│ ⭐4.5  (234条评价)  87%推荐   │  评分
├──────────────────────────────┤
│  优缺点                      │
│  ✅ 营养均衡  ✅ 适口性好     │
│  ✅ 易消化                   │
│  ❌ 价格偏高  ❌ 包装易破     │
├──────────────────────────────┤
│  评分详情                     │
│  综合 4.5  | 性价比 4.0      │
│  质量 4.6  | 适口性 4.3      │
├──────────────────────────────┤
│  成分                        │
│  鸡肉粉、大米、玉米蛋白粉...   │
├──────────────────────────────┤
│  真实评价 (234)              │
│  ┌────────────────────────┐  │
│  │ 猫奴小王 ⭐⭐⭐⭐⭐       │  │  评价卡片
│  │ "我家猫咪特别爱吃..."    │  │
│  │ #适口性好 #毛色变亮     │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  [问AI助手]  [加入对比]       │  底部操作栏
└──────────────────────────────┘
```

#### Agent对话页（核心）
```
┌──────────────────────────────┐
│ [←] AI宠物顾问       [...]  │  导航栏
├──────────────────────────────┤
│                              │
│ 🤖 你好！我是你的宠物用品    │
│    顾问，有什么可以帮你的？   │  欢迎消息
│                              │
│                    ┌──────┐  │
│                    │3个月幼│  │  用户消息（右对齐）
│                    │猫推荐 │  │
│                    │什么粮？│ │
│                    └──────┘  │
│                              │
│ 🤖 好的，我来帮您找找适合     │
│    3个月幼猫的主粮...         │  Agent思考中（闪烁动画）
│    [正在搜索相关产品...]      │  工具调用提示
│                              │
│ 🤖 根据您的需求，推荐以下     │
│    几款200元内的幼猫粮：      │
│                              │
│    ┌──────────────────┐     │
│    │ 🏷️ 皇家幼猫粮K36  │     │  商品推荐卡片
│    │ ⭐4.5  ¥168       │     │  （可点击跳转）
│    │ 营养均衡，适口性好 │     │
│    └──────────────────┘     │
│    ┌──────────────────┐     │
│    │ 🏷️ 渴望幼猫粮     │     │
│    │ ⭐4.7  ¥189       │     │
│    │ 高蛋白，天然粮    │     │
│    └──────────────────┘     │
│                              │
│    需要我详细对比这两款吗？   │
│                              │
│  ┌────────────────────────┐  │
│  │  推荐幼猫吃什么品牌？    │  │  快捷问题（可横向滚动）
│  │  200预算哪款性价比高？   │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│ [🎙️] 请输入问题...    [发送] │  输入栏
└──────────────────────────────┘
```

### 6.3 全局交互

#### 唤起Agent的入口
- 商品详情页：悬浮按钮（"问AI"）
- 首页：底部Tab中间按钮（"💬"图标）
- 对比页："让AI帮我选"按钮
- 任意页面下拉：快捷搜索栏输入"?"或点击AI图标

#### 快捷问题（Quick Actions）
对话界面底部展示预设快捷问题：
- "{{petType}}幼猫吃什么好？"
- "皇家和渴望哪个好？"
- "200元预算推荐"
- "适口性好的猫粮"

---

## 八、服务端架构

### 7.1 项目结构

```
pet-shop-api/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI应用入口
│   ├── config.py                   # 配置管理（Pydantic Settings）
│   ├── dependencies.py             # 全局依赖注入
│   ├── database.py                 # SQLAlchemy引擎/会话管理
│   ├── models/                     # ORM模型（SQLAlchemy）
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── product.py
│   │   ├── review.py
│   │   ├── favorite.py
│   │   ├── chat_session.py
│   │   └── chat_message.py
│   ├── schemas/                    # Pydantic模型（请求/响应DTO）
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── product.py
│   │   ├── review.py
│   │   └── chat.py
│   ├── routers/                    # API路由（按模块组织）
│   │   ├── __init__.py
│   │   ├── auth.py                 # 认证路由
│   │   ├── category.py             # 分类路由
│   │   ├── product.py              # 商品路由
│   │   ├── review.py               # 评价路由
│   │   ├── favorite.py             # 收藏路由
│   │   ├── search.py               # 搜索路由
│   │   └── chat.py                 # Agent对话路由（核心）
│   ├── services/                   # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── product_service.py
│   │   ├── review_service.py
│   │   └── chat_service.py
│   ├── agents/                     # Agent模块（核心）
│   │   ├── __init__.py
│   │   ├── agent.py                # ReAct Agent主逻辑
│   │   ├── tools.py                # 工具注册与定义
│   │   ├── prompts.py              # 提示词模板
│   │   └── streaming.py            # SSE流式响应工具
│   ├── middleware/                 # 中间件
│   │   ├── __init__.py
│   │   ├── auth.py                 # JWT认证中间件
│   │   ├── rate_limit.py           # 限流中间件
│   │   └── logging.py              # 请求日志中间件
│   └── utils/                      # 工具函数
│       ├── __init__.py
│       ├── jwt_util.py
│       └── wechat_util.py
├── alembic/                        # 数据库迁移
│   ├── versions/
│   └── env.py
├── tests/                          # 测试
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── pyproject.toml                  # Poetry/PDM依赖管理
└── .env                            # 环境变量
```

### 7.2 核心模块说明

#### 7.2.1 Agent模块（核心）

```python
# app/agents/agent.py

from fastapi import Depends
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db_session
from app.agents.tools import TOOL_REGISTRY
from app.agents.prompts import SYSTEM_PROMPT_TEMPLATE
from app.services.chat_service import ChatService


class AgentService:
    """Agent对话服务 —— 处理ReAct推理与SSE流式输出"""

    def __init__(
        self,
        db: AsyncSession = Depends(get_db_session),
        chat_service: ChatService = Depends(),
    ):
        self.db = db
        self.chat_service = chat_service
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.3,
            streaming=True,
        )
        self.tools = [
            StructuredTool.from_function(t["func"], name=t["name"], description=t["description"])
            for t in TOOL_REGISTRY
        ]
        self.agent_executor = self._build_agent()

    def _build_agent(self) -> AgentExecutor:
        """构建ReAct Agent执行器"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT_TEMPLATE),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        agent = create_openai_tools_agent(self.llm, self.tools, prompt)
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            max_iterations=5,
            verbose=True,
            handle_parsing_errors=True,
        )

    async def chat_stream(self, session_id: int, user_input: str, context: dict):
        """
        流式处理用户输入，产出SSE事件
        事件类型: thinking / tool_call / tool_result / message / done
        """
        # 1. 获取对话历史
        history = await self.chat_service.get_history(session_id)

        # 2. 构建系统提示（注入上下文）
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            pet_type=context.get("pet_type", "未知"),
            current_product=context.get("current_product_name", ""),
        )

        # 3. 执行Agent，流式产出事件
        async for event in self._run_agent_stream(user_input, history, system_prompt):
            yield event

    async def _run_agent_stream(self, query: str, history: list, system_prompt: str):
        """运行Agent并产出SSE事件"""
        full_response = ""

        # 思考阶段
        yield {"event": "thinking", "data": {"message": "正在分析您的需求..."}}

        # 执行Agent
        result = await self.agent_executor.ainvoke({
            "input": query,
            "chat_history": history,
        })

        output = result.get("output", "")

        # 模拟流式输出（逐字符推送，实现打字机效果）
        import asyncio
        for char in output:
            full_response += char
            yield {"event": "message", "data": {"content": full_response, "isComplete": False}}
            await asyncio.sleep(0.01)

        # 完成事件
        yield {
            "event": "done",
            "data": {"messageId": result.get("run_id"), "tokensUsed": result.get("usage", {}).get("total_tokens")},
        }

        # 保存消息到数据库
        await self.chat_service.save_message(session_id, "assistant", output)
```

#### 7.2.2 工具注册表

```python
# app/agents/tools.py

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from typing import Optional, List

from app.services.product_service import ProductService
from app.services.review_service import ReviewService


# ── 工具参数定义（Pydantic） ──

class SearchProductsInput(BaseModel):
    pet_type: str = Field(description="宠物类型", enum=["cat", "dog", "bird", "fish"])
    category: Optional[str] = Field(default=None, description="品类名称")
    keywords: Optional[str] = Field(default=None, description="关键词")
    price_min: Optional[float] = Field(default=None, description="最低价格")
    price_max: Optional[float] = Field(default=None, description="最高价格")
    limit: int = Field(default=5, description="返回数量")


class GetProductDetailInput(BaseModel):
    product_id: int = Field(description="商品ID")


class GetReviewsSummaryInput(BaseModel):
    product_id: int = Field(description="商品ID")


class CompareProductsInput(BaseModel):
    product_ids: List[int] = Field(description="要对比的商品ID列表（2-4个）", min_length=2, max_length=4)


class WebSearchInput(BaseModel):
    query: str = Field(description="搜索关键词")


# ── 工具函数 ──

async def search_products(pet_type: str, category: str = None, keywords: str = None,
                          price_min: float = None, price_max: float = None, limit: int = 5) -> str:
    """根据条件搜索商品，返回符合用户需求的宠物用品列表"""
    # 调用ProductService查询数据库
    results = await ProductService.search(
        pet_type=pet_type,
        category=category,
        keywords=keywords,
        price_min=price_min,
        price_max=price_max,
        limit=limit,
    )
    return "\n".join(
        [f"- {p.name}（{p.brand}）¥{p.price_min}起 评分{p.ratings['overall']}"
         for p in results]
    )


async def get_product_detail(product_id: int) -> str:
    """获取商品详细信息，包括规格、成分、优缺点"""
    product = await ProductService.get_by_id(product_id)
    return (
        f"商品：{product.name}（{product.brand}）\n"
        f"价格：¥{product.price_min}~¥{product.price_max}\n"
        f"评分：{product.ratings['overall']}/5\n"
        f"优点：{', '.join(product.pros)}\n"
        f"缺点：{', '.join(product.cons)}\n"
        f"成分：{', '.join(product.ingredients[:5])}..."
    )


async def get_reviews_summary(product_id: int) -> str:
    """获取商品评价摘要，了解用户真实反馈"""
    summary = await ReviewService.get_summary(product_id)
    return (
        f"评价数：{summary.total} | 好评率：{summary.recommend_rate}%\n"
        f"高频标签：{', '.join(summary.top_tags)}\n"
        f"好评关键词：{', '.join(summary.positive_keywords)}\n"
        f"差评关键词：{', '.join(summary.negative_keywords)}"
    )


async def compare_products(product_ids: List[int]) -> str:
    """对比多个商品，分析各自优劣"""
    products = await ProductService.get_by_ids(product_ids)
    result = []
    for p in products:
        result.append(
            f"【{p.name}】¥{p.price_min}起 | {p.ratings['overall']}分\n"
            f"  优点：{', '.join(p.pros)}\n"
            f"  缺点：{', '.join(p.cons)}"
        )
    return "\n".join(result)


async def web_search(query: str) -> str:
    """搜索互联网获取最新信息，补充知识库未覆盖的内容"""
    # 接入搜索引擎API（如SerpAPI/Bing Search）
    from app.utils.search import search_web
    results = await search_web(query)
    return "\n".join([f"- {r.title}: {r.snippet}" for r in results[:3]])


# ── 工具注册表 ──

TOOL_REGISTRY = [
    {
        "name": "search_products",
        "description": "根据条件搜索商品，用于查找符合用户需求的宠物用品",
        "func": search_products,
        "args_schema": SearchProductsInput,
    },
    {
        "name": "get_product_detail",
        "description": "获取商品详细信息，包括规格、成分、优缺点",
        "func": get_product_detail,
        "args_schema": GetProductDetailInput,
    },
    {
        "name": "get_reviews_summary",
        "description": "获取商品评价摘要，了解用户真实反馈",
        "func": get_reviews_summary,
        "args_schema": GetReviewsSummaryInput,
    },
    {
        "name": "compare_products",
        "description": "对比多个商品，分析各自优劣",
        "func": compare_products,
        "args_schema": CompareProductsInput,
    },
    {
        "name": "web_search",
        "description": "搜索互联网获取最新信息，用于补充知识库未覆盖的内容",
        "func": web_search,
        "args_schema": WebSearchInput,
    },
]
```

### 7.3 中间件与依赖项

FastAPI使用中间件（Middleware）处理请求/响应生命周期，使用依赖项（Depends）实现认证、限流等功能：

```python
# app/main.py —— 中间件注册

from fastapi import FastAPI
from app.middleware.auth import jwt_auth_dependency
from app.middleware.rate_limit import rate_limit_dependency
from app.middleware.logging import log_requests

app = FastAPI(title="宠物好物助手 API", version="1.0.0")

# 全局中间件
app.middleware("http")(log_requests)           # 请求/响应日志
app.middleware("http")(add_request_id)          # 注入请求追踪ID

# 路由级依赖（自动注入）
@app.post("/chat/stream", dependencies=[
    Depends(jwt_auth_dependency),               # JWT鉴权
    Depends(rate_limit_dependency(max_calls=20, period=60)),  # 限流 20次/分钟
])
async def chat_stream(...):
    ...
```

| 机制 | 实现方式 | 用途 | 应用范围 |
|------|----------|------|----------|
| **JWT鉴权** | `Depends(jwt_auth)` | 验证请求Token | 除登录外的所有接口 |
| **限流** | `Depends(rate_limit)` + Redis | IP/用户级限流 | 全局，Agent接口更严格 |
| **请求日志** | `@app.middleware("http")` | 请求/响应日志 | 全局 |
| **响应包装** | `@app.exception_handler` + 自定义响应 | 统一响应格式 | 全局 |
| **数据缓存** | `@cache(expire=300)` + Redis | 热点数据缓存 | 商品列表、分类 |
| **CORS** | `CORSMiddleware` | 跨域处理 | 全局 |

---

## 九、安全设计

### 8.1 认证与授权

- **微信小程序登录**：`wx.login()`获取code → 服务端用code换取openid → 生成JWT
- **JWT设计**：`{ userId, openid, iat, exp }`，有效期7天，支持刷新
- **Token刷新**：过期前自动刷新，无感续期
- **权限控制**：普通用户 / 管理员 两种角色

### 8.2 数据安全

- **传输安全**：全站HTTPS，WSS（WebSocket Secure）
- **敏感信息**：数据库密码、API Key等使用环境变量，不提交代码
- **SQL注入**：SQLAlchemy ORM参数化查询 + SQL组合使用text()绑定参数，杜绝注入
- **XSS防护**：输入过滤，输出转义
- **Rate Limiting**：Agent接口限制20次/分钟，防止滥用

### 8.3 隐私合规

- 收集用户信息前获取授权（微信scope）
- 评价支持匿名发布
- 对话记录保留30天后自动清理（可配置）
- 符合《个人信息保护法》要求

---

## 十、部署架构

### 9.1 Docker Compose（开发/测试环境）

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ENV=production
      - DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/petshop
      - REDIS_URL=redis://redis:6379
      - AI_API_KEY=${AI_API_KEY}
    depends_on:
      - db
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=petshop
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  meilisearch:
    image: getmeili/meilisearch:latest
    volumes:
      - meili_data:/meili_data
    ports:
      - "7700:7700"

volumes:
  postgres_data:
  redis_data:
  meili_data:
```

### 9.2 生产部署建议

| 组件 | 推荐方案 | 说明 |
|------|----------|------|
| 小程序前端 | 微信开发者工具上传 | 微信小程序官方部署 |
| API服务 | 阿里云ECS / 腾讯云CVM | 2核4G起步，支持Docker |
| 数据库 | 阿里云RDS PostgreSQL | 主从备份，自动扩容 |
| 缓存 | 阿里云Redis | 高可用版 |
| 对象存储 | 阿里云OSS / 腾讯云COS | 商品图片存储 |
| CDN | 阿里云CDN | 静态资源加速 |
| 监控 | 阿里云ARMS / Sentry | 性能监控与错误追踪 |
| CI/CD | GitHub Actions → 服务器 | 自动化部署 |

---

## 十一、开发计划

### Phase 1: MVP版本（4-6周）

| 周次 | 任务 | 产出 |
|------|------|------|
| W1 | 项目初始化（FastAPI + SQLAlchemy + Alembic）、数据库设计、基础架构 | 可运行的空壳项目 |
| W2 | 分类模块、商品模块（CRUD+列表+详情） | 商品浏览功能 |
| W3 | 评价模块、收藏模块、搜索模块 | 完整商品浏览体验 |
| W4 | Agent模块（对话+基础工具） | AI对话功能 |
| W5 | 微信小程序前端（首页+分类+商品+对话） | 可用的小程序 |
| W6 | 联调测试、性能优化、Bug修复 | MVP版本上线 |

### Phase 2: 增强版本（4周）

- 商品对比功能
- 评价图片上传
- Agent工具扩展（价格走势、更多搜索源）
- 用户画像（根据宠物信息个性化推荐）
- 管理后台（H5）

### Phase 3: 持续迭代

- 社区功能（问答、晒单）
- 优惠活动聚合
- 多平台支持（APP、H5）
- 数据智能（推荐算法优化）

---

## 十二、附录

### 11.1 技术选型变更记录

| 日期 | 变更项 | 原方案 | 新方案 | 理由 |
|------|--------|--------|--------|------|
| 2026-05-10 | 初始版本 | - | 当前方案 | 初始设计 |
| 2026-05-10 | 后端技术栈变更 | Node.js 20 + NestJS 10 + Prisma + LangChain.js | Python 3.11 + FastAPI 0.110 + SQLAlchemy 2.0 + LangChain Python | FastAPI异步支持更契合SSE流式Agent对话，Python AI生态更成熟 |

### 11.2 参考资料

- [Taro 文档](https://taro.zone/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [LangChain Python 文档](https://python.langchain.com/)
- [Pydantic 文档](https://docs.pydantic.dev/)
- [Alembic 文档](https://alembic.sqlalchemy.org/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

---

> 本文档由 AI 辅助生成，后续开发过程中需根据实际业务需求持续迭代更新。
