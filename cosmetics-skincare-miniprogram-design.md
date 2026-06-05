# 化妆品护肤品选购助手小程序 — 功能与系统设计文档

> 版本: v1.0  
> 日期: 2026-06-05  
> 参考项目: `pet-store` 养宠选品小程序  
> 状态: 需求与架构设计阶段  

---

## 1. 项目概述

### 1.1 背景

化妆品、护肤品消费决策具有明显的信息不对称：用户需要同时判断肤质、功效、成分、刺激风险、使用场景、价格渠道、口碑真假以及产品搭配冲突。传统电商详情页偏营销，小红书/抖音等内容平台信息丰富但碎片化，成分查询工具又常常缺少真实使用反馈和购买入口。

本项目参考现有宠物用品选品小程序的架构，将「SPU 标准商品单元 + 多平台清单比价 + 内容评价采集 + AI 总结 + AI 对话」的模式迁移到美妆护肤领域，形成一个面向消费者的「科学但不生硬、好逛但不盲推」的选购助手。

### 1.2 产品定位

面向有护肤、彩妆、防晒、个护消费需求的人群，提供:

1. **商品选品**: 按品类、肤质、功效、成分、价格、场景筛选商品。
2. **成分解读**: 结构化展示主要成分、功效成分、潜在刺激点、适用肤质。
3. **真实口碑**: 汇聚小红书/电商评价等内容，做去重、摘要和观点提炼。
4. **搭配建议**: 基于用户肤质档案和已有产品，推荐护肤流程、提醒成分搭配冲突。
5. **AI 咨询**: 支持自然语言提问，如「油敏皮夏天通勤防晒怎么选」「A 醇和酸能不能一起用」。
6. **价格决策**: 多平台比价、优惠链接、历史价格趋势和规格折算。

### 1.3 目标用户

| 用户类型 | 典型需求 | 产品应提供的价值 |
|----------|----------|------------------|
| 护肤新手 | 不知道如何判断肤质、功效和成分 | 低门槛肤质档案、场景化推荐、成分解释 |
| 成分党 | 关注配方、活性物、刺激风险 | INCI 成分库、成分标注、搭配冲突提醒 |
| 敏感肌/痘肌用户 | 怕踩雷、怕刺激、希望找到温和产品 | 避雷词、风险提示、真实负面反馈聚合 |
| 彩妆用户 | 想看肤质适配、妆效、持妆、色号 | 色号/妆效筛选、上脸评价、同类对比 |
| 价格敏感用户 | 想买到正品和好价 | 多平台清单、历史价、规格折算 |
| 内容运营/管理员 | 需要维护商品、成分、评价、采集任务 | 管理后台、数据源、AI 辅助录入 |

### 1.4 设计原则

1. **参考但不照搬宠物项目**: 保留 SPU、清单、评价、AI 对话、采集任务、管理后台等成熟架构；领域模型从「宠物类型/营养」切换为「肤质/功效/成分/妆效」。
2. **从决策场景组织信息**: 首页不做营销落地页，而是直接进入可用的选购工具，突出「按肤质」「按场景」「按功效」。
3. **建议可解释**: 推荐结果必须给出原因，例如「适合油皮」「不含酒精」「含烟酰胺，可能满足提亮需求」。
4. **安全边界清晰**: 只提供消费与成分信息，不提供医疗诊断；涉及严重皮肤问题时提示咨询专业医生。
5. **数据可运营**: 采集、审核、去重、LLM 结果、成分库均可在后台管理，避免黑盒推荐。

---

## 2. 与现有宠物项目的复用关系

### 2.1 可直接复用的架构

| 现有模块 | 复用方式 | 美妆项目调整 |
|----------|----------|--------------|
| FastAPI + SQLAlchemy async + PostgreSQL | 后端主体继续使用 | 新增美妆领域模型和服务 |
| Taro 3 + React + Tailwind + Zustand | 小程序端继续使用 | 替换视觉主题、页面文案、领域筛选条件 |
| React + Vite + TypeScript 管理后台 | 后台继续使用 | 增加成分库、肤质标签、功效标签管理 |
| `spus` 标准商品单元 | 继续作为核心商品表 | 字段从宠物营养扩展为成分、功效、肤质 |
| `spu_listings` 商家清单 | 继续支持多平台比价 | 增加规格折算、正品渠道、色号/SKU |
| `reviews` 评价表 | 继续存储外部笔记/评价 | 增加肤质、妆效、刺激反应等分析结果 |
| `data_fetch_jobs` 采集任务 | 继续跟踪采集状态 | 支持小红书、电商评价、备案信息、价格 |
| Chat SSE 对话 | 继续使用流式响应 | Agent 工具换成美妆选品/成分分析 |
| 收藏、对比、搜索、分类 | 基础能力复用 | 筛选维度领域化 |

### 2.2 需要新增或重构的领域能力

1. **用户肤质档案**: 替代宠物档案，记录肤质、敏感程度、护理目标、过敏/避雷成分、预算。
2. **成分库**: 维护 INCI 名、中文名、别名、功效、刺激/致痘/光敏风险、搭配规则。
3. **功效与肤质适配模型**: 支持保湿、修护、控油、祛痘、抗老、提亮、防晒、卸妆、底妆等标签体系。
4. **护肤流程/妆容场景**: 从单品推荐升级为「洁面-精华-面霜-防晒」流程建议。
5. **搭配兼容性检查**: 判断 A 醇、酸类、VC、烟酰胺、防晒、清洁类等组合的使用注意点。
6. **色号/妆效体系**: 彩妆类需要支持色号、肤色、妆效、遮瑕力、持妆、氧化等维度。
7. **合规提示**: 对功效宣称、敏感肌、孕期/哺乳期使用建议等保持谨慎表达。

---

## 3. 功能设计

### 3.1 MVP 范围

MVP 建议优先聚焦「护肤品 + 防晒 + 部分彩妆底妆」，先做高频决策链路:

1. 用户建立肤质档案。
2. 首页按肤质/功效/场景推荐。
3. 商品列表支持筛选和搜索。
4. 商品详情展示成分、适配理由、评价总结、价格清单。
5. AI 助手支持选品问答、成分解释、商品对比。
6. 管理后台支持 SPU、成分、清单、评价采集、AI 总结维护。

MVP 暂不做:

1. 医疗级皮肤问题诊断。
2. 用户真人照片肤质识别。
3. 复杂 AR 试妆。
4. 社区发帖与用户内容生态。
5. 全自动大规模爬虫，优先采用管理员手动触发、可审核的数据流程。

### 3.2 用户端功能模块

#### 3.2.1 首次进入与肤质档案

用户首次进入时可跳过，但建议创建肤质档案以提升推荐准确度。

档案字段:

| 字段 | 示例 | 用途 |
|------|------|------|
| 肤质 | 干皮/油皮/混油/混干/中性 | 推荐基础匹配 |
| 敏感程度 | 不敏感/轻度/中度/高度 | 控制刺激风险阈值 |
| 主要诉求 | 保湿、修护、控油、祛痘、抗老、提亮 | 功效推荐 |
| 当前状态 | 爆痘、泛红、屏障受损、闭口、暗沉 | 场景推荐 |
| 避雷成分 | 酒精、香精、某些防腐剂、酸类 | 风险提醒 |
| 可接受预算 | 0-100/100-300/300-600/600+ | 商品排序 |
| 使用偏好 | 清爽、滋润、无香、精简护肤 | 文案和推荐解释 |
| 特殊状态 | 孕期/哺乳期/刷酸中/医美后 | 只做谨慎提醒，不替代医生建议 |

关键交互:

1. 支持 30 秒快速建档。
2. 支持「稍后再说」，默认展示通用推荐。
3. 用户可在「我的」页随时修改。
4. 修改档案后首页推荐和 AI 上下文自动更新。

#### 3.2.2 首页

首页采用工具型布局，避免营销式大 Hero。第一屏直接给用户可操作入口。

结构:

1. **顶部肤质切换区**
   - 显示当前肤质档案:「混油皮 · 控油祛痘」
   - 未建档时显示「选择肤质」
   - 点击进入肤质档案编辑

2. **搜索入口**
   - placeholder:「搜产品 / 品牌 / 成分 / 功效」
   - 支持示例:「油皮防晒」「烟酰胺精华」「雅诗兰黛小棕瓶」

3. **场景快捷卡**
   - 屏障修护
   - 通勤防晒
   - 油皮控油
   - 痘肌精简
   - 抗老入门
   - 熬夜暗沉
   - 底妆不斑驳
   - 卸妆清洁

4. **为你筛出的商品**
   - 根据肤质档案 + 场景 + 热门评价生成
   - 商品卡展示: 图片、品牌、名称、核心标签、适配理由、价格区间、评价摘要

