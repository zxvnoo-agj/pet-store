# Pet Store 项目参考文档

> 最后更新：2026-05-23 | 基于 `005-spu-migration` 分支
>
> 文档自动更新规则：每次完成功能修改后，将新增/变更同步至此文件。

---

## 1. 项目架构

```
pet-store/
├── backend/          # FastAPI (Python 3.12+, SQLAlchemy async, PostgreSQL)
│   ├── app/
│   │   ├── agents/       # AI Agent (SSE streaming)
│   │   ├── api/v1/       # REST API 路由
│   │   ├── core/         # 配置、数据库、依赖注入
│   │   ├── models/       # SQLAlchemy ORM 模型
│   │   ├── schemas/      # Pydantic 请求/响应模型
│   │   └── services/     # 业务逻辑层
│   ├── alembic/          # 数据库迁移
│   └── venv/             # Python 虚拟环境
├── frontend/         # Taro 3.x (React + Tailwind) 小程序
│   └── src/
│       ├── pages/        # 页面组件
│       ├── components/   # 公共组件 (含 Icons.tsx 图标组件)
│       ├── stores/       # Zustand 状态管理
│       └── services/     # API 客户端
└── admin/            # React + TypeScript 管理后台
```

**技术栈**：
- 后端：FastAPI + SQLAlchemy (async) + PostgreSQL + Redis (缓存)
- 前端：Taro 3 + React + TailwindCSS + Zustand
- AI：OpenAI GPT-4o + function calling (LangChain)
- 管理后台：React + Vite + TypeScript

---

## 2. 数据库表结构

### 2.1 商品相关

#### `spus` — 标准商品单元 (核心表)
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| category_id | INT FK → categories.id | 分类ID |
| brand | VARCHAR(64) NOT NULL | 品牌 |
| name | VARCHAR(255) NOT NULL | 商品名称 |
| model | VARCHAR(128) NOT NULL | 型号/规格 |
| pet_type | VARCHAR(16) NOT NULL DEFAULT 'cat' | 适用宠物 (cat/dog) |
| description | TEXT | 商品描述 |
| ingredients | JSONB DEFAULT '[]' | 主要成分列表 |
| nutrition | JSONB DEFAULT '{}' | 营养成分 (如 protein, fat) |
| pros | JSONB DEFAULT '[]' | 优点列表 |
| cons | JSONB DEFAULT '[]' | 缺点列表 |
| extra_attrs | JSONB DEFAULT '{}' | 扩展属性 |
| price_min | NUMERIC(10,2) | 最低价格 |
| price_max | NUMERIC(10,2) | 最高价格 |
| currency | VARCHAR(8) DEFAULT 'CNY' | 货币 |
| image_urls | JSONB DEFAULT '[]' | 图片URL列表 |
| status | VARCHAR(16) DEFAULT 'active' | 状态 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 (自动) |

约束：`uq_spus_brand_category_name_model` (brand, category_id, name, model 唯一)
约束：`ck_spus_pet_type` (pet_type IN ('cat', 'dog'))

#### `spu_listings` — SPU 商家清单 (比价）
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| spu_id | INT FK → spus.id ON DELETE CASCADE | 所属SPU |
| platform | VARCHAR(32) NOT NULL | 平台 (pdd, jd, taobao) |
| shop_name | VARCHAR(128) NOT NULL | 店铺名称 |
| goods_id | VARCHAR(64) | 平台商品ID |
| title | VARCHAR(512) NOT NULL | 商品标题 |
| price | NUMERIC(10,2) NOT NULL | 当前价格 |
| original_price | NUMERIC(10,2) | 原价 |
| url | VARCHAR(2048) NOT NULL | 商品链接 |
| image_url | VARCHAR(2048) | 商品图片 |
| sales_count | INT | 销量 |
| goods_sign | VARCHAR(128) | PDD推广签名 |
| sku_specs | JSONB | SKU规格 |
| service_tags | JSONB | 服务标签 |
| match_confidence | NUMERIC(5,4) | 匹配置信度 [0,1] |
| match_status | VARCHAR(16) DEFAULT 'linked' | 匹配状态 (linked/candidate/rejected/unmatched) |
| last_synced_at | TIMESTAMPTZ | 最后同步时间 |

