# 数据采集模块设计文档

> 所属项目：宠物好物助手小程序  
> 版本: v2.0（MVP精简版）  
> 日期: 2026-05-10  
> 范围: MVP阶段，仅对接拼多多多多进宝API + 小红书评价采集

---

## 一、概述

### 1.1 设计目标

MVP阶段只对接两个数据源：
1. **拼多多多多进宝API** —— 商品基础信息唯一来源
2. **小红书用户笔记** —— 真实评价唯一来源

### 1.2 数据流

```
种子商品录入（手动50个：名称+拼多多链接）
        │
        ▼
拼多多API ──► 标题/价格/描述/图片/评分/销量
        │
        ▼
LLM提取 ──► 品牌/规格/成分/产地（从描述中解析）
        │
        ▼
┌──────────────────┐
│    商品表(PG)     │
│                  │
│ • 拼多多原生字段  │◄────── 直接入库
│ • LLM提取字段    │◄────── LLM解析后入库
│ • 人工补充字段   │◄────── 运营后台补录
│ • 标签聚合字段   │◄────── 小红书评价LLM分析后汇总
└──────────────────┘
        ▲
        │
小红书xhs库 ──► 笔记/评论 ──► LLM分析优缺点 ──► 评价表
```

### 1.3 商品字段与数据来源映射

| 字段类别 | 字段名 | 数据来源 | 获取方式 |
|----------|--------|----------|----------|
| **基础** | 商品名称 `goods_name` | 拼多多API | `pdd.ddk.goods.detail` 返回 |
| | 商品描述 `goods_desc` | 拼多多API | `pdd.ddk.goods.detail` 返回（纯文本/HTML） |
| | 主图/轮播图 | 拼多多API | `goods_image_url` / `goods_gallery_urls` |
| | 拼多多商品ID `goods_id` | 拼多多API | 唯一标识，用于关联 |
| | 拼多多链接 | 运营录入 | 种子商品手动录入 |
| **价格** | 拼团价 `min_group_price` | 拼多多API | 单位：分，÷100 |
| | 单买价 `min_normal_price` | 拼多多API | 单位：分，÷100 |
| | 优惠券金额 `coupon_discount` | 拼多多API | 单位：分 |
| | 优惠券有效期 | 拼多多API | `coupon_start_time` / `end_time` |
| **销售** | 累计销量 `sales_tip` | 拼多多API | "已拼1.2万件" |
| | 评价分 `goods_eval_score` | 拼多多API | 1-5分 |
| | 评价数量 `goods_eval_count` | 拼多多API | 累计评价数 |
| **品类** | 分类名称 `category_name` | 拼多多API | "猫粮" |
| | 标签名称 `opt_name` | 拼多多API | "幼猫粮" |
| | 店铺名 `mall_name` | 拼多多API | 店铺名称 |
| | 店铺评分 `mall_cps` | 拼多多API | DSR评分 |
| **LLM提取** | 品牌 `brand` | 拼多多描述+LLM | 从标题"皇家猫粮"提取"皇家" |
| | 规格重量 `spec_weight` | 拼多多描述+LLM | 从"2kg/袋"提取 |
| | 形态 `spec_form` | 拼多多描述+LLM | 干粮/湿粮/冻干/风干/零食 |
| | 产地 `origin` | 拼多多描述+LLM | 从描述提取 |
| | 保质期 `shelf_life` | 拼多多描述+LLM | 从描述提取 |
| | 适用年龄 `age_range` | 拼多多描述+LLM | 幼猫/成猫/全期 |
| | 特殊配方 `special_formula` | 拼多多描述+LLM | 无谷/低敏/室内/绝育 |
| | 成分表 `ingredients` | 拼多多描述+LLM | 提取前8个主要成分 |
| | 营养亮点 `nutrition` | 拼多多描述+LLM | 高蛋白/益生菌等 |
| **人工补充** | 适用宠物类型 `pet_type` | 人工标注 | 猫/狗/鸟/鱼 |
| | 是否活跃 `status` | 人工控制 | 上架/下架 |
| **评价聚合** | 优点标签 `pros` | 小红书+LLM | 多条评价LLM分析后取Top |
| | 缺点标签 `cons` | 小红书+LLM | 同上 |
| | 推荐率 `recommend_rate` | 小红书+LLM | 推荐/不推荐的占比 |

---

## 二、拼多多多多进宝API接入