5. **成分热榜/避雷榜**
   - 可作为第二屏内容
   - 不做绝对好坏，只显示「常见诉求」「注意事项」

与宠物项目的映射:

| 宠物项目首页 | 美妆项目首页 |
|--------------|--------------|
| 宠物档案切换 | 肤质档案切换 |
| 场景快捷卡 | 护肤/彩妆场景快捷卡 |
| 推荐 SPU | 推荐化妆品/护肤品 SPU |
| 按宠物类型筛选 | 按肤质/功效/品类筛选 |

#### 3.2.3 分类与搜索

一级分类建议:

| 一级分类 | 二级分类 |
|----------|----------|
| 护肤 | 洁面、化妆水、精华、乳液、面霜、面膜、眼霜 |
| 防晒 | 通勤防晒、户外防晒、敏感肌防晒、儿童/家庭防晒 |
| 彩妆 | 粉底液、气垫、遮瑕、散粉、腮红、口红、眼影、眉笔 |
| 清洁卸妆 | 卸妆油、卸妆膏、卸妆水、清洁面膜 |
| 身体护理 | 身体乳、护手霜、沐浴、止汗、磨砂 |
| 男士护理 | 洁面、剃须、控油、基础保湿 |
| 工具 | 化妆刷、美妆蛋、洁面巾、棉片 |

筛选维度:

| 维度 | 示例 |
|------|------|
| 肤质 | 干皮、油皮、混油、混干、敏感肌 |
| 功效 | 保湿、修护、控油、祛痘、抗老、提亮、舒缓 |
| 成分 | 烟酰胺、视黄醇、水杨酸、神经酰胺、玻尿酸 |
| 避雷 | 酒精、香精、致痘风险、酸类、高浓度活性 |
| 价格 | 0-100、100-300、300-600、600+ |
| 规格 | 30ml、50ml、100ml；支持单价折算 |
| 渠道 | 京东、天猫、淘宝、拼多多、品牌官方 |
| 评价 | 推荐率、敏感肌反馈、差评关键词 |
| 彩妆特有 | 色号、妆效、遮瑕力、持妆、肤色 |

搜索能力:

1. 商品名/品牌搜索。
2. 成分名搜索，返回含该成分的商品。
3. 功效搜索，返回相关商品和解释。
4. 自然语言搜索，例如「200以内油皮夏天面霜」。
5. 搜索建议，包含品牌、成分、功效、热门问题。

#### 3.2.4 商品列表

商品卡片字段:

1. 商品主图。
2. 品牌 + 名称 + 规格。
3. 价格区间和最低价平台。
4. 核心功效标签，例如「保湿」「修护」「控油」。
5. 适配标签，例如「油皮友好」「敏感肌慎用」「孕期请咨询」。
6. AI 一句话摘要，例如「清爽控油反馈多，但酒精敏感用户需谨慎」。
7. 评价数量和推荐率。
8. 加入对比按钮、收藏按钮。

排序:

1. 综合推荐。
2. 适配度最高。
3. 价格从低到高。
4. 评价热度。
5. 最近采集。
6. 单位价格最低。

#### 3.2.5 商品详情页

详情页建议采用四个标签:

1. **概览**
2. **成分**
3. **评价**
4. **购买**

概览区:

| 模块 | 内容 |
|------|------|
| 商品头图 | 图片轮播，支持规格/色号图片 |
| 基础信息 | 品牌、名称、规格、品类、价格区间 |
| 适配结论 | 「更适合油皮/混油皮」「干敏皮谨慎」 |
| AI 摘要 | 一句话总结优缺点 |
| 功效标签 | 保湿、修护、控油、提亮等 |
| 风险提示 | 香精、酒精、酸类、视黄醇等，仅作消费提示 |
| 操作 | 收藏、加入对比、问 AI、去购买 |

成分区:

1. 成分表按配方顺序展示。
2. 高亮核心功效成分。
3. 标注常见风险点: 刺激、致痘、光敏、香精、防腐体系。
4. 展示「为什么推荐/为什么谨慎」。
5. 支持点击成分进入成分详情。
6. 支持与用户避雷成分自动匹配。

评价区:

1. 顶部 AI 口碑总结。
2. 推荐率、常见优点、常见缺点。
3. 小红书笔记卡片: 作者、发布时间、点赞、正文摘要、评论前 10 条。
4. 电商评价摘要: 好评关键词、差评关键词、肤质提及。
5. 支持筛选: 油皮、干皮、敏感肌、痘肌、差评、妆效、持妆。

购买区:

1. 多平台价格列表。
2. 规格、色号、SKU。
3. 单位价格折算，例如「¥6.6/ml」。
4. 店铺类型: 官方旗舰店、自营、授权店、第三方。
5. 优惠券/推广链接。
6. 历史价格趋势。
7. 服务标签: 包邮、次日达、退换、正品保障等。

#### 3.2.6 商品对比页

支持 2-4 个 SPU 对比。对比维度:

| 维度 | 内容 |
|------|------|
| 基础 | 品牌、名称、品类、规格、价格 |
| 适配 | 适合肤质、主要诉求、敏感肌友好度 |
| 成分 | 核心功效成分、潜在刺激成分、避雷命中 |
| 功效 | 保湿、修护、控油、抗老、提亮等评分或标签 |
| 评价 | 推荐率、好评点、差评点、样本数 |
| 购买 | 最低价、单位价格、渠道 |
| AI 总结 | 「这几个里更适合谁」 |

#### 3.2.7 AI 助手

AI 助手沿用现有项目的 Chat SSE 架构，但系统提示词和工具换成美妆领域。

典型问题:

1. 「油敏皮夏天有什么清爽面霜？」
2. 「这款精华和我的 A 醇能一起用吗？」
3. 「预算 300 以内，有没有适合干皮的通勤防晒？」
4. 「烟酰胺对我这种泛红皮适合吗？」
5. 「这两个粉底液哪个更适合混油皮？」
6. 「帮我搭一个早 C 晚 A 的入门流程。」

AI 回答原则:

1. 引用站内商品和成分数据。
2. 给出不确定性和适用条件。
3. 涉及严重皮肤病、过敏、孕期等场景时提示咨询专业人士。
4. 不做绝对承诺，不使用「一定治好」「完全无风险」等表达。
5. 推荐商品时必须说明理由和潜在注意点。

AI 工具:

| 工具名 | 入参 | 输出 |
|--------|------|------|
| `search_beauty_spus` | 关键词、肤质、功效、预算 | 商品候选 |
| `get_spu_detail` | spu_id | 商品详情、成分、评价 |
| `analyze_ingredients` | spu_id 或成分列表 | 成分解释、风险点 |
| `compare_spus` | spu_ids | 对比结论 |
| `get_user_beauty_profile` | user_id | 用户肤质档案 |
| `check_routine_compatibility` | 用户已有产品/成分组合 | 搭配提醒 |
| `recommend_routine` | 肤质、诉求、预算 | 护肤流程建议 |

#### 3.2.8 我的页面

模块:

1. 肤质档案。
2. 我的收藏。
3. 我的对比。
4. 我的护肤流程。
5. 已有产品/空瓶记录。
6. 浏览历史。
7. 隐私设置与数据删除。

「已有产品」可以作为增强功能，用于搭配冲突检查:

| 字段 | 示例 |
|------|------|
| 产品 | 某某 A 醇精华 |
| 使用频率 | 每周 2 次 |
| 使用时段 | 夜间 |
| 当前状态 | 使用中/已停用/空瓶 |
| 反馈 | 刺激/无感/有效 |

---

## 4. 管理后台功能设计

### 4.1 后台模块清单

| 路由 | 功能 |
|------|------|
| `/spus` | SPU 商品管理 |
| `/spus/:id/listings` | 多平台清单管理、匹配、定向导入 |
| `/ingredients` | 成分库管理 |
| `/ingredient-rules` | 成分搭配规则和风险规则 |
| `/categories` | 品类、功效、肤质标签管理 |
| `/reviews` | 评价审核与 AI 分析结果查看 |
| `/collect-jobs` | 数据采集任务监控 |
| `/data-sources` | 数据源配置 |
| `/ai-prompts` | AI 提示词和分析模板管理 |
| `/users` | 用户和肤质档案查看，默认脱敏 |
| `/dashboard` | 数据概览、采集健康度、热门商品 |

### 4.2 SPU 管理

字段:

1. 品牌、名称、别名、系列。
2. 品类、子品类。
3. 规格、剂型、色号。
4. 适用肤质、主要功效、禁忌/谨慎人群。
5. 成分表，支持粘贴全成分后 AI/规则解析。
6. 图片、描述、优缺点。
7. 备案/许可证号等可选字段。
8. 价格区间、状态。
9. AI 成分摘要、AI 评价摘要。