约束：`uq_spu_listings_platform_goods_id` (platform, goods_id 唯一)

#### `categories` — 商品分类
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| name | VARCHAR(64) NOT NULL | 分类名称 |
| pet_type | VARCHAR(32) NOT NULL | 宠物类型 |
| parent_id | INT FK → categories.id | 父分类 |
| level | INT DEFAULT 1 | 层级 |
| icon | VARCHAR(128) | 图标 |
| sort_order | INT DEFAULT 0 | 排序 |
| is_active | BOOLEAN DEFAULT true | 是否启用 |

#### `reviews` — 商品评价
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| spu_id | INT FK → spus.id | 关联SPU |
| external_note_id | VARCHAR(64) | 外部笔记ID (XHS) |
| author | VARCHAR(64) | 作者 |
| note_published_at | TIMESTAMPTZ | 笔记发布时间 |
| note_likes | INT | 笔记点赞数 |
| user_id | INT FK → users.id | 关联用户 |
| rating | NUMERIC(2,1) NOT NULL | 评分 (1-5) |
| content | TEXT NOT NULL | 评价内容 |
| images | JSONB DEFAULT '[]' | 图片 |
| tags | JSONB DEFAULT '[]' | 标签 |
| is_recommended | BOOLEAN | 是否推荐 |
| source | VARCHAR(32) DEFAULT 'user' | 来源 (user/xhs) |
| source_url | VARCHAR(256) | 来源URL |
| helpful_count | INT DEFAULT 0 | 有用数 |
| status | VARCHAR(16) DEFAULT 'pending' | 状态 (pending/approved/rejected) |
| llm_review_result | JSONB | AI分析结果 |

### 2.2 用户相关

#### `users` — 用户
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| openid | VARCHAR(64) NOT NULL UNIQUE | 微信OpenID |
| unionid | VARCHAR(64) | 微信UnionID |
| nickname | VARCHAR(64) | 昵称 |
| avatar_url | VARCHAR(256) | 头像 |
| pet_types | JSONB DEFAULT '[]' | 宠物类型 (如 ["cat"]) |
| profile | JSONB DEFAULT '{}' | 用户档案 |
| is_admin | BOOLEAN DEFAULT false | 是否管理员 |

#### `favorites` — 用户收藏
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| user_id | INT FK → users.id | 用户ID |
| spu_id | INT FK → spus.id | SPU ID |

约束：`uq_user_spu_favorite` (user_id, spu_id 唯一)

### 2.3 AI对话相关

#### `chat_sessions` — 对话会话
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| user_id | INT FK → users.id | 用户 (可选) |
| title | VARCHAR(128) | 会话标题 |
| model | VARCHAR(32) DEFAULT 'gpt-4o' | 模型 |
| system_prompt | TEXT | 系统提示词 |
| session_metadata | JSONB DEFAULT '{}' | 会话元数据 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 (自动) |

#### `chat_messages` — 对话消息
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| session_id | INT FK → chat_sessions.id | 会话ID |
| role | VARCHAR(16) NOT NULL | 角色 (user/assistant) |
| content | TEXT NOT NULL | 消息内容 |
| tool_calls | JSONB | 工具调用记录 |
| tokens_used | INT | Token消耗 |
| referenced_spus | JSONB DEFAULT '[]' | 引用的SPU ID列表 |
| created_at | TIMESTAMPTZ | 创建时间 |

### 2.4 数据采集相关

#### `data_sources` — 数据源
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| name | VARCHAR(64) NOT NULL | 数据源名称 |
| platform | VARCHAR(32) NOT NULL | 平台 (jd/taobao/tmall/pdd/xhs) |
| config | JSONB DEFAULT '{}' | 配置 (API keys等) |
| is_active | BOOLEAN DEFAULT true | 是否激活 |
| last_sync_at | TIMESTAMPTZ | 最后同步时间 |
| sync_interval_minutes | INT DEFAULT 60 | 同步间隔(分钟) |