### 2.1 认证信息

```python
# app/config.py

PDD_CONFIG = {
    "client_id": "你的client_id",       # 开放平台创建应用后获得
    "client_secret": "你的client_secret",
    "api_url": "https://gw-api.pinduoduo.com/api/router",
    "pid": "你的推广位pid",            # 多多进宝推广位ID
}
```

### 2.2 签名算法

```python
# app/services/pdd_client.py

import hashlib
import time
import json
from typing import Optional

class PinduoduoClient:
    """拼多多多多进宝API客户端"""

    def __init__(self, client_id: str, client_secret: str, pid: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.pid = pid
        self.api_url = "https://gw-api.pinduoduo.com/api/router"

    def _generate_sign(self, params: dict) -> str:
        """生成拼多多API签名"""
        # 1. 过滤value为空的参数
        filtered = {k: v for k, v in params.items() if v is not None}
        # 2. 按key升序排序
        sorted_params = sorted(filtered.items(), key=lambda x: x[0])
        # 3. 拼接：client_secret + key1value1 + key2value2 + ... + client_secret
        sign_str = self.client_secret + "".join(f"{k}{v}" for k, v in sorted_params) + self.client_secret
        # 4. MD5大写
        return hashlib.md5(sign_str.encode("utf-8")).hexdigest().upper()

    def _build_params(self, method: str, **kwargs) -> dict:
        """构建通用请求参数"""
        params = {
            "type": method,
            "client_id": self.client_id,
            "timestamp": str(int(time.time())),
            "data_type": "JSON",
            "version": "V1",
            "sign": "",  # 占位，最后计算
            **kwargs
        }
        params["sign"] = self._generate_sign(params)
        return params
```

### 2.3 商品搜索 `pdd.ddk.goods.search`

```python
    async def search_goods(
        self,
        keyword: str = None,
        opt_id: int = None,           # 分类/标签ID
        page: int = 1,
        page_size: int = 100,
        sort_type: int = 0,           # 0-综合 2-销量 6-评价排序
        with_coupon: bool = False,
        range_list: list = None,      # 价格区间 [{"range_from": 100, "range_to": 500}]
    ) -> list[dict]:
        """
        搜索多多进宝商品
        
        适用场景：
        - 按关键词搜索（如"猫粮 幼猫"）
        - 按分类ID搜索（获取宠物分类下的商品）
        - 按价格区间筛选
        - 按销量/评价排序
        """
        params = self._build_params(
            "pdd.ddk.goods.search",
            keyword=keyword,
            opt_id=opt_id,
            page=page,
            page_size=min(page_size, 100),  # 最大100
            sort_type=sort_type,
            with_coupon="true" if with_coupon else "false",
            pid=self.pid,
        )
        if range_list:
            params["range_list"] = json.dumps(range_list)

        response = await self._request(params)
        return self._parse_search_response(response)

    def _parse_search_response(self, response: dict) -> list[dict]:
        """解析搜索响应"""
        goods_list = response.get("goods_search_response", {}).get("goods_list", [])
        return [self._normalize_goods_item(item) for item in goods_list]

    def _normalize_goods_item(self, item: dict) -> dict:
        """将API返回的商品数据标准化为内部格式"""
        return {
            "goods_id": item.get("goods_id"),
            "goods_name": item.get("goods_name"),
            "goods_desc": item.get("goods_desc", ""),
            "min_group_price": int(item.get("min_group_price", 0)),  # 分
            "min_normal_price": int(item.get("min_normal_price", 0)),
            "goods_image_url": item.get("goods_image_url"),
            "goods_gallery_urls": item.get("goods_gallery_urls", []),
            "goods_eval_score": float(item.get("goods_eval_score", 0)),
            "goods_eval_count": int(item.get("goods_eval_count", 0)),
            "category_name": item.get("category_name"),
            "opt_name": item.get("opt_name"),
            "mall_name": item.get("mall_name"),
            "mall_cps": float(item.get("mall_cps", 0)),
            "sales_tip": item.get("sales_tip", ""),
            "coupon_discount": int(item.get("coupon_discount", 0)),
            "coupon_start_time": item.get("coupon_start_time"),
            "coupon_end_time": item.get("coupon_end_time"),
            "has_coupon": bool(item.get("coupon_discount", 0) > 0),
            "desc_pct": float(item.get("desc_pct", 0)),   # 描述评分
            "lgst_pct": float(item.get("lgst_pct", 0)),   # 物流评分
            "serv_pct": float(item.get("serv_pct", 0)),   # 服务评分
        }
```