关键操作:

1. 创建/编辑/删除 SPU。
2. AI 提取 SPU 信息。
3. 粘贴电商链接定向导入。
4. 触发小红书评价采集。
5. 触发电商评价采集。
6. 重新生成 AI 成分摘要。
7. 重新生成 AI 评价摘要。
8. 合并重复 SPU。

### 4.3 成分库管理

成分库是美妆项目区别于宠物项目的核心后台能力。

字段:

| 字段 | 说明 |
|------|------|
| INCI 名 | 国际化妆品成分命名 |
| 中文名 | 常用中文名 |
| 别名 | 例如维 A 醇/视黄醇 |
| 成分类别 | 保湿剂、防腐剂、表活、油脂、香精、色粉等 |
| 常见功效 | 保湿、修护、抗氧化、控油等 |
| 风险标签 | 刺激、致痘、光敏、孕期谨慎等 |
| 风险等级 | 0-5，供筛选和排序使用 |
| 证据等级 | A/B/C/经验型，用于避免过度承诺 |
| 说明 | 面向用户的短解释 |
| 数据来源 | 手工维护/公开资料/供应商资料 |

后台能力:

1. 成分搜索、别名合并。
2. 批量导入成分 CSV。
3. 成分标签审核。
4. 风险规则配置。
5. 成分解释文案版本管理。

### 4.4 评价采集与审核

沿用 Feature 008 的「SPU 维度手动触发」模式。

流程:

1. 管理员在 SPU 列表点击「评价采集」。
2. 系统使用品牌 + 商品名 + 别名 + 功效关键词搜索小红书笔记。
3. 最多采集 20 条笔记。
4. 保存笔记正文、作者、链接、点赞、发布时间、前 10 条评论。
5. LLM 分析单条笔记:
   - 推荐/不推荐/中性
   - 肤质提及
   - 使用场景
   - 优点
   - 缺点
   - 刺激/过敏/闷痘反馈
   - 妆效/持妆反馈，彩妆类适用
6. 采集完成后生成 SPU 聚合口碑总结。
7. 管理员可审核、修正、隐藏不合适内容。

任务状态:

`pending` → `running` → `completed` / `partial_success` / `failed`

### 4.5 清单匹配与价格管理

沿用 `spu_listings` 双表体系，但增加美妆特有 SKU:

1. 色号。
2. 规格。
3. 套装/正装/小样。
4. 到手价。
5. 单位价格。
6. 渠道可信度。
7. 店铺类型。
8. 活动标签。

匹配规则:

1. 品牌 + 商品名 + 规格强匹配。
2. 别名/系列名辅助匹配。
3. 色号对彩妆必须独立识别。
4. 小样、体验装、套装默认作为 listing，不直接创建新 SPU，除非运营确认。
5. 同一 SPU 下允许多个 SKU，但详情页默认展示标准规格或最低单位价。

---

## 5. 数据模型设计

### 5.1 总体 ER 关系

```text
users
  └── beauty_profiles
        ├── user_routines
        │     └── routine_steps
        └── user_product_shelf

categories
  └── spus
        ├── spu_ingredients ── ingredients
        ├── spu_listings
        ├── reviews
        ├── favorites
        ├── price_history
        └── data_fetch_jobs

ingredients
  ├── ingredient_aliases
  └── ingredient_compatibility_rules

chat_sessions
  └── chat_messages
```

### 5.2 用户相关

#### `users`

复用现有用户表。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| openid | VARCHAR(64) UNIQUE | 微信 OpenID |
| unionid | VARCHAR(64) | 微信 UnionID |
| nickname | VARCHAR(64) | 昵称 |
| avatar_url | VARCHAR(256) | 头像 |
| profile | JSONB | 通用扩展信息 |
| is_admin | BOOLEAN | 是否管理员 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### `beauty_profiles`

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| user_id | INT FK → users.id | 用户 |
| skin_type | VARCHAR(32) | dry/oily/combination_oily/combination_dry/normal |
| sensitivity_level | VARCHAR(16) | none/mild/medium/high |
| concerns | JSONB | 诉求，如 ["acne", "repair", "anti_aging"] |
| current_conditions | JSONB | 当前状态，如泛红、爆痘、屏障受损 |
| avoid_ingredients | JSONB | 避雷成分 |
| preferred_textures | JSONB | 清爽、滋润、无香等 |
| budget_min | NUMERIC(10,2) | 预算下限 |
| budget_max | NUMERIC(10,2) | 预算上限 |
| special_status | JSONB | 孕期、哺乳期、医美后等谨慎状态 |
| climate_region | VARCHAR(32) | 湿热、干冷等，可选 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

约束:

1. `user_id` 唯一，一个用户默认一个主档案。
2. `skin_type` 使用枚举值。
3. `sensitivity_level` 使用枚举值。

#### `user_product_shelf`

用于「我正在用」和搭配检查。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| user_id | INT FK | 用户 |
| spu_id | INT FK → spus.id | 商品，可为空 |
| custom_name | VARCHAR(128) | 用户手动录入商品名 |
| category_id | INT FK | 品类 |
| usage_frequency | VARCHAR(32) | daily/weekly/occasionally |
| usage_time | VARCHAR(16) | morning/night/both |
| status | VARCHAR(16) | using/stopped/empty |
| user_feedback | JSONB | 用户反馈 |
| started_at | DATE | 开始使用日期 |
| created_at | TIMESTAMPTZ | 创建时间 |

### 5.3 商品相关

#### `spus`

建议继续使用 `spus` 作为核心表，保留现有基础字段，新增美妆领域字段。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| category_id | INT FK → categories.id | 分类 |
| brand | VARCHAR(64) NOT NULL | 品牌 |
| name | VARCHAR(255) NOT NULL | 商品名 |
| model | VARCHAR(128) | 规格/型号，如 30ml |
| series | VARCHAR(128) | 系列 |
| product_type | VARCHAR(32) | skincare/makeup/suncare/bodycare/tool |
| description | TEXT | 描述 |
| efficacy_tags | JSONB | 功效标签 |
| suitable_skin_types | JSONB | 适用肤质 |
| caution_skin_types | JSONB | 谨慎肤质 |
| texture | VARCHAR(64) | 质地，如乳液/啫喱/霜 |
| finish | VARCHAR(64) | 妆效，彩妆类 |
| shades | JSONB | 色号信息 |
| ingredients_raw | TEXT | 原始成分表 |
| ingredient_summary | JSONB | AI/规则生成成分摘要 |
| pros | JSONB | 优点 |
| cons | JSONB | 缺点 |
| safety_notes | JSONB | 注意事项 |
| usage_instructions | JSONB | 使用方式 |
| cosmetic_filing_no | VARCHAR(128) | 备案编号，可选 |
| price_min | NUMERIC(10,2) | 最低价格 |
| price_max | NUMERIC(10,2) | 最高价格 |
| currency | VARCHAR(8) DEFAULT 'CNY' | 货币 |
| image_urls | JSONB | 图片 |
| ai_review_summary | JSONB | 口碑总结 |
| ai_fit_summary | JSONB | 适配总结 |
| status | VARCHAR(16) | active/inactive/draft |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

`ingredient_summary` 示例:

```json
{
  "hero_ingredients": ["烟酰胺", "泛醇", "神经酰胺NP"],
  "functions": ["修护", "保湿", "提亮"],
  "possible_irritants": ["香精"],
  "comedogenic_flags": [],
  "sensitive_skin_note": "轻敏皮可关注建立耐受，高敏皮建议先局部试用",
  "generated_at": "2026-06-05T12:00:00Z"
}
```

`ai_review_summary` 示例:

```json
{
  "overall_pros": ["肤感清爽", "控油反馈明显", "不搓泥"],
  "overall_cons": ["部分用户觉得拔干", "香味存在争议"],
  "recommendation": "适合油皮通勤使用",
  "recommend_rate": 0.78,
  "skin_type_mentions": {
    "oily": 18,
    "dry": 4,
    "sensitive": 6
  },
  "summary": "油皮好评集中在清爽控油，干敏皮需注意拔干和香味。",
  "review_count": 28,
  "generated_at": "2026-06-05T12:00:00Z"
}
```

#### `spu_ingredients`

SPU 与成分表关系。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| spu_id | INT FK → spus.id | 商品 |
| ingredient_id | INT FK → ingredients.id | 成分 |
| position | INT | 成分表顺序 |
| concentration_text | VARCHAR(64) | 浓度文本，可选 |
| concentration_value | NUMERIC(6,3) | 已知浓度，可选 |
| role | VARCHAR(64) | 在该产品中的作用 |
| is_key_active | BOOLEAN | 是否核心功效成分 |