#### `data_fetch_jobs` — 采集任务
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| data_source_id | INT FK → data_sources.id | 数据源 |
| job_type | VARCHAR(32) NOT NULL | 任务类型 (price/review/discovery) |
| collection_type | VARCHAR(16) DEFAULT 'full' | 采集方式 (full/incremental) |
| status | VARCHAR(16) DEFAULT 'pending' | 状态 (pending/running/completed/failed) |
| params | JSONB DEFAULT '{}' | 参数 |
| result | JSONB | 结果 |
| error_message | TEXT | 错误信息 |
| spu_id | INT FK → spus.id | 关联SPU |

#### `search_strategies` — 搜索策略
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| data_source_id | INT FK → data_sources.id | 数据源 |
| name | VARCHAR(64) NOT NULL | 策略名称 |
| keywords | JSONB DEFAULT '[]' | 关键词 |
| price_min/price_max | INT | 价格范围 |
| sort_type | INT DEFAULT 0 | 排序 |
| max_items | INT DEFAULT 100 | 最大采集数 |
| brand_filter | JSONB DEFAULT '[]' | 品牌过滤 |

#### `external_products` — 外部商品映射
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| spu_id | INT FK → spus.id | 关联SPU |
| source_id | INT FK → data_sources.id | 数据源 |
| platform | VARCHAR(32) DEFAULT 'pdd' | 平台 |
| external_id | VARCHAR(64) NOT NULL | 外部ID |
| external_url | VARCHAR(2048) | 外部URL |
| pid | VARCHAR(64) | PDD推广位ID |
| is_primary | BOOLEAN DEFAULT true | 是否主数据源 |

#### `price_history` — 价格历史
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| spu_id | INT FK → spus.id | 关联SPU |
| source_id | INT FK → data_sources.id | 数据源 |
| price | NUMERIC(10,2) NOT NULL | 价格 |
| group_price | NUMERIC(10,2) | 拼单价 |
| single_price | NUMERIC(10,2) | 单买价 |
| coupon_discount | NUMERIC(10,2) | 优惠券 |
| recorded_at | TIMESTAMPTZ | 记录时间 |

#### `promotion_url_cache` — 推广链接缓存
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| goods_sign | VARCHAR(64) NOT NULL | PDD goods_sign |
| pid | VARCHAR(64) NOT NULL | PDD推广位 |
| short_url | VARCHAR(256) NOT NULL | 短链接 |
| expires_at | TIMESTAMPTZ NOT NULL | 过期时间 |

#### `crawled_products` — 爬取原始数据
| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| goods_id | VARCHAR(64) NOT NULL UNIQUE | 商品ID |
| title | VARCHAR(512) | 标题 |
| raw_content | TEXT NOT NULL | 原始内容 |
| raw_text | TEXT | 提取文本 |
| raw_html | TEXT | 原始HTML |
| images | JSONB DEFAULT '[]' | 图片 |
| import_status | VARCHAR(16) DEFAULT 'active' | 导入状态 |

---

## 3. REST API 接口

> 所有接口前缀：`/v1` | 统一响应格式：
> ```json
> { "code": 0, "message": "success", "data": {}, "pagination": null }
> ```

### 3.1 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/wechat-login` | 微信登录 (code → token) |

### 3.2 SPU (商品)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/spus` | 商品列表 (支持 category_id, pet_type, brand, min_price, max_price, sort, page, page_size) |
| GET | `/spus/compare` | 商品对比 — `?ids=1,2,3` (2-4个) |
| GET | `/spus/{spu_id}` | 商品详情 (含收藏状态) |
| GET | `/spus/{spu_id}/listings` | 商品商家清单 (比价) — `?platform=&sort=` |
| GET | `/spus/{spu_id}/reviews` | 商品评价 — `?page=&page_size=&sort=` |
| GET | `/spus/{spu_id}/links` | 商品链接详情 (含SKU、服务标签) |
| POST | `/spus/{spu_id}/promotion-url` | 生成推广链接 — `{ listing_id }` |

#### SPU列表响应 (`SpuMiniProgramListResponse`)
```json
{
  "id": 1,
  "brand": "皇家",
  "name": "幼猫粮",
  "model": "2kg",
  "pet_type": "cat",
  "category": { "id": 1, "name": "猫粮", "pet_type": "cat" },
  "price_min": 89.0,
  "price_max": 129.0,
  "currency": "CNY",
  "image_urls": ["https://..."],
  "rating": 4.5,
  "review_count": 128,
  "status": "active"
}
```