### 2.4 商品详情 `pdd.ddk.goods.detail`

```python
    async def get_goods_detail(self, goods_id: str) -> dict:
        """
        查询单个商品详情
        
        注意：pdd.ddk.goods.detail 需要传入goods_id_list（JSON数组格式）
        返回的字段与search基本一致，描述更完整
        """
        params = self._build_params(
            "pdd.ddk.goods.detail",
            goods_id_list=json.dumps([str(goods_id)]),
            pid=self.pid,
        )

        response = await self._request(params)
        goods_list = response.get("goods_detail_response", {}).get("goods_details", [])
        if not goods_list:
            return None
        return self._normalize_goods_item(goods_list[0])
```

### 2.5 分类/标签ID查询

```python
    async def get_category_list(self, parent_opt_id: int = 0) -> list[dict]:
        """
        查询商品标签/分类列表
        
        用于获取宠物相关分类的opt_id，后续用opt_id搜索商品
        宠物相关分类opt_id通常：
        - 宠物/宠物食品 等一级分类下查找
        """
        params = self._build_params(
            "pdd.goods.opt.get",
            parent_opt_id=parent_opt_id,
        )
        response = await self._request(params)
        return response.get("goods_opt_get_response", {}).get("goods_opt_list", [])

    # 常见宠物品类opt_id（需实际查询确认）
    # PET_CATEGORY_IDS = {
    #     "猫粮": 12345,
    #     "狗粮": 12346,
    #     "猫零食": 12347,
    #     ...
    # }
```

### 2.6 频率限制与错误处理

```python
    async def _request(self, params: dict) -> dict:
        """发送API请求，内置限流和重试"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.api_url, params=params, timeout=30) as resp:
                        data = await resp.json()

                        # 检查错误
                        if "error_response" in data:
                            error = data["error_response"]
                            error_code = error.get("error_code")
                            error_msg = error.get("error_msg")

                            # 限流错误，等待后重试
                            if error_code in ("70031", "70032"):  # 频率限制
                                wait = 2 ** attempt
                                logger.warning(f"PDD rate limit, wait {wait}s")
                                await asyncio.sleep(wait)
                                continue
                            raise PDDAPIError(f"[{error_code}] {error_msg}")

                        return data

            except asyncio.TimeoutError:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

        raise PDDAPIError(f"Max retries ({max_retries}) exceeded")
```

### 2.7 数据标准化（分→元）

```python
    def price_to_yuan(self, fen: int) -> float:
        """价格转换：分 → 元"""
        return round(fen / 100, 2)

    def get_coupon_price(self, item: dict) -> float:
        """计算券后价"""
        group_price = item["min_group_price"]
        coupon = item["coupon_discount"]
        if coupon > 0:
            return self.price_to_yuan(max(group_price - coupon, 0))
        return self.price_to_yuan(group_price)
```

---

## 三、LLM字段提取

### 3.1 提取流程

```
pdd.ddk.goods.detail 返回
        │
        ▼
┌───────────────────────┐
│ title + desc + category │
└───────────┬───────────┘
            │
            ▼
    LLM (gpt-4o-mini)
            │
            ▼
┌───────────────────────┐
│ brand / spec_weight   │
│ spec_form / origin    │
│ shelf_life / age_range│
│ special_formula       │
│ ingredients[8]        │
│ nutrition_highlight   │
└───────────────────────┘
```

### 3.2 Prompt