唯一约束:

`(spu_id, ingredient_id, position)`

#### `ingredients`

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| inci_name | VARCHAR(255) | INCI 名 |
| cn_name | VARCHAR(255) NOT NULL | 中文名 |
| common_name | VARCHAR(255) | 常用名 |
| category | VARCHAR(64) | 成分类别 |
| functions | JSONB | 常见功效 |
| risk_tags | JSONB | 风险标签 |
| irritation_level | INT | 刺激风险 0-5 |
| comedogenic_level | INT | 致痘风险 0-5 |
| pregnancy_caution | BOOLEAN | 孕期谨慎 |
| photosensitivity | BOOLEAN | 光敏相关 |
| evidence_level | VARCHAR(16) | A/B/C/experience |
| description | TEXT | 用户可读解释 |
| source_refs | JSONB | 来源引用 |
| status | VARCHAR(16) | active/pending |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

#### `ingredient_aliases`

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| ingredient_id | INT FK | 成分 |
| alias | VARCHAR(255) | 别名 |
| language | VARCHAR(16) | zh/en |

#### `ingredient_compatibility_rules`

用于搭配提醒。规则表达要谨慎，避免医疗化。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| ingredient_a_id | INT FK | 成分 A，可为空 |
| ingredient_b_id | INT FK | 成分 B，可为空 |
| tag_a | VARCHAR(64) | 成分类别 A，如 acid |
| tag_b | VARCHAR(64) | 成分类别 B，如 retinoid |
| rule_type | VARCHAR(32) | conflict/caution/synergy |
| severity | VARCHAR(16) | low/medium/high |
| applicable_skin_types | JSONB | 适用肤质 |
| message | TEXT | 用户展示文案 |
| admin_note | TEXT | 后台说明 |
| is_active | BOOLEAN | 是否启用 |

### 5.4 分类与标签

#### `categories`

复用现有分类表，但 `pet_type` 字段在新项目中建议替换为更通用的 `domain` 或 `product_type`。如果为了降低改造成本，也可以保留字段名但语义不再使用宠物。

推荐新字段:

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| name | VARCHAR(64) | 分类名称 |
| product_type | VARCHAR(32) | skincare/makeup/suncare |
| parent_id | INT FK | 父分类 |
| level | INT | 层级 |
| icon | VARCHAR(128) | 图标 |
| sort_order | INT | 排序 |
| is_active | BOOLEAN | 是否启用 |

#### `taxonomy_tags`

统一管理功效、肤质、风险、妆效等标签。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| tag_type | VARCHAR(32) | efficacy/skin_type/risk/finish/scene |
| code | VARCHAR(64) | 稳定编码 |
| name | VARCHAR(64) | 展示名称 |
| description | TEXT | 说明 |
| sort_order | INT | 排序 |
| is_active | BOOLEAN | 是否启用 |

### 5.5 评价与内容

#### `reviews`

复用现有表，并建议补充 comments 字段和领域分析字段。如果现有表已有 `llm_review_result`，可以把领域结构放进去，减少迁移。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| spu_id | INT FK → spus.id | 商品 |
| external_note_id | VARCHAR(64) | 外部笔记 ID |
| author | VARCHAR(64) | 作者 |
| note_published_at | TIMESTAMPTZ | 发布时间 |
| note_likes | INT | 点赞数 |
| rating | NUMERIC(2,1) | 评分，可选 |
| content | TEXT | 正文 |
| images | JSONB | 图片 |
| comments | JSONB | 前 10 条评论 |
| tags | JSONB | 标签 |
| source | VARCHAR(32) | xhs/jd/tmall/taobao/user |
| source_url | VARCHAR(512) | 来源链接 |
| helpful_count | INT | 有用数 |
| is_recommended | BOOLEAN | 是否推荐 |
| status | VARCHAR(16) | pending/approved/rejected |
| llm_review_result | JSONB | 单条分析结果 |
| created_at | TIMESTAMPTZ | 创建时间 |

`llm_review_result` 示例:

```json
{
  "sentiment": "positive",
  "recommendation": "recommended",
  "mentioned_skin_types": ["oily", "combination_oily"],
  "usage_scenes": ["summer", "commute"],
  "pros": ["成膜快", "不搓泥", "控油"],
  "cons": ["轻微拔干"],
  "adverse_reactions": [],
  "makeup_feedback": {
    "coverage": null,
    "longevity": null,
    "oxidation": null
  },
  "confidence": 0.82
}
```

### 5.6 价格与清单

#### `spu_listings`

复用现有表，新增 SKU 扩展字段。

| 列名 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| spu_id | INT FK → spus.id | 商品 |
| platform | VARCHAR(32) | jd/tmall/taobao/pdd/douyin |
| shop_name | VARCHAR(128) | 店铺 |
| shop_type | VARCHAR(32) | official/self_operated/authorized/third_party |
| goods_id | VARCHAR(64) | 外部商品 ID |
| title | VARCHAR(512) | 标题 |
| price | NUMERIC(10,2) | 当前价格 |
| original_price | NUMERIC(10,2) | 原价 |
| unit_price | NUMERIC(10,4) | 单位价格 |
| unit | VARCHAR(16) | ml/g/piece |
| sku_specs | JSONB | 规格、色号、套装 |
| shade | VARCHAR(64) | 色号 |
| url | VARCHAR(2048) | 链接 |
| image_url | VARCHAR(2048) | 图片 |
| sales_count | INT | 销量 |
| service_tags | JSONB | 服务标签 |
| match_confidence | NUMERIC(5,4) | 匹配置信度 |
| match_status | VARCHAR(16) | linked/candidate/rejected/unmatched |
| last_synced_at | TIMESTAMPTZ | 同步时间 |

### 5.7 AI 对话

复用 `chat_sessions` 和 `chat_messages`。

`chat_messages.referenced_spus` 继续记录回答引用的 SPU。建议新增:

| 字段 | 类型 | 说明 |
|------|------|------|
| referenced_ingredients | JSONB | 引用成分 ID |
| safety_flags | JSONB | 回答中的谨慎提示 |

也可先放入 `tool_calls`，MVP 不新增字段。

---

## 6. API 设计

### 6.1 接口规范

沿用现有统一响应:

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "pagination": null
}
```

所有接口前缀:

`/v1`

认证:

1. 微信小程序用户使用 `/auth/wechat-login` 换 token。
2. 管理后台使用管理员账号或现有 admin token。
3. 用户肤质档案、收藏、流程需要登录。
4. 商品列表、详情、搜索可匿名访问。

### 6.2 用户与肤质档案

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/wechat-login` | 微信登录 |
| GET | `/beauty-profile/me` | 获取我的肤质档案 |
| PUT | `/beauty-profile/me` | 创建或更新肤质档案 |
| DELETE | `/beauty-profile/me` | 删除肤质档案 |
| GET | `/users/me/product-shelf` | 我的已有产品 |
| POST | `/users/me/product-shelf` | 添加已有产品 |
| PUT | `/users/me/product-shelf/{id}` | 更新已有产品 |
| DELETE | `/users/me/product-shelf/{id}` | 删除已有产品 |

`PUT /beauty-profile/me` 请求:

```json
{
  "skin_type": "combination_oily",
  "sensitivity_level": "mild",
  "concerns": ["acne", "oil_control", "repair"],
  "current_conditions": ["closed_comedones"],
  "avoid_ingredients": ["alcohol", "fragrance"],
  "preferred_textures": ["lightweight", "fragrance_free"],
  "budget_min": 100,
  "budget_max": 300,
  "special_status": []
}
```

### 6.3 商品与分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/categories` | 分类树 |
| GET | `/taxonomy-tags` | 标签字典 |
| GET | `/spus` | 商品列表 |
| GET | `/spus/{spu_id}` | 商品详情 |
| GET | `/spus/compare?ids=1,2,3` | 商品对比 |
| GET | `/spus/{spu_id}/ingredients` | 商品成分分析 |
| GET | `/spus/{spu_id}/reviews` | 商品评价 |
| GET | `/spus/{spu_id}/listings` | 商品购买清单 |
| POST | `/spus/{spu_id}/promotion-url` | 生成推广链接 |

`GET /spus` 查询参数:

| 参数 | 说明 |
|------|------|
| q | 搜索关键词 |
| category_id | 分类 |
| product_type | skincare/makeup/suncare |
| skin_type | 肤质 |
| concern | 诉求 |
| efficacy | 功效 |
| ingredient | 包含成分 |
| avoid_ingredient | 排除成分 |
| min_price/max_price | 价格范围 |
| sort | recommend/price_asc/review/fit/unit_price |
| page/page_size | 分页 |

列表响应单项:

```json
{
  "id": 1,
  "brand": "示例品牌",
  "name": "清爽修护精华",
  "model": "30ml",
  "category": { "id": 12, "name": "精华" },
  "product_type": "skincare",
  "price_min": 129,
  "price_max": 189,
  "image_urls": ["https://example.com/a.jpg"],
  "efficacy_tags": ["repair", "hydrating"],
  "suitable_skin_types": ["oily", "combination_oily"],
  "fit_score": 0.86,
  "fit_reason": "匹配你的控油修护诉求，质地偏清爽",
  "review_count": 128,
  "recommend_rate": 0.78
}
```

### 6.4 成分

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/ingredients` | 成分搜索 |
| GET | `/ingredients/{id}` | 成分详情 |
| POST | `/ingredients/analyze` | 粘贴成分表分析 |
| POST | `/ingredients/compatibility-check` | 成分搭配检查 |

`POST /ingredients/analyze` 请求:

```json
{
  "ingredients_text": "水、甘油、烟酰胺、泛醇、神经酰胺NP、香精",
  "skin_type": "sensitive",
  "avoid_ingredients": ["fragrance"]
}
```

响应:

```json
{
  "hero_ingredients": [
    { "name": "烟酰胺", "functions": ["提亮", "控油"], "note": "敏感肌建议关注耐受" },
    { "name": "泛醇", "functions": ["舒缓", "修护"], "note": "常见修护成分" }
  ],
  "risk_flags": [
    { "name": "香精", "severity": "medium", "message": "命中你的避雷偏好" }
  ],
  "summary": "整体偏保湿修护，含香精，敏感肌建议先局部试用。"
}
```

### 6.5 推荐与流程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/recommendations/home` | 首页推荐 |
| POST | `/recommendations/scenario` | 场景推荐 |
| POST | `/routines/recommend` | 护肤流程推荐 |
| POST | `/routines/compatibility-check` | 已有产品搭配检查 |

`POST /routines/recommend` 请求:

```json
{
  "skin_type": "combination_oily",
  "concerns": ["oil_control", "repair"],
  "budget_max": 500,
  "routine_type": "basic",
  "time": "morning"
}
```

响应:

```json
{
  "steps": [
    {
      "step": "cleanser",
      "title": "温和洁面",
      "reason": "减少过度清洁导致的屏障压力",
      "spus": []
    },
    {
      "step": "moisturizer",
      "title": "清爽修护保湿",
      "reason": "匹配混油皮和修护诉求",
      "spus": [1, 2, 3]
    },
    {
      "step": "sunscreen",
      "title": "通勤防晒",
      "reason": "白天流程建议补充防晒",
      "spus": [4, 5]
    }
  ],
  "notes": ["建议先建立耐受，出现明显不适时停止使用并寻求专业建议。"]
}
```

### 6.6 AI 对话

沿用现有接口:

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/sessions` | 创建会话 |
| GET | `/chat/sessions` | 会话列表 |
| GET | `/chat/sessions/{id}/messages` | 消息列表 |
| POST | `/chat/sessions/{id}/clear` | 清空会话 |
| POST | `/chat/stream` | SSE 流式对话 |

SSE 事件建议:

```text
event: message
data: {"content":"这类防晒可以优先看清爽成膜..."}

event: spus
data: {"spus":[{"id":1,"brand":"...","name":"..."}]}

event: ingredients
data: {"ingredients":[{"id":10,"cn_name":"烟酰胺"}]}

event: safety
data: {"flags":[{"level":"medium","message":"敏感肌建议先局部试用"}]}
```

### 6.7 管理后台 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/goods/spus` | SPU 列表 |
| POST | `/admin/goods/spus` | 创建 SPU |
| PUT | `/admin/goods/spus/{id}` | 更新 SPU |
| DELETE | `/admin/goods/spus/{id}` | 删除 SPU |
| POST | `/admin/goods/spus/extract-ai` | AI 提取商品信息 |
| POST | `/admin/goods/spus/{id}/parse-ingredients` | 解析成分表 |
| POST | `/admin/goods/spus/{id}/import-listings` | 定向导入清单 |
| POST | `/admin/spus/{id}/xhs-collect` | 触发小红书评价采集 |
| GET | `/admin/spus/{id}/xhs-collect/status` | 查询采集状态 |
| POST | `/admin/spus/{id}/regenerate-review-summary` | 重新生成口碑总结 |
| GET/POST/PUT/DELETE | `/admin/ingredients` | 成分库 CRUD |
| GET/POST/PUT/DELETE | `/admin/ingredient-rules` | 成分规则 CRUD |
| GET/POST/PUT/DELETE | `/admin/taxonomy-tags` | 标签 CRUD |
| GET | `/admin/reviews` | 评价审核列表 |
| PUT | `/admin/reviews/{id}/status` | 审核评价 |

---

## 7. 推荐与 AI 设计

### 7.1 推荐评分模型

MVP 可以先用规则 + 权重评分，后续再引入学习排序。

推荐分:

```text
score =
  0.25 * skin_type_fit
+ 0.20 * concern_match
+ 0.15 * ingredient_efficacy
+ 0.15 * safety_fit
+ 0.10 * review_signal
+ 0.10 * price_fit
+ 0.05 * freshness_or_availability
```

字段说明:

| 子分 | 含义 |
|------|------|
| `skin_type_fit` | 商品适用肤质与用户肤质匹配 |
| `concern_match` | 商品功效与用户诉求匹配 |
| `ingredient_efficacy` | 核心成分与功效标签一致 |
| `safety_fit` | 是否命中避雷成分、敏感风险 |
| `review_signal` | 推荐率、评价数量、负面反馈 |
| `price_fit` | 是否符合预算 |
| `freshness_or_availability` | 是否有可购买清单、价格是否新鲜 |

推荐解释生成:

```json
{
  "fit_score": 0.84,
  "reasons": [
    "匹配你的混油皮档案",
    "功效标签覆盖控油和修护",
    "评价中清爽、不搓泥反馈较多"
  ],
  "cautions": [
    "含香精，香精敏感用户需谨慎"
  ]
}
```

### 7.2 成分分析规则

规则来源:

1. 成分库结构化标签。
2. SPU 成分顺序。
3. 已知浓度信息。
4. 用户避雷成分。
5. 搭配规则。

分析输出:

1. 核心功效成分。
2. 基础保湿/油脂/表活/防腐体系。
3. 潜在刺激点。
4. 适合肤质。
5. 谨慎人群。
6. 与用户档案的匹配/冲突。

注意:

1. 成分排序不等于准确浓度，除非有明确浓度数据。
2. 风险等级是消费参考，不是医学判断。
3. 单个成分不能完全代表整瓶产品效果，需要结合配方和用户反馈。

### 7.3 评价 LLM 分析

单条评价 Prompt 输出结构:

```json
{
  "sentiment": "positive|neutral|negative",
  "recommendation": "recommended|not_recommended|neutral",
  "mentioned_skin_types": ["oily"],
  "usage_scenes": ["summer", "commute"],
  "pros": ["清爽", "不搓泥"],
  "cons": ["拔干"],
  "adverse_reactions": ["泛红"],
  "makeup_feedback": {
    "finish": "matte",
    "coverage": "medium",
    "longevity": "good",
    "oxidation": "unknown"
  },
  "confidence": 0.82
}
```

聚合总结:

1. 按肤质聚合反馈。
2. 提取高频优点和缺点。
3. 统计推荐态度。
4. 识别敏感肌/痘肌/干皮等细分反馈。
5. 输出一句话结论。

### 7.4 AI Agent System Prompt 要点

1. 角色: 化妆品护肤品选购助手。
2. 目标: 帮用户理解商品、成分、评价和搭配，辅助消费决策。
3. 边界:
   - 不诊断疾病。
   - 不承诺治疗效果。
   - 对孕期、严重过敏、皮炎、医美后等场景给出谨慎提示。
4. 引用:
   - 商品推荐必须优先调用工具。
   - 成分判断必须优先使用成分库。
   - 评价总结必须说明样本量和不确定性。
5. 语气:
   - 友好、简洁、解释充分。
   - 避免制造焦虑。

### 7.5 Agent 工具调用流程

```text
用户问题
  ↓
识别意图
  ├── 商品推荐 → 读取肤质档案 → 搜索 SPU → 排序 → 解释
  ├── 成分解释 → 搜索成分库 → 输出解释和注意事项
  ├── 商品对比 → 读取多个 SPU → 成分/评价/价格对比
  ├── 搭配检查 → 读取已有产品/输入成分 → 规则检查 → 建议
  └── 护肤流程 → 肤质 + 诉求 + 预算 → 推荐步骤和候选商品
  ↓
SSE 流式返回
  ├── message 文本
  ├── spus 商品卡
  ├── ingredients 成分卡
  └── safety 谨慎提示
```