#### SPU详情响应 (`SpuMiniProgramDetailResponse`)
继承 `SpuBase` (brand, name, model, pet_type, description, ingredients[], nutrition{}, pros[], cons[], extra_attrs{}, image_urls[]) + id, category_id, price_min, price_max, category, listing_count, is_favorited

#### 对比响应
```json
{
  "products": [{
    "id": 1, "name": "...", "brand": "...", "pet_type": "cat",
    "description": "...", "ingredients": ["鸡肉", "大米"],
    "nutrition": { "protein": 32, "fat": 15 },
    "price_range": { "min": 89, "max": 129 },
    "image_urls": ["..."], "rating": 4.5,
    "pros": ["适口性好"], "cons": ["价格偏高"],
    "review_count": 128
  }],
  "comparison": {
    "dimensions": ["品牌", "适用宠物", "价格区间", "主要成分", "营养分析", "优点", "缺点"]
  }
}
```

### 3.3 AI对话
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/sessions` | 创建会话 — `{ title? }` → `{ session_id, title, created_at }` |
| GET | `/chat/sessions` | 获取会话列表 — `{ sessions: [...] }` |
| GET | `/chat/sessions/{session_id}/messages` | 获取会话消息 |
| POST | `/chat/sessions/{session_id}/clear` | 清空会话 |
| POST | `/chat/stream` | **SSE流式对话** — `{ session_id, content, context? }` |

#### SSE 事件格式
```
event: message
data: {"content": "这是部分回复内容..."}

event: spus
data: {"spus": [{"id": 1, "name": "皇家猫粮", ...}]}
```

> 流程：user消息在stream开始前写入 → SSE流式返回 → assistant完整回复在stream结束后写入DB

### 3.4 收藏
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/spus/{spu_id}/favorite` | 查询收藏状态 (需登录) |
| POST | `/spus/{spu_id}/favorite` | 切换收藏 (需登录) |
| GET | `/users/me/favorites` | 我的收藏列表 (需登录) |

### 3.5 搜索
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/search` | 搜索 — `?q=&pet_type=` |
| GET | `/search/suggestions` | 搜索建议 — `?q=&limit=` |

### 3.6 分类
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/categories` | 分类树 — `?pet_type=` |

### 3.7 管理后台 (Admin)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/goods/spus` | SPU管理列表 (分页、过滤、搜索) |
| GET | `/admin/goods/spus/{id}` | SPU详情 |
| POST | `/admin/goods/spus` | 创建SPU |
| PUT | `/admin/goods/spus/{id}` | 更新SPU |
| DELETE | `/admin/goods/spus/{id}` | 删除SPU |
| GET | `/admin/goods/spus/{id}/listings` | SPU清单管理 |
| POST | `/admin/goods/spus/{id}/listings/link` | 关联清单到SPU |
| POST | `/admin/goods/spus/{id}/listings/unlink` | 取消关联 |
| POST | `/admin/goods/spus/extract-ai` | AI提取SPU信息 |
| POST | `/admin/goods/spus/{id}/import-listings` | 为指定SPU导入外部链接（定向导入） |
| POST | `/admin/goods/listings/import` | 全局关键词导入（发现式导入） |
| GET/POST/PUT/DELETE | `/admin/goods/listings/...` | 清单CRUD |
| GET | `/admin/categories/...` | 分类CRUD |
| GET | `/admin/reviews/...` | 评价审核 (pending→approved/rejected) |
| GET | `/admin/data-sources/...` | 数据源管理 |

---

## 4. 前端页面结构

### 小程序 (Taro)
| Tab | 路由 | 页面 | 说明 |
|-----|------|------|------|
| 🏠 | `/pages/index/index` | HomePage / CategoryPage | 首页，分类浏览 |
| 🔍 | `/pages/search/index` | SearchPage | 搜索 |
| 💬 | `/pages/chat/index` | ChatPage | AI对话 (**tabBar页面**) |
| 👤 | `/pages/mine/index` | MinePage | 我的 |