```python
EXTRACT_PRODUCT_PROMPT = """你是宠物用品数据提取专家。从拼多多商品信息中提取结构化字段。

【输入】
商品标题：{title}
商品分类：{category}
商品描述：{description}

【输出要求】
请严格返回JSON格式，字段如下：

{
  "brand": "品牌名称，如'皇家'。注意：ROYAL CANIN=皇家，Orijen=渴望，ACANA=爱肯拿。标题中没有则null",
  "spec_weight": "规格重量，如'2kg'、'1.5kg×2袋'。描述中寻找",
  "spec_form": "形态，只能是以下之一：干粮、湿粮、冻干、风干、零食、罐头、营养品、用品、玩具",
  "origin": "产地，如'法国'、'加拿大'、'中国上海'。描述中寻找",
  "shelf_life": "保质期，如'18个月'、'2年'",
  "age_range": "适用年龄，只能是以下之一：幼猫(4-12月)、成猫(1-7岁)、老年猫(7岁+)、全期、幼犬、成犬、老年犬、全期犬",
  "special_formula": ["特殊配方标签，如'无谷'、'低敏'、'室内猫'、'绝育'、'泌尿'、'减重'"],
  "ingredients": ["成分1", "成分2", "成分3", "成分4", "成分5", "成分6", "成分7", "成分8"],
  "nutrition_highlight": "一句话营养亮点，如'粗蛋白≥36%，添加益生菌'"
}

【提取规则】
1. 品牌：优先从标题提取，其次描述开头。注意中英文对照
2. 成分：找描述中"原料组成""成分""配方"后面的列表，取前8个
3. 找不到的字段填 null，不要猜测
4. 只输出纯JSON，不要任何其他文字
"""
```

### 3.3 调用代码

```python
from langchain_openai import ChatOpenAI
import json

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

async def extract_product_info(title: str, category: str, description: str) -> dict:
    """从拼多多商品信息中提取结构化字段"""
    prompt = EXTRACT_PRODUCT_PROMPT.format(
        title=title,
        category=category,
        description=description[:3000]  # 截断避免超长
    )
    result = await llm.ainvoke(prompt)

    try:
        data = json.loads(result.content)
        # 确保所有字段存在
        for field in ["brand", "spec_weight", "spec_form", "origin", 
                      "shelf_life", "age_range", "nutrition_highlight"]:
            if field not in data:
                data[field] = None
        if "special_formula" not in data:
            data["special_formula"] = []
        if "ingredients" not in data:
            data["ingredients"] = []
        return data
    except json.JSONDecodeError:
        logger.error(f"LLM返回非JSON: {result.content[:200]}")
        return {"brand": None, "spec_weight": None, "spec_form": None,
                "origin": None, "shelf_life": None, "age_range": None,
                "special_formula": [], "ingredients": [], "nutrition_highlight": None}
```

---

## 四、小红书评价采集

### 4.1 采集目标

| 内容 | 用途 |
|------|------|
| 笔记标题+正文 | 用户使用体验描述 |
| 笔记图片 | 用户上传的实物图 |
| 评论内容 | 其他用户的追问/补充反馈 |
| 点赞数 | 判断笔记热度/可信度参考 |
| 发布时间 | 增量更新游标 |

### 4.2 搜索关键词策略

```python
SEARCH_KEYWORD_TEMPLATES = [
    "{brand} {name} 测评",
    "{brand} {name} 怎么样",
    "{brand} {name} 真实反馈",
    "{name} 使用体验",
    "{name} 优缺点",
]

async def build_search_keywords(product: Product) -> list[str]:
    """为指定商品生成小红书搜索关键词"""
    brand = product.brand or ""
    name = product.goods_name

    keywords = []
    for template in SEARCH_KEYWORD_TEMPLATES:
        kw = template.format(brand=brand, name=name).strip()
        keywords.append(kw)
    return list(set(keywords))  # 去重
```

### 4.3 采集流程

```python
from xhs import XHS

async def collect_xhs_reviews(product: Product, max_notes: int = 30) -> list[dict]:
    """
    采集指定商品的小红书评价

    流程：
    1. 生成搜索关键词
    2. 按关键词搜索笔记（按热度排序）
    3. 获取笔记详情和评论
    4. LLM分析优缺点
    5. 保存到数据库
    """
    client = XHS(cookies=XHS_COOKIE)
    keywords = await build_search_keywords(product)

    all_reviews = []
    for keyword in keywords:
        if len(all_reviews) >= max_notes:
            break

        notes = client.get_note_by_keyword(
            keyword=keyword,
            sort=SearchSortType.HOT,
            note_type=SearchNoteType.ALL,
        )

        for note in notes:
            if len(all_reviews) >= max_notes:
                break

            # 获取详情和评论
            detail = client.get_note_by_id(note["note_id"])
            comments = client.get_note_all_comments(note["note_id"], crawl_interval=2)

            review = {
                "product_id": product.id,
                "source": "xiaohongshu",
                "external_note_id": note["note_id"],
                "title": detail["title"],
                "content": detail["content"],
                "images": detail.get("images", []),
                "author": detail["user"]["nickname"],
                "likes": detail["likes"],
                "comments_raw": [c["content"] for c in comments[:10]],
                "published_at": parse_time(detail["time"]),
            }

            # LLM分析优缺点
            analysis = await analyze_review(review)
            review.update(analysis)

            all_reviews.append(review)

    return all_reviews
```