---

## 8. 前端设计

### 8.1 技术实现

继续使用:

1. Taro 3.x。
2. React 18。
3. TypeScript。
4. TailwindCSS。
5. Zustand。
6. `services/api.ts` 封装 Taro.request。
7. 独立 `frontend/src/config/env.ts` 配置 API_HOST，避免小程序运行时使用 `process.env`。

### 8.2 页面结构

TabBar:

| Tab | 路由 | 说明 |
|-----|------|------|
| 首页 | `/pages/index/index` | 肤质档案、场景快捷卡、推荐商品 |
| 分类 | `/pages/category/index` | 品类、功效、成分入口 |
| AI | `/pages/chat/index` | 美妆护肤 AI 助手 |
| 我的 | `/pages/mine/index` | 肤质档案、收藏、已有产品 |

子页面:

| 路由 | 说明 |
|------|------|
| `/pages/profile/skin` | 肤质档案编辑 |
| `/pages/product/list` | 商品列表 |
| `/pages/product/detail?id=` | 商品详情 |
| `/pages/product/compare` | 商品对比 |
| `/pages/ingredient/detail?id=` | 成分详情 |
| `/pages/ingredient/analyze` | 粘贴成分分析 |
| `/pages/routine/index` | 护肤流程 |
| `/pages/mine/favorites` | 收藏 |
| `/pages/mine/shelf` | 已有产品 |

### 8.3 视觉风格

定位: 清爽、可信、专业，但保留美妆场景的精致感。不要做成医疗工具，也不要做成过度营销的品牌官网。

建议视觉语言:

1. 背景: 接近白色的暖灰或冷白，保持信息清晰。
2. 主色: 柔和玫瑰色或珊瑚色用于关键操作。
3. 辅助色:
   - 青绿色: 安全/温和/修护。
   - 琥珀色: 谨慎/注意。
   - 深墨色: 正文和标题。
4. 卡片圆角控制在 8px 内，与现有工程约束一致。
5. 图标优先使用 lucide 或现有 SVG 组件体系。
6. 避免一整套 UI 都是粉色；功效、风险、价格、评价使用不同语义色。
7. 页面第一屏要出现真实商品图或可用功能，不做纯装饰 Hero。

#### 8.3.1 从宠物项目橘红主题迁移

当前宠物小程序采用橘红色作为主要视觉色，适合宠物用品、电商导购和购买转化场景。美妆护肤小程序建议调整主题策略，不直接沿用大面积橘红，否则容易显得偏促销、偏货架电商，削弱「成分分析」「肤质适配」「科学选品」需要的可信度和精致感。

迁移策略:

1. **橘红降级为交易强调色**: 保留在价格、优惠、购买、领券、好价、限时活动等转化相关区域。
2. **主品牌色改为柔和玫瑰/珊瑚粉**: 用于主按钮、选中态、核心导航和品牌识别，比橘红更贴合护肤美妆语境。
3. **专业信息使用语义色**: 修护/温和用青绿色，谨慎/注意用琥珀色，风险/避雷用红棕色，避免所有标签都靠同一种暖色表达。
4. **背景保持干净克制**: 使用暖白或冷白底，卡片白色，边框浅灰米色，突出商品图、成分信息和评价内容。
5. **不做全盘粉色化**: 粉色只承担品牌和关键操作，不覆盖所有页面区域，防止审美单一和信息层级混乱。

建议色彩职责:

| 颜色角色 | 推荐颜色 | 使用场景 |
|----------|----------|----------|
| 主品牌色 | `#D96B6B` | 主按钮、选中态、核心操作 |
| 主品牌深色 | `#B84F4F` | 按压态、重点标题、深色强调 |
| 交易强调色 | `#F26A3D` | 价格、去购买、优惠券、好价标签 |
| 修护/温和 | `#4B9A8D` | 修护、舒缓、敏感肌友好 |
| 谨慎/注意 | `#C7892B` | 成分注意、搭配提醒 |
| 风险/避雷 | `#B94A48` | 过敏反馈、刺激风险、避雷命中 |
| 背景 | `#F8F7F5` | 页面背景 |
| 卡片 | `#FFFFFF` | 商品卡、信息面板 |
| 正文 | `#24211F` | 标题、正文 |
| 次要文字 | `#7A7470` | 辅助说明 |

设计令牌建议:

```ts
export const beautyTheme = {
  colors: {
    background: '#F8F7F5',
    surface: '#FFFFFF',
    text: '#24211F',
    muted: '#7A7470',
    primary: '#D96B6B',
    primaryDark: '#B84F4F',
    commerce: '#F26A3D',
    repair: '#4B9A8D',
    caution: '#C7892B',
    risk: '#B94A48',
    border: '#E7E1DC'
  },
  radius: {
    sm: 4,
    md: 8
  }
}
```

### 8.4 组件设计

核心组件:

| 组件 | 说明 |
|------|------|
| `BeautySpuCard` | 商品卡 |
| `SkinProfileSwitcher` | 肤质档案切换 |
| `ScenarioGrid` | 场景快捷入口 |
| `EfficacyTag` | 功效标签 |
| `SkinFitBadge` | 肤质适配标签 |
| `IngredientChip` | 成分标签 |
| `RiskFlag` | 风险提示 |
| `ReviewSummaryPanel` | AI 评价总结 |
| `ListingPriceRow` | 购买清单行 |
| `RoutineStepCard` | 护肤流程步骤 |
| `CompareBar` | 对比浮条 |
| `ChatProductCard` | AI 回答中的商品卡 |
| `ChatIngredientCard` | AI 回答中的成分卡 |

### 8.5 首页布局草图

```text
┌──────────────────────────────┐
│ 混油皮 · 控油修护      编辑  │
├──────────────────────────────┤
│ 搜产品 / 品牌 / 成分 / 功效   │
├──────────────────────────────┤
│ 场景快捷入口                  │
│ [屏障修护] [通勤防晒]         │
│ [油皮控油] [抗老入门]         │
├──────────────────────────────┤
│ 为你筛出的商品                │
│ ┌──────────────────────────┐ │
│ │ 商品图  品牌 商品名       │ │
│ │ 控油 修护 油皮友好        │ │
│ │ 适配理由 / 价格 / 评价    │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 热门成分 / 最近好价           │
└──────────────────────────────┘
```

### 8.6 商品详情布局草图

```text
┌──────────────────────────────┐
│ 图片轮播                      │
├──────────────────────────────┤
│ 品牌 商品名 规格              │
│ ¥129-189                      │
│ [油皮友好] [控油] [修护]       │
│ AI: 清爽控油反馈多...          │
├──────────────────────────────┤
│ 概览 | 成分 | 评价 | 购买       │
├──────────────────────────────┤
│ 当前 Tab 内容                  │
└──────────────────────────────┘
底部固定: 收藏 | 对比 | 问 AI | 去购买
```

### 8.7 成分页交互

1. 顶部展示结论:「偏清爽修护，含香精，敏感肌谨慎」。
2. 分区展示:
   - 核心功效成分。
   - 保湿/油脂/乳化/防腐体系。
   - 风险与注意。
3. 成分列表支持展开解释。
4. 命中用户避雷时固定显示提示。
5. 提供「问 AI 这个成分」入口。

### 8.8 AI 聊天页交互

参考现有 ChatPage:

1. 首屏提供快捷问题:
   - 「帮我选通勤防晒」
   - 「分析我的成分表」
   - 「检查产品搭配」
   - 「300 内修护面霜」
2. 用户发送后惰性创建会话。
3. SSE 流式展示文本。
4. 商品结果以横向卡片展示。
5. 成分结果以小卡片或可展开行展示。
6. 安全提示用固定语义色，不做夸张警告。

### 8.9 状态管理

建议 Zustand store:

| Store | 状态 |
|-------|------|
| `beautyProfileStore` | 肤质档案、是否已加载 |
| `spuStore` | 商品列表、筛选、详情 |
| `compareStore` | 对比栏，最大 4 个 |
| `routineStore` | 护肤流程、已有产品 |
| `chatStore` | 会话、消息、流式状态 |
| `authStore` | 登录态 |

---

## 9. 后端架构设计

### 9.1 目录结构

建议在现有结构上新增领域服务:

```text
backend/
└── app/
    ├── api/v1/
    │   ├── auth.py
    │   ├── spus.py
    │   ├── categories.py
    │   ├── ingredients.py
    │   ├── recommendations.py
    │   ├── routines.py
    │   ├── chat.py
    │   ├── admin_spus.py
    │   ├── admin_ingredients.py
    │   └── admin_collect.py
    ├── agents/
    │   ├── beauty_agent.py
    │   ├── prompts.py
    │   └── tools.py
    ├── models/
    │   ├── user.py
    │   ├── beauty_profile.py
    │   ├── spu.py
    │   ├── ingredient.py
    │   ├── review.py
    │   └── collection.py
    ├── schemas/
    │   ├── beauty_profile.py
    │   ├── spu.py
    │   ├── ingredient.py
    │   ├── recommendation.py
    │   ├── routine.py
    │   └── review.py
    ├── services/
    │   ├── spu_service.py
    │   ├── ingredient_service.py
    │   ├── beauty_profile_service.py
    │   ├── recommendation_service.py
    │   ├── routine_service.py
    │   ├── compatibility_service.py
    │   ├── review_service.py
    │   ├── llm_analyzer.py
    │   ├── xhs_collector.py
    │   └── listing_import_service.py
    └── core/
        ├── config.py
        ├── database.py
        ├── deps.py
        └── security.py
```

### 9.2 服务职责

| 服务 | 职责 |
|------|------|
| `SpuService` | 商品 CRUD、详情、列表、对比 |
| `IngredientService` | 成分查询、成分表解析、成分摘要 |
| `BeautyProfileService` | 用户肤质档案 |
| `RecommendationService` | 商品推荐、场景推荐、排序解释 |
| `RoutineService` | 护肤流程生成和保存 |
| `CompatibilityService` | 成分/产品搭配规则检查 |
| `ReviewService` | 评价查询、审核、聚合 |
| `LLMAnalyzer` | 单条评价分析、聚合总结、商品信息提取 |
| `XHSCollector` | 小红书笔记和评论采集 |
| `ListingImportService` | 电商清单导入和 SPU 匹配 |

### 9.3 数据流水线

```text
外部数据
  ├── 电商商品链接/搜索
  ├── 小红书笔记
  ├── 电商评价
  └── 成分/备案信息
      ↓
原始数据落库 crawled_products / raw_reviews
      ↓
清洗与结构化
      ├── 商品字段提取
      ├── 成分表解析
      ├── SKU/规格识别
      └── 评价正文去噪
      ↓
SPU 匹配
      ├── 自动 linked
      ├── candidate 待确认
      └── unmatched 待处理
      ↓
LLM 分析
      ├── 商品摘要
      ├── 成分摘要
      ├── 单条评价标签
      └── 聚合口碑总结
      ↓
前端展示 / AI 工具调用 / 管理后台审核
```

### 9.4 缓存策略

Redis 缓存:

| Key | TTL | 内容 |
|-----|-----|------|
| `spu:list:{hash}` | 5 分钟 | 商品列表结果 |
| `spu:detail:{id}` | 10 分钟 | 商品详情 |
| `ingredient:{id}` | 1 小时 | 成分详情 |
| `profile:{user_id}` | 10 分钟 | 用户肤质档案 |
| `recommend:home:{user_id}` | 10 分钟 | 首页推荐 |
| `chat:rate:{user_id}` | 1 分钟 | 聊天限流 |

缓存失效:

1. SPU 更新后删除 `spu:detail` 和相关列表缓存。
2. 成分更新后删除成分缓存和受影响 SPU 的成分摘要。
3. 用户档案更新后删除推荐缓存。
4. 新评价聚合后删除 SPU 详情缓存。

---

## 10. 数据采集设计

### 10.1 数据源

| 数据源 | 用途 | 触发方式 |
|--------|------|----------|
| 京东/天猫/淘宝/拼多多 | 商品清单、价格、SKU | 管理员定向导入 + 定时价格刷新 |
| 小红书 | 使用笔记、评论、妆效反馈 | 管理员按 SPU 手动触发 |
| 电商评价 | 好评/差评关键词、使用反馈 | 管理员手动或低频定时 |
| 品牌官网 | 官方描述、图片、规格 | 管理员手动补充 |
| 成分资料 | 成分解释和标签 | 人工维护 + 批量导入 |

### 10.2 小红书采集流程

```text
管理员点击采集
  ↓
创建 data_fetch_jobs
  ↓
检查同 SPU 是否已有 running 任务
  ↓
构造关键词: 品牌 + 商品名 + 别名 + 类目
  ↓
搜索笔记，最多 20 条
  ↓
逐条抓取详情和前 10 条评论
  ↓
按 external_note_id 去重
  ↓
保存 review
  ↓
LLM 单条分析
  ↓
聚合生成 ai_review_summary
  ↓
任务 completed / partial_success / failed
```

错误处理:

1. Cookie 失效: 任务失败，提示更新 Cookie。
2. 网络错误: 保存已成功部分，任务标记 `partial_success`。
3. 无结果: 任务完成但 result 记录 `new=0`。
4. LLM 失败: 评价保留，摘要为空或延后重试。
5. 重复笔记: 跳过，不计入失败。

### 10.3 商品清单导入

流程:

1. 管理员在 SPU 详情页点击「导入购买链接」。
2. 默认关键词: `brand + name + model`。
3. 抓取候选 listing。
4. 规则 + LLM 匹配当前 SPU。
5. 高置信度自动 linked，中置信度 candidate，低置信度 unmatched。
6. 后台展示候选，管理员确认。

### 10.4 成分表解析

输入来源:

1. 管理员粘贴。
2. 电商详情页提取。
3. 品牌官网。
4. 图片 OCR，后续可选。

解析步骤:

1. 清洗标点和空格。
2. 按中英文逗号、顿号、换行拆分。
3. 别名匹配成分库。
4. 未识别成分进入待维护队列。
5. 生成 `spu_ingredients`。
6. 触发成分摘要生成。

---

## 11. 安全、隐私与合规

### 11.1 用户隐私

肤质档案可能包含敏感偏好和身体状态，需采取:

1. 明确告知用途: 用于推荐和 AI 问答。
2. 用户可删除档案。
3. 后台默认脱敏展示用户信息。
4. 不将用户档案发送给非必要第三方。
5. 日志中不记录完整用户隐私字段。

### 11.2 内容安全

1. 用户输入和采集内容需做敏感词过滤。
2. AI 回答需经过安全边界提示。
3. 评价内容展示前可由管理员审核。
4. 外部链接跳转遵守小程序平台规则。

### 11.3 医疗边界

产品内固定原则:

1. 不诊断皮肤疾病。
2. 不承诺治疗效果。
3. 不替代医生建议。
4. 对严重过敏、皮炎、感染、长期爆痘等情况提示线下就医。
5. 对孕期、哺乳期、儿童使用等场景给出谨慎提示。

### 11.4 采集合规

1. 优先使用合法 API、公开页面、合作数据源或人工维护。
2. 控制频率，避免对外部平台造成压力。
3. 保存来源链接和采集时间。
4. 对侵权或用户请求删除内容提供处理机制。

---

## 12. 非功能需求

### 12.1 性能

| 指标 | 目标 |
|------|------|
| 商品列表首屏 | 2 秒内 |
| 商品详情 | 2 秒内 |
| 成分分析接口 | 3 秒内，LLM 延迟可异步 |
| AI 首 token | 3 秒内 |
| 小红书 20 条笔记采集 | 2-3 分钟内 |
| 后台列表分页 | 1 秒内 |

### 12.2 可用性

1. 采集和 LLM 任务异步执行。
2. 前端有 loading、空状态、错误状态。
3. 无肤质档案时使用通用推荐。
4. AI 不可用时商品浏览和搜索仍可用。
5. 外部价格采集失败不影响 SPU 展示。

### 12.3 可观测性

日志:

1. request_id。
2. user_id/admin_id。
3. spu_id。
4. job_id。
5. data_source。
6. LLM token 和耗时。
7. 错误类型。

指标:

1. API QPS 和延迟。
2. 采集成功率。
3. LLM 成功率和耗时。
4. 推荐点击率。
5. 商品详情转购买点击率。
6. 搜索无结果率。

### 12.4 测试

后端:

1. 成分解析单元测试。
2. 推荐评分单元测试。
3. 搭配规则单元测试。
4. SPU API 集成测试。
5. 评价采集任务契约测试。
6. AI 工具 mock 测试。

前端:

1. 商品列表筛选手动测试。
2. 商品详情四 Tab 测试。
3. 肤质档案创建/编辑测试。
4. AI 流式对话测试。
5. 小程序真机网络测试。

---

## 13. 部署与环境

### 13.1 开发环境

沿用现有项目:

```text
backend:  uvicorn app.main:app --host 0.0.0.0 --port 8000
frontend: Taro dev:weapp
admin:    Vite dev server
db:       PostgreSQL 15
cache:    Redis
```

WSL2 + 微信开发者工具网络调试继续使用现有规则:

1. DevTools: `API_HOST = 127.0.0.1`
2. 真机: `API_HOST = Windows WiFi IP`
3. 不在小程序前端使用 `process.env`

### 13.2 生产架构

```text
WeChat Mini Program
        ↓
Nginx / HTTPS
        ↓
FastAPI backend
        ├── PostgreSQL
        ├── Redis
        ├── Background workers
        └── LLM provider

Admin Web
        ↓
Nginx / HTTPS
        ↓
FastAPI admin APIs
```

后台任务:

1. 采集任务可以先用 `asyncio.create_task`。
2. 当任务增多后迁移到 Celery/RQ/Arq。
3. LLM 聚合摘要支持失败重试。

---

## 14. 迭代计划

### Phase 0: 领域准备，1-2 周

目标:

1. 定义分类、肤质、功效、成分标签体系。
2. 梳理 MVP 品类: 精华、面霜、防晒、洁面、粉底。
3. 建立 100-300 个核心成分种子数据。
4. 建立 50-100 个商品 SPU 种子数据。

交付:

1. 标签字典。
2. 成分库初版。
3. SPU 种子数据。
4. AI Prompt 初版。

### Phase 1: MVP 小程序，4-6 周

目标:

1. 用户肤质档案。
2. 首页场景推荐。
3. 商品列表/搜索/筛选。
4. 商品详情: 概览、成分、评价、购买。
5. 收藏和对比。
6. AI 助手基础问答。
7. 管理后台 SPU 和成分管理。

验收:

1. 用户能按肤质和功效找到商品。
2. 商品详情能解释成分和评价。
3. AI 能基于商品库推荐。
4. 管理员能维护商品和成分。

### Phase 2: 数据采集增强，3-4 周

目标:

1. SPU 定向导入购买清单。
2. 小红书评价采集。
3. 电商评价摘要。
4. 价格历史。
5. 后台任务监控。

验收:

1. 管理员能在 SPU 维度触发采集。
2. 商品评价页展示 AI 口碑总结。
3. 购买页展示多平台价格。

### Phase 3: 搭配与流程，3-4 周

目标:

1. 用户已有产品。
2. 护肤流程推荐。
3. 成分搭配检查。
4. AI 生成早晚流程。

验收:

1. 用户能保存自己的产品。
2. 系统能提示搭配注意点。
3. AI 能给出解释型流程建议。

### Phase 4: 增长与精细化，持续迭代

方向:

1. 彩妆色号体系。
2. 趋势榜单。
3. 个性化排序优化。
4. 用户反馈闭环。
5. 运营专题。
6. 更完善的合规和内容审核。

---

## 15. MVP 数据字典建议

### 15.1 肤质枚举

| code | 名称 |
|------|------|
| dry | 干皮 |
| oily | 油皮 |
| combination_oily | 混油皮 |
| combination_dry | 混干皮 |
| normal | 中性皮 |
| sensitive | 敏感肌 |

### 15.2 功效枚举

| code | 名称 |
|------|------|
| hydrating | 保湿 |
| repair | 修护 |
| soothing | 舒缓 |
| oil_control | 控油 |
| acne_care | 痘肌护理 |
| brightening | 提亮 |
| anti_aging | 抗老 |
| exfoliating | 去角质 |
| sunscreen | 防晒 |
| cleansing | 清洁 |
| makeup_base | 妆前 |
| coverage | 遮瑕 |
| long_wear | 持妆 |

### 15.3 风险标签

| code | 名称 |
|------|------|
| fragrance | 香精 |
| alcohol | 酒精 |
| essential_oil | 精油 |
| acid | 酸类 |
| retinoid | 视黄醇类 |
| comedogenic | 致痘风险 |
| photosensitive | 光敏相关 |
| strong_cleanser | 清洁力较强 |
| pregnancy_caution | 特殊时期谨慎 |

### 15.4 场景标签

| code | 名称 |
|------|------|
| barrier_repair | 屏障修护 |
| commute_sunscreen | 通勤防晒 |
| summer_oil_control | 夏季控油 |
| acne_simple_routine | 痘肌精简 |
| anti_aging_beginner | 抗老入门 |
| dull_skin | 熬夜暗沉 |
| base_makeup | 底妆服帖 |
| travel | 出差旅行 |

---

## 16. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 成分数据不准确 | 推荐可信度下降 | 成分库人工审核，标注来源和证据等级 |
| AI 过度承诺 | 合规风险 | Prompt 限制，安全后处理，敏感场景固定提示 |
| 外部平台采集不稳定 | 评价/价格缺失 | 管理员手动触发、失败重试、部分成功保存 |
| SPU 匹配错误 | 价格或评价挂错商品 | 置信度分层、后台候选审核、合并/拆分工具 |
| 用户肤质自测不准 | 推荐偏差 | 允许修改档案，推荐解释保留不确定性 |
| 彩妆色号复杂 | 用户体验不足 | MVP 先做底妆基础字段，后续扩展色号体系 |
| 小程序包体积过大 | 加载慢 | 分包、懒加载、图片 CDN、组件复用 |

---

## 17. 关键验收标准

1. 用户可以在 3 分钟内完成肤质档案创建并获得推荐。
2. 商品列表支持至少 5 个核心筛选维度: 品类、肤质、功效、价格、避雷成分。
3. 商品详情能展示成分摘要、评价摘要和购买清单。
4. AI 助手可以基于站内商品回答推荐、对比、成分解释问题。
5. 管理后台可以完成 SPU、成分、清单、评价采集的闭环维护。
6. 小红书评价采集支持 SPU 维度手动触发、状态查询、部分成功保存。
7. 推荐结果必须有解释和注意事项。
8. 用户可以删除肤质档案和已有产品记录。

---

## 18. 建议的代码迁移策略

如果从当前 `pet-store` 直接派生新项目，建议按以下步骤:

1. **复制工程骨架**
   - 保留 `backend/frontend/admin/deploy` 目录结构。
   - 保留认证、统一响应、API client、SSE、Zustand、管理后台布局。

2. **领域命名清理**
   - 后端保留通用 `spus/listings/reviews/categories`。
   - 删除或迁移 `pet_type` 相关字段，改为 `product_type/skin_type`。
   - 前端移除宠物图标、宠物档案和场景配置。

3. **新增成分与肤质模型**
   - 先加 `beauty_profiles`、`ingredients`、`spu_ingredients`。
   - 再接入推荐和成分分析。

4. **前端替换页面**
   - 首页从宠物切换改为肤质切换。
   - 商品详情替换营养/宠物适配为成分/肤质适配。
   - AI 助手 Prompt 和快捷问题替换。

5. **后台增强**
   - SPU 管理增加成分表。
   - 新增成分库页面。
   - 复用清单导入和评价采集任务。

6. **数据种子**
   - 先维护 50-100 个高频商品。
   - 每个商品尽量有成分表、图片、1-3 个 listing。
   - 评价采集可以逐步补齐。

---

## 19. 附录: 与现有文件的映射建议

| 现有文件/模块 | 新项目建议 |
|---------------|------------|
| `frontend/src/config/env.ts` | 保留，用于 API_HOST |
| `frontend/src/services/api.ts` | 保留并扩展美妆接口 |
| `frontend/src/stores/compareStore.ts` | 保留 |
| `frontend/src/stores/spuStore.ts` | 保留，字段类型调整 |
| `frontend/src/pages/index/index.tsx` | 重写为肤质首页 |
| `frontend/src/pages/product/detail.tsx` | 保留结构，重写 Tab 内容 |
| `frontend/src/pages/chat/index.tsx` | 保留 SSE 逻辑，替换 Prompt 和卡片 |
| `backend/app/models/spu.py` | 扩展美妆字段 |
| `backend/app/schemas/spu.py` | 扩展响应模型 |
| `backend/app/services/llm_analyzer.py` | 扩展成分/评价分析 |
| `backend/app/services/xhs_collector.py` | 保留采集框架，调整分析字段 |
| `backend/app/api/v1/admin_collect.py` | 保留 SPU 维度触发 |
| `admin/src/pages/Spus` | 扩展成分、肤质、功效字段 |

---

## 20. 总结

该美妆护肤小程序可以最大程度复用现有宠物选品小程序的工程资产: SPU 中台、多平台比价、评价采集、AI 总结、AI 对话、Taro 小程序和 React 管理后台。真正需要新增的核心壁垒在于「成分库」「肤质档案」「搭配规则」「美妆领域 AI Prompt」和「按肤质/功效解释推荐」。

建议 MVP 不追求全品类和复杂试妆，而是先把护肤决策链路做扎实: 用户档案 → 场景推荐 → 商品详情成分解释 → 评价总结 → 购买链接 → AI 问答。这样既能承接现有架构，也能形成区别于普通电商导购和单纯成分查询工具的产品价值。