### 子页面
| 路由 | 页面 | 说明 |
|------|------|------|
| `/pages/product/detail?id=` | 商品详情 | SPU详情+评价+清单 |
| `/pages/product/list` | 商品列表 | 分类/筛选结果 |
| `/pages/product/compare` | 商品对比 | 2-4个SPU对比表 |
| `/pages/chat/list` | 历史会话 | 查看/切换历史对话 |
| `/pages/category/index` | 分类导航 | 全部分类 |
| `/pages/mine/favorites` | 我的收藏 | 收藏SPU列表 |

### 前端状态管理 (Zustand)
| Store | 文件 | 管理状态 |
|-------|------|---------|
| spuStore | `stores/spuStore.ts` | SPU列表、筛选、详情 |
| compareStore | `stores/compareStore.ts` | 对比栏 (最大4个) |

### 公共服务 & 组件
| 文件 | 说明 |
|------|------|
| `services/api.ts` | API客户端 (Taro.request封装，自动token) |
| `services/auth.ts` | 微信登录服务 |
| `services/webApi.ts` | H5开发环境适配 |
| `components/Icons.tsx` | SVG图标组件 (FavoriteIcon / FavoriteFilledIcon / ShareIcon / AiAssistantIcon) |

---

## 5. 管理后台页面

| 路由 | 功能 |
|------|------|
| `/spus` | SPU管理：列表/创建/编辑/删除/AI提取/批量导入 |
| `/spus/:id/listings` | 清单匹配：候选去重、手动关联/取消 |
| `/matching-queue` | 匹配队列：unmatched/candidate/linked 三栏拖拽 |
| `/categories` | 分类管理 |
| `/reviews` | 评价审核 |
| `/data-sources` | 数据源配置 |

---

## 6. 关键技术决策

1. **SPU vs Product**：Feature 004 将原 `products` 表重构为 `spus` + `spu_listings` 双表体系，支持跨平台比价
2. **SSE格式**：Agent 输出 `event: message\ndata:` 和 `event: spus\ndata:` 双事件类型，chat.py 解析后分别累积内容和提取SPU IDs
3. **TabBar页面路由**：chat/index 是tabBar页面，不能通过 `navigateTo` 传参，必须用 `switchTab` + `StorageSync` 传递 sessionId
4. **Chat会话惰性创建**：只有用户发送第一条消息时才创建会话，避免空会话污染历史记录
5. **对比维度**：SPU体系下对比维度为 `["品牌", "适用宠物", "价格区间", "主要成分", "营养分析", "优点", "缺点"]`
6. **路由匹配顺序**：FastAPI按注册顺序匹配，`/spus/compare` 必须在 `/spus/{spu_id}` 之前注册
7. **SPU图片自动填充**：创建SPU时 `image_urls` 可为空；导入商品时若匹配到同SPU且SPU没有图片，自动从商品 `image_url` 填充。入口点：`_run_matching_for_unmatched`（自动链接）、`link_listing`（手动关联）、`confirm_listings`（批量确认）
8. **异步导入流程**：`POST /admin/goods/listings/import` 改为后台任务。端点立即返回 `job_id`，实际抓取+LLM匹配在 `asyncio.create_task` 中执行。前端通过 `/admin/goods/jobs/{job_id}` 轮询状态
9. **SPU定向导入（2026-05-25更新）**：新增 `POST /admin/goods/spus/{id}/import-listings` 端点，导入操作从 SPU 列表页的全局关键词搜索改为 SPU 详情页的定向导入。系统默认用 SPU 的 `brand+name+model` 作为搜索关键词，且 LLM 匹配仅针对该 SPU（而非遍历全库），匹配结果直接关联到该 SPU。全局导入保留为发现式导入场景使用
10. **SVG图标组件体系**：项目根目录 `*.svg` 为设计源文件（favorite/favorite-filled/share/ai-assistant）。`components/Icons.tsx` 导出内联SVG的React组件（`FavoriteIcon`/`FavoriteFilledIcon`/`ShareIcon`/`AiAssistantIcon`），支持 `size`/`color`/`className` 属性，同时兼容Taro小程序和Web React渲染