### 4.4 增量更新

```python
async def collect_reviews_incremental(product: Product) -> int:
    """增量采集：只获取上次采集之后的新笔记"""

    # 1. 读取游标（上次采集的最新笔记时间）
    last_cursor = await db.fetchval(
        "SELECT cursor_value FROM collection_logs "
        "WHERE product_id = $1 AND source = 'xiaohongshu' AND status = 'success' "
        "ORDER BY completed_at DESC LIMIT 1",
        product.id
    )

    # 2. 搜索（按时间排序，不是热度）
    notes = xhs_client.get_note_by_keyword(
        keyword=f"{product.brand} {product.goods_name}",
        sort=SearchSortType.TIME,  # 按时间排序，便于增量
    )

    new_count = 0
    for note in notes:
        note_time = parse_time(note["time"])

        # 3. 时间过滤
        if last_cursor and note_time <= last_cursor:
            break  # 已采集过，后续都跳过

        # 4. note_id去重
        exists = await db.fetchval(
            "SELECT 1 FROM reviews WHERE external_note_id = $1",
            note["note_id"]
        )
        if exists:
            continue

        # 5. 采集 + 分析 + 保存
        ...
        new_count += 1

    # 6. 更新游标
    if new_count > 0:
        latest_time = max(...)
        await db.execute(
            "INSERT INTO collection_logs (product_id, source, collection_type, "
            "cursor_value, items_count, status, completed_at) "
            "VALUES ($1, 'xiaohongshu', 'incremental', $2, $3, 'success', NOW())",
            product.id, latest_time, new_count
        )

    return new_count
```

---

## 五、LLM评价分析

### 5.1 分析Prompt

```python
REVIEW_ANALYSIS_PROMPT = """你是宠物用品评价分析专家。分析用户的小红书笔记，提取结构化标签。

【输入】
笔记标题：{title}
笔记内容：{content}
评论内容：{comments}
商品信息：{product_name}（{brand}）

【输出要求】
严格返回JSON：

{
  "pros": ["优点标签1", "优点标签2", "优点标签3"],
  "cons": ["缺点标签1", "缺点标签2"],
  "summary": "一句话总结用户的核心体验感受",
  "recommended": true,
  "tags": ["适口性好", "毛色变亮", "性价比高"],
  "confidence": 0.85,
  "cat_mood": "猫咪的反应，如'很爱吃'、'一开始不吃后来习惯了'、'完全不吃'"
}

【标签规范】
- pros/cons 标签要简洁（4-8个字），中文
- 常见标签参考：适口性好、营养均衡、性价比高、便便正常、毛色变亮、
  价格偏高、部分猫不爱吃、颗粒太大、包装易破、有诱食剂味
- 内容中没有明确提到的不要编造
- confidence: 0-1，内容越详细越具体越高
- 只输出JSON，不要其他内容
"""
```

### 5.2 产品级标签聚合

```python
async def aggregate_product_tags(product_id: int):
    """聚合一个商品的所有评价标签"""

    reviews = await db.fetch(
        "SELECT pros, cons, recommended, llm_confidence "
        "FROM reviews WHERE product_id = $1 AND llm_processed = true",
        product_id
    )

    from collections import Counter

    # 汇总优点（加权）
    pro_weights = Counter()
    con_weights = Counter()
    recommend_yes = 0
    recommend_no = 0
    total_weight = 0

    for r in reviews:
        weight = r["llm_confidence"] or 0.5
        for p in r["pros"]:
            pro_weights[p] += weight
        for c in r["cons"]:
            con_weights[c] += weight
        if r["recommended"]:
            recommend_yes += weight
        elif r["recommended"] is False:
            recommend_no += weight
        total_weight += weight

    top_pros = [tag for tag, _ in pro_weights.most_common(8)]
    top_cons = [tag for tag, _ in con_weights.most_common(6)]
    recommend_rate = round(recommend_yes / total_weight * 100) if total_weight > 0 else 0

    # 更新商品表
    await db.execute(
        "UPDATE products SET pros = $1, cons = $2, recommend_rate = $3 "
        "WHERE id = $4",
        top_pros, top_cons, recommend_rate, product_id
    )
```

---

## 六、采集任务调度

### 6.1 定时任务配置

```python
# app/scheduler/jobs.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

# 1. 商品价格更新 —— 每小时（拼多多价格变动频繁）
scheduler.add_job(
    update_pdd_prices,
    trigger=CronTrigger(hour="*/1"),
    id="hourly_price_update",
    name="拼多多价格每小时更新",
)

# 2. 评价增量采集 —— 每日凌晨3点
scheduler.add_job(
    incremental_review_collection,
    trigger=CronTrigger(hour=3, minute=0),
    id="daily_review_fetch",
    name="小红书评价每日增量采集",
)

# 3. 标签重新聚合 —— 评价采集后
scheduler.add_job(
    reaggregate_all_tags,
    trigger=CronTrigger(hour=4, minute=0),
    id="daily_tag_aggregation",
    name="产品标签每日聚合",
)
```

### 6.2 任务执行函数

```python
async def update_pdd_prices():
    """每小时更新所有商品的价格和优惠券"""
    products = await db.fetch("SELECT id, goods_id FROM products WHERE status = 'active'")

    for p in products:
        try:
            detail = await pdd_client.get_goods_detail(p["goods_id"])
            if detail:
                await db.execute(
                    "UPDATE products SET min_group_price = $1, min_normal_price = $2, "
                    "coupon_discount = $3, coupon_start_time = $4, coupon_end_time = $5, "
                    "goods_eval_score = $6, goods_eval_count = $7, sales_tip = $8, "
                    "updated_at = NOW() WHERE id = $9",
                    detail["min_group_price"], detail["min_normal_price"],
                    detail["coupon_discount"], detail["coupon_start_time"],
                    detail["coupon_end_time"], detail["goods_eval_score"],
                    detail["goods_eval_count"], detail["sales_tip"],
                    p["id"]
                )
            await asyncio.sleep(2)  # 控制频率
        except Exception as e:
            logger.error(f"价格更新失败 goods_id={p['goods_id']}: {e}")


async def incremental_review_collection():
    """每日增量采集评价"""
    products = await db.fetch("SELECT * FROM products WHERE status = 'active'")
    total_new = 0

    for p in products:
        try:
            new_count = await collect_reviews_incremental(p)
            total_new += new_count
            logger.info(f"商品 {p['goods_name']} 新增 {new_count} 条评价")
            await asyncio.sleep(5)  # 商品间间隔
        except Exception as e:
            logger.error(f"评价采集失败 {p['goods_name']}: {e}")

    logger.info(f"本次增量采集共 {total_new} 条新评价")
```

---

## 七、数据库表

### 7.1 商品外部ID映射

```sql
-- 存储拼多多商品ID与内部商品ID的映射
CREATE TABLE product_external_ids (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    platform        VARCHAR(16) NOT NULL DEFAULT 'pdd',
    external_id     VARCHAR(64) NOT NULL,        -- 拼多多 goods_id
    external_url    VARCHAR(256),                 -- 拼多多商品链接
    pid             VARCHAR(64),                  -- 多多进宝推广位
    is_primary      BOOLEAN DEFAULT TRUE,         -- 主来源
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, platform, external_id)
);
```

### 7.2 采集日志

```sql
CREATE TABLE collection_logs (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER REFERENCES products(id),
    source          VARCHAR(32) NOT NULL,           -- pdd_price / xiaohongshu
    collection_type VARCHAR(16) NOT NULL,           -- full / incremental
    cursor_value    TIMESTAMPTZ,                     -- 时间戳游标
    items_count     INTEGER DEFAULT 0,               -- 本次采集数量
    status          VARCHAR(16) DEFAULT 'running',  -- running/success/failed
    error_message   TEXT,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_collection_logs_product_source ON collection_logs(product_id, source);
```

---

## 八、风控与合规

| 维度 | 措施 |
|------|------|
| **拼多多频率** | 2000次/日额度内，单次请求间隔≥2秒 |
| **小红书频率** | 请求间隔≥2秒，单账号日采集<500篇 |
| **Cookie管理** | 定期更新（2周一次），准备备用账号 |
| **代理** | 小红书采集使用代理池轮换IP |
| **数据用途** | 仅信息聚合展示，不替代原平台 |
| **个人信息** | 用户昵称脱敏处理 |
