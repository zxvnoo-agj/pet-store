#!/usr/bin/env python3
"""
Seed script to populate the database with mock data for testing.

Usage:
    cd backend
    python scripts/seed_mock_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, func, select
from app.core.database import AsyncSessionLocal
from app.models.category import Category
from app.models.product import Product
from app.models.review import Review
from app.models.user import User


# ── Mock Data ──────────────────────────────────────────────────────────

CATEGORIES = [
    # Cat categories (parent_id will be set after insertion)
    {"id": 1, "name": "猫粮", "pet_type": "cat", "parent_id": None, "level": 1, "icon": "🐱", "sort_order": 1},
    {"id": 2, "name": "干粮", "pet_type": "cat", "parent_id": 1, "level": 2, "sort_order": 1},
    {"id": 3, "name": "湿粮", "pet_type": "cat", "parent_id": 1, "level": 2, "sort_order": 2},
    {"id": 4, "name": "猫砂", "pet_type": "cat", "parent_id": None, "level": 1, "icon": "🐱", "sort_order": 2},
    {"id": 5, "name": "豆腐砂", "pet_type": "cat", "parent_id": 4, "level": 2, "sort_order": 1},
    {"id": 6, "name": "膨润土", "pet_type": "cat", "parent_id": 4, "level": 2, "sort_order": 2},
    {"id": 7, "name": "猫玩具", "pet_type": "cat", "parent_id": None, "level": 1, "icon": "🐱", "sort_order": 3},
    {"id": 8, "name": "逗猫棒", "pet_type": "cat", "parent_id": 7, "level": 2, "sort_order": 1},
    {"id": 9, "name": "猫抓板", "pet_type": "cat", "parent_id": 7, "level": 2, "sort_order": 2},

    # Dog categories
    {"id": 10, "name": "狗粮", "pet_type": "dog", "parent_id": None, "level": 1, "icon": "🐶", "sort_order": 1},
    {"id": 11, "name": "幼犬粮", "pet_type": "dog", "parent_id": 10, "level": 2, "sort_order": 1},
    {"id": 12, "name": "成犬粮", "pet_type": "dog", "parent_id": 10, "level": 2, "sort_order": 2},
    {"id": 13, "name": "狗零食", "pet_type": "dog", "parent_id": 10, "level": 2, "sort_order": 3},
    {"id": 14, "name": "狗玩具", "pet_type": "dog", "parent_id": None, "level": 1, "icon": "🐶", "sort_order": 2},
    {"id": 15, "name": "磨牙玩具", "pet_type": "dog", "parent_id": 14, "level": 2, "sort_order": 1},
    {"id": 16, "name": "互动玩具", "pet_type": "dog", "parent_id": 14, "level": 2, "sort_order": 2},
    {"id": 17, "name": "狗用品", "pet_type": "dog", "parent_id": None, "level": 1, "icon": "🐶", "sort_order": 3},
    {"id": 18, "name": "牵引绳", "pet_type": "dog", "parent_id": 17, "level": 2, "sort_order": 1},
    {"id": 19, "name": "狗窝", "pet_type": "dog", "parent_id": 17, "level": 2, "sort_order": 2},
]

PRODUCTS = [
    # Cat dry food (category_id=2)
    {"category_id": 2, "name": "皇家室内成猫粮 2kg", "brand": "皇家", "price_min": 145.00, "price_max": 168.00,
     "pros": ["适口性好", "营养均衡", "颗粒大小适中"], "cons": ["价格偏高", "含有谷物"],
     "ratings": {"overall": 4.5, "taste": 4.6, "nutrition": 4.4, "value": 4.0},
     "description": "专为室内成猫设计，富含L-肉碱帮助维持理想体重，添加益生元促进肠道健康。",
     "ingredients": ["鸡肉粉", "大米", "小麦", "鸡油", "鱼油", "纤维素"],
     "specifications": {"规格": "2kg", "适用年龄": "1-7岁", "产地": "法国"}},
    {"category_id": 2, "name": "渴望六种鱼全猫粮 1.8kg", "brand": "渴望", "price_min": 289.00, "price_max": 320.00,
     "pros": ["高蛋白", "无谷物", "六种深海鱼"], "cons": ["价格昂贵", "部分猫会软便"],
     "ratings": {"overall": 4.7, "taste": 4.5, "nutrition": 4.9, "value": 3.8},
     "description": "85%含肉量，六种野生深海鱼配方，富含Omega-3脂肪酸，美毛护肤。",
     "ingredients": ["沙丁鱼", "鳕鱼", "鲭鱼", "鲱鱼", "比目鱼", "岩鱼"],
     "specifications": {"规格": "1.8kg", "适用年龄": "全阶段", "产地": "加拿大"}},
    {"category_id": 2, "name": "冠能成猫鸡肉配方 2.5kg", "brand": "冠能", "price_min": 98.00, "price_max": 118.00,
     "pros": ["性价比高", "适口性好", "品牌可靠"], "cons": ["蛋白质含量一般", "含有副产品"],
     "ratings": {"overall": 4.2, "taste": 4.3, "nutrition": 4.0, "value": 4.5},
     "description": "优质鸡肉为主要蛋白来源，添加维生素E和C支持免疫系统。",
     "ingredients": ["鸡肉", "玉米蛋白粉", "大米", "小麦", "鸡油"],
     "specifications": {"规格": "2.5kg", "适用年龄": "1岁以上", "产地": "中国"}},

    # Cat wet food (category_id=3)
    {"category_id": 3, "name": "巅峰牛肉罐头 85g", "brand": "巅峰", "price_min": 28.00, "price_max": 35.00,
     "pros": ["高蛋白", "无添加剂", "新西兰进口"], "cons": ["价格昂贵", "分量小"],
     "ratings": {"overall": 4.8, "taste": 4.7, "nutrition": 4.9, "value": 3.5},
     "description": "92%含肉量，新西兰草饲牛肉，单一蛋白来源，适合敏感肠胃猫咪。",
     "ingredients": ["牛肉", "水", "新西兰绿唇贻贝", "干海带"],
     "specifications": {"规格": "85g", "适用年龄": "全阶段", "产地": "新西兰"}},
    {"category_id": 3, "name": "希尔斯处方罐头 k/d 156g", "brand": "希尔斯", "price_min": 32.00, "price_max": 38.00,
     "pros": ["处方配方", "肾脏友好", "兽医推荐"], "cons": ["价格高", "适口性一般"],
     "ratings": {"overall": 4.4, "taste": 3.8, "nutrition": 4.8, "value": 3.8},
     "description": "针对慢性肾病猫咪的特殊营养配方，低磷低蛋白，支持肾脏功能。",
     "ingredients": ["猪肉", "鸡肝", "大米", "鱼油"],
     "specifications": {"规格": "156g", "适用年龄": "成猫", "产地": "美国"}},
    {"category_id": 3, "name": "珍致白金罐头 80g*6", "brand": "珍致", "price_min": 45.00, "price_max": 55.00,
     "pros": ["汤汁丰富", "肉质细腻", "性价比高"], "cons": ["含有胶质", "营养密度一般"],
     "ratings": {"overall": 4.3, "taste": 4.5, "nutrition": 4.0, "value": 4.4},
     "description": "精选优质白肉，搭配鲜美汤汁，补水美味两不误。",
     "ingredients": ["金枪鱼", "鸡肉", "水", "淀粉"],
     "specifications": {"规格": "80g*6罐", "适用年龄": "全阶段", "产地": "泰国"}},

    # Tofu cat litter (category_id=5)
    {"category_id": 5, "name": "N1豆腐猫砂 17.5L", "brand": "N1", "price_min": 89.00, "price_max": 108.00,
     "pros": ["结团快", "可冲厕所", "低粉尘"], "cons": ["除臭一般", "容易粘底"],
     "ratings": {"overall": 4.4, "clumping": 4.6, "odor_control": 3.8, "dust": 4.5},
     "description": "天然豌豆豆腐猫砂，遇水即溶可冲厕所，2秒快速结团，低粉尘配方。",
     "specifications": {"规格": "17.5L", "材质": "豌豆纤维", "香味": "原味"}},
    {"category_id": 5, "name": "pidan混合猫砂 7L", "brand": "pidan", "price_min": 29.90, "price_max": 35.00,
     "pros": ["性价比高", "结团紧实", "除臭好"], "cons": ["有少量粉尘", "香味较浓"],
     "ratings": {"overall": 4.5, "clumping": 4.5, "odor_control": 4.3, "dust": 4.0},
     "description": "70%豆腐砂+30%膨润土黄金配比，兼顾结团与除臭，猫咪脚感舒适。",
     "specifications": {"规格": "7L", "材质": "混合", "香味": "奶香"}},

    # Bentonite cat litter (category_id=6)
    {"category_id": 6, "name": "喵洁客膨润土猫砂 14kg", "brand": "喵洁客", "price_min": 78.00, "price_max": 88.00,
     "pros": ["除臭强", "结团硬", "用量省"], "cons": ["粉尘大", "不可冲厕所", "较重"],
     "ratings": {"overall": 4.3, "clumping": 4.7, "odor_control": 4.6, "dust": 3.0},
     "description": "美国进口天然钠基膨润土，强效除臭，3秒闪电结团，用量更省。",
     "specifications": {"规格": "14kg", "材质": "钠基膨润土", "香味": "无香"}},
    {"category_id": 6, "name": "铁锤绿标猫砂 12.7kg", "brand": "铁锤", "price_min": 128.00, "price_max": 148.00,
     "pros": ["除臭极佳", "几乎无粉尘", "结团超硬"], "cons": ["价格贵", "重量大"],
     "ratings": {"overall": 4.8, "clumping": 4.8, "odor_control": 4.9, "dust": 4.7},
     "description": "专利异味封存技术，7天无异味，低尘配方，呵护猫咪呼吸道。",
     "specifications": {"规格": "12.7kg", "材质": "膨润土", "香味": "清新"}},

    # Cat teaser sticks (category_id=8)
    {"category_id": 8, "name": "pidan逗猫棒套装", "brand": "pidan", "price_min": 39.00, "price_max": 45.00,
     "pros": ["羽毛逼真", "杆身结实", "多种替换头"], "cons": ["羽毛容易掉"],
     "ratings": {"overall": 4.6, "durability": 4.2, "fun": 4.8, "value": 4.5},
     "description": "天然羽毛逗猫棒，模拟小鸟飞行轨迹，激发猫咪捕猎本能。含3个替换头。",
     "specifications": {"规格": "1杆+3头", "材质": "天然羽毛+木杆", "适用": "全阶段"}},
    {"category_id": 8, "name": "贵为电动逗猫棒", "brand": "贵为", "price_min": 68.00, "price_max": 78.00,
     "pros": ["自动摆动", "解放双手", "猫很喜欢"], "cons": ["电池消耗快", "价格偏高"],
     "ratings": {"overall": 4.4, "durability": 4.0, "fun": 4.7, "value": 4.0},
     "description": "智能感应电动逗猫棒，不规则摆动轨迹，自动待机省电设计。",
     "specifications": {"规格": "1个", "材质": "ABS+羽毛", "供电": "3节7号电池"}},

    # Scratching posts (category_id=9)
    {"category_id": 9, "name": "瓦楞纸猫抓板 大号", "brand": "田田猫", "price_min": 19.90, "price_max": 25.00,
     "pros": ["价格便宜", "瓦楞纸厚实", "可躺可抓"], "cons": ["纸屑较多", "不够耐用"],
     "ratings": {"overall": 4.2, "durability": 3.5, "fun": 4.3, "value": 4.8},
     "description": "高密度瓦楞纸，双面可用，加大尺寸适合各体型猫咪，可躺卧休息。",
     "specifications": {"规格": "45x25cm", "材质": "瓦楞纸", "适用": "全阶段"}},
    {"category_id": 9, "name": "剑麻猫爬架小型", "brand": "未卡", "price_min": 199.00, "price_max": 229.00,
     "pros": ["颜值高", "剑麻耐用", "多功能"], "cons": ["价格贵", "占地面积大"],
     "ratings": {"overall": 4.6, "durability": 4.7, "fun": 4.5, "value": 4.0},
     "description": "仙人掌造型猫爬架，天然剑麻柱，耐磨不掉屑，集抓板/跳台/休息区于一体。",
     "specifications": {"规格": "60x40x80cm", "材质": "剑麻+密度板", "适用": "全阶段"}},

    # Dog puppy food (category_id=11)
    {"category_id": 11, "name": "皇家幼犬奶糕 1kg", "brand": "皇家", "price_min": 68.00, "price_max": 78.00,
     "pros": ["易消化", "颗粒小", "适合幼犬"], "cons": ["含有谷物", "蛋白质含量中等"],
     "ratings": {"overall": 4.4, "taste": 4.5, "nutrition": 4.3, "value": 4.2},
     "description": "专为断奶期至2月龄幼犬设计，高易消化蛋白，支持免疫系统发育。",
     "ingredients": ["鸡肉粉", "大米", "小麦", "鸡油", "鱼油"],
     "specifications": {"规格": "1kg", "适用年龄": "断奶-2月", "产地": "法国"}},
    {"category_id": 11, "name": "伯纳天纯幼犬粮 1.5kg", "brand": "伯纳天纯", "price_min": 89.00, "price_max": 99.00,
     "pros": ["无谷配方", "国产优质", "适口性好"], "cons": ["价格中等偏上", "部分狗软便"],
     "ratings": {"overall": 4.5, "taste": 4.6, "nutrition": 4.4, "value": 4.3},
     "description": "无谷低敏配方，添加益生菌和益生元，呵护幼犬娇嫩肠胃。",
     "ingredients": ["鸡肉", "鸭肉", "豌豆", "甘薯", "亚麻籽"],
     "specifications": {"规格": "1.5kg", "适用年龄": "2-12月", "产地": "中国"}},

    # Dog adult food (category_id=12)
    {"category_id": 12, "name": "渴望成犬鸡肉粮 2kg", "brand": "渴望", "price_min": 268.00, "price_max": 298.00,
     "pros": ["高蛋白", "新鲜肉类", "无谷物"], "cons": ["价格昂贵", "部分狗会软便"],
     "ratings": {"overall": 4.7, "taste": 4.6, "nutrition": 4.9, "value": 3.7},
     "description": "85%优质动物成分，自由放养鸡为主料，新鲜输送原料，营养完整均衡。",
     "ingredients": ["鸡肉", "火鸡肉", "鸡蛋", "鲱鱼", "比目鱼"],
     "specifications": {"规格": "2kg", "适用年龄": "1岁以上", "产地": "加拿大"}},
    {"category_id": 12, "name": "比乐原味鲜成犬粮 10kg", "brand": "比乐", "price_min": 258.00, "price_max": 288.00,
     "pros": ["大包装实惠", "适口性好", "肉含量高"], "cons": ["大包装不易保存", "颗粒偏大"],
     "ratings": {"overall": 4.3, "taste": 4.5, "nutrition": 4.2, "value": 4.6},
     "description": "鲜鸡肉+三文鱼配方，添加冻干肉粒，挑嘴狗狗也爱吃。",
     "ingredients": ["鸡肉", "三文鱼", "豌豆", "甘薯", "鸡油"],
     "specifications": {"规格": "10kg", "适用年龄": "1岁以上", "产地": "中国"}},

    # Dog treats (category_id=13)
    {"category_id": 13, "name": "爵宴鸭肉干 454g", "brand": "爵宴", "price_min": 68.00, "price_max": 78.00,
     "pros": ["纯肉制作", "无添加", "狗超爱吃"], "cons": ["价格偏高", "偏硬"],
     "ratings": {"overall": 4.7, "taste": 4.9, "nutrition": 4.5, "value": 4.2},
     "description": "100%纯鸭肉制作，低温烘焙锁住营养，不添加任何防腐剂和诱食剂。",
     "ingredients": ["鸭胸肉"],
     "specifications": {"规格": "454g", "适用年龄": "3月以上", "产地": "中国"}},
    {"category_id": 13, "name": "麦富迪牛肉粒 500g", "brand": "麦富迪", "price_min": 35.00, "price_max": 42.00,
     "pros": ["性价比高", "训练奖励好用", "分量足"], "cons": ["含有添加剂", "肉质一般"],
     "ratings": {"overall": 4.2, "taste": 4.4, "nutrition": 3.8, "value": 4.7},
     "description": "精选牛肉制作，软硬适中，适合训练奖励和日常零食。",
     "ingredients": ["牛肉", "鸡肉", "淀粉", "甘油"],
     "specifications": {"规格": "500g", "适用年龄": "3月以上", "产地": "中国"}},

    # Dog chew toys (category_id=15)
    {"category_id": 15, "name": "KONG经典漏食玩具 M号", "brand": "KONG", "price_min": 58.00, "price_max": 68.00,
     "pros": ["耐咬", "可塞零食", "经典设计"], "cons": ["价格偏贵", "小型犬嫌大"],
     "ratings": {"overall": 4.6, "durability": 4.8, "fun": 4.5, "value": 4.3},
     "description": "天然橡胶材质，耐咬耐玩，可填充零食增加互动乐趣，帮助缓解分离焦虑。",
     "specifications": {"规格": "M号", "材质": "天然橡胶", "适用": "10-20kg犬"}},
    {"category_id": 15, "name": "贵为鹿角磨牙棒", "brand": "贵为", "price_min": 45.00, "price_max": 55.00,
     "pros": ["天然材质", "无碎屑", "耐啃咬"], "cons": ["价格中等", "味道较重"],
     "ratings": {"overall": 4.4, "durability": 4.6, "fun": 4.2, "value": 4.3},
     "description": "天然鹿角切片，富含天然矿物质，无人工添加，安全磨牙不伤牙龈。",
     "specifications": {"规格": "S-M号", "材质": "天然鹿角", "适用": "全阶段"}},

    # Dog interactive toys (category_id=16)
    {"category_id": 16, "name": "贵为自动发球器", "brand": "贵为", "price_min": 128.00, "price_max": 148.00,
     "pros": ["自动发球", "狗狗自嗨", "多档距离"], "cons": ["噪音较大", "球容易丢"],
     "ratings": {"overall": 4.3, "durability": 4.0, "fun": 4.7, "value": 4.1},
     "description": "智能自动发球器，3档发射距离可调，让狗狗自己玩耍，解放主人双手。",
     "specifications": {"规格": "1个", "材质": "ABS", "供电": "电池/插电"}},
    {"category_id": 16, "name": "星记漏食球", "brand": "星记", "price_min": 32.00, "price_max": 38.00,
     "pros": ["难度可调", "狗狗喜欢", "价格合适"], "cons": ["清洁稍麻烦", "开口容易变大"],
     "ratings": {"overall": 4.5, "durability": 4.3, "fun": 4.6, "value": 4.5},
     "description": "可调节漏食口大小，控制零食掉落速度，让狗狗动脑又动嘴。",
     "specifications": {"规格": "M号", "材质": "TPR", "适用": "全阶段"}},

    # Leashes (category_id=18)
    {"category_id": 18, "name": "福莱希伸缩牵引绳 5m", "brand": "福莱希", "price_min": 128.00, "price_max": 158.00,
     "pros": ["顺滑伸缩", "人体工学握把", "耐用"], "cons": ["绳子易缠绕", "价格贵"],
     "ratings": {"overall": 4.6, "durability": 4.5, "comfort": 4.7, "value": 4.0},
     "description": "德国制造，专利制动系统，5米自由伸缩空间，符合人体工学的舒适握把。",
     "specifications": {"规格": "5m", "材质": "尼龙绳+ABS", "适用": "15kg以下"}},
    {"category_id": 18, "name": "P绳训练牵引绳 1.5m", "brand": "华元", "price_min": 19.90, "price_max": 25.00,
     "pros": ["价格便宜", "训练效果好", "轻便"], "cons": ["新手需学习用法", "无缓冲"],
     "ratings": {"overall": 4.3, "durability": 4.0, "comfort": 4.0, "value": 4.8},
     "description": "专业P绳设计，一拉即收，适合随行训练，帮助纠正爆冲行为。",
     "specifications": {"规格": "1.5m", "材质": "尼龙", "适用": "全阶段"}},

    # Dog beds (category_id=19)
    {"category_id": 19, "name": "犬用记忆棉床垫 加大号", "brand": "K&H", "price_min": 198.00, "price_max": 228.00,
     "pros": ["记忆棉舒适", "可拆洗", "防滑底"], "cons": ["体积大", "价格高"],
     "ratings": {"overall": 4.5, "durability": 4.4, "comfort": 4.8, "value": 4.2},
     "description": "高密度记忆棉内芯，均匀分散压力，可拆洗外套，防水防滑底面。",
     "specifications": {"规格": "90x70cm", "材质": "记忆棉+牛津布", "适用": "大型犬"}},
    {"category_id": 19, "name": "四季通用狗窝 中号", "brand": "嬉皮狗", "price_min": 49.00, "price_max": 59.00,
     "pros": ["四季可用", "可拆洗", "性价比高"], "cons": ["填充物一般", "支撑性弱"],
     "ratings": {"overall": 4.2, "durability": 3.8, "comfort": 4.3, "value": 4.6},
     "description": "双面设计，夏季凉感面/冬季暖绒面，可拆洗方便清洁，加厚围边护颈。",
     "specifications": {"规格": "65x50cm", "材质": "PP棉+水晶绒", "适用": "中型犬"}},
]

# Reviews for each product (indexed by product index in PRODUCTS list)
REVIEWS = {
    # 皇家室内成猫粮
    0: [
        {"rating": 5.0, "content": "我家猫吃了三年了，一直很好，毛色亮泽，体重也控制得很好。",
         "tags": ["适口性好", "营养均衡", "长期回购"], "is_recommended": True, "helpful_count": 12},
        {"rating": 4.0, "content": "猫粮不错，就是价格有点贵，希望能多搞活动。",
         "tags": ["价格偏高"], "is_recommended": True, "helpful_count": 3},
        {"rating": 3.0, "content": "猫吃了有点软便，可能是谷物不耐受，换粮后好了。",
         "tags": ["含有谷物", "软便"], "is_recommended": False, "helpful_count": 8},
    ],
    # 渴望六种鱼
    1: [
        {"rating": 5.0, "content": "贵是贵了点，但真的值得！猫咪毛发明显变亮了，掉毛也少了很多。",
         "tags": ["高蛋白", "美毛", "品质好"], "is_recommended": True, "helpful_count": 25},
        {"rating": 4.0, "content": "成分很好，但我家猫不太爱吃鱼味的，喜欢鸡肉的。",
         "tags": ["适口性一般"], "is_recommended": True, "helpful_count": 5},
        {"rating": 5.0, "content": "一直喂渴望，猫咪身体很健康，体检各项指标都正常。",
         "tags": ["营养均衡", "长期回购"], "is_recommended": True, "helpful_count": 18},
    ],
    # 冠能成猫
    2: [
        {"rating": 4.0, "content": "性价比很高，多猫家庭喂这个很合适，不心疼。",
         "tags": ["性价比高", "多猫家庭"], "is_recommended": True, "helpful_count": 15},
        {"rating": 3.0, "content": "蛋白质低了点，长期吃可能营养不够，偶尔换换口味还行。",
         "tags": ["蛋白质一般"], "is_recommended": False, "helpful_count": 6},
    ],
    # 巅峰牛肉罐头
    3: [
        {"rating": 5.0, "content": "巅峰不愧是巅峰，一打开就闻到浓郁的肉香，猫疯狂跑过来吃。",
         "tags": ["高品质", "适口性极佳"], "is_recommended": True, "helpful_count": 30},
        {"rating": 4.0, "content": "除了贵没缺点，偶尔当奖励喂一罐，猫咪开心我也开心。",
         "tags": ["价格昂贵"], "is_recommended": True, "helpful_count": 10},
    ],
    # 希尔斯处方罐
    4: [
        {"rating": 4.0, "content": "兽医推荐的，猫咪肾病早期，吃了三个月指标稳定了。",
         "tags": ["兽医推荐", "有效"], "is_recommended": True, "helpful_count": 22},
        {"rating": 3.0, "content": "猫不太爱吃，得拌着别的才肯吃，但为了健康没办法。",
         "tags": ["适口性一般"], "is_recommended": True, "helpful_count": 7},
    ],
    # 珍致白金罐头
    5: [
        {"rating": 4.0, "content": "汤汁很多，适合不爱喝水的猫，我家猫每次把汤舔得干干净净。",
         "tags": ["补水", "适口性好"], "is_recommended": True, "helpful_count": 14},
        {"rating": 4.0, "content": "肉质细腻，但感觉营养密度不如巅峰，当零食罐头喂还行。",
         "tags": ["性价比高"], "is_recommended": True, "helpful_count": 5},
    ],
    # N1豆腐砂
    6: [
        {"rating": 5.0, "content": "用了两年没换过，结团快不散团，最重要的是能冲厕所！",
         "tags": ["可冲厕所", "结团好"], "is_recommended": True, "helpful_count": 20},
        {"rating": 3.0, "content": "除臭确实一般，夏天有点味，需要配合除臭剂用。",
         "tags": ["除臭一般"], "is_recommended": True, "helpful_count": 8},
    ],
    # pidan混合砂
    7: [
        {"rating": 5.0, "content": "pidan这款真的不错，结团紧除臭也好，价格还实惠，无限回购。",
         "tags": ["性价比高", "除臭好", "结团紧实"], "is_recommended": True, "helpful_count": 35},
        {"rating": 4.0, "content": "奶香味有点浓，不过除臭效果好，猫也不排斥。",
         "tags": ["香味较浓"], "is_recommended": True, "helpful_count": 6},
    ],
    # 喵洁客膨润土
    8: [
        {"rating": 4.0, "content": "除臭效果确实好，结团很硬，就是粉尘太大了，每次倒砂都呛人。",
         "tags": ["除臭强", "粉尘大"], "is_recommended": True, "helpful_count": 11},
        {"rating": 3.0, "content": "太重了，一个人搬不动，而且不能冲厕所有点麻烦。",
         "tags": ["较重", "不可冲厕"], "is_recommended": False, "helpful_count": 4},
    ],
    # 铁锤绿标
    9: [
        {"rating": 5.0, "content": "用过最好的膨润土，几乎没有粉尘，除臭真的强，一周都不臭。",
         "tags": ["无粉尘", "除臭极佳"], "is_recommended": True, "helpful_count": 28},
        {"rating": 4.0, "content": "除了贵和重，没别的毛病，预算够直接上铁锤。",
         "tags": ["价格高"], "is_recommended": True, "helpful_count": 9},
    ],
    # pidan逗猫棒
    10: [
        {"rating": 5.0, "content": "我家猫超爱这个逗猫棒，一拿出来就疯了一样，羽毛很逼真。",
         "tags": ["猫超爱", "羽毛逼真"], "is_recommended": True, "helpful_count": 16},
        {"rating": 4.0, "content": "羽毛确实容易掉，不过替换头多，能用一段时间。",
         "tags": ["羽毛易掉"], "is_recommended": True, "helpful_count": 4},
    ],
    # 贵为电动逗猫棒
    11: [
        {"rating": 4.0, "content": "解放双手神器！猫咪自己一个人也能玩很久，就是电池用得太快了。",
         "tags": ["解放双手", "猫喜欢"], "is_recommended": True, "helpful_count": 12},
        {"rating": 3.0, "content": "摆动幅度有点小，大猫不太感兴趣，小猫更喜欢。",
         "tags": ["幅度小"], "is_recommended": False, "helpful_count": 3},
    ],
    # 瓦楞纸抓板
    12: [
        {"rating": 4.0, "content": "便宜好用，猫很喜欢抓，还能当床睡，就是纸屑多了点。",
         "tags": ["便宜", "猫喜欢"], "is_recommended": True, "helpful_count": 9},
        {"rating": 3.0, "content": "用了一个月就抓烂了，得经常换，不过价格不贵无所谓。",
         "tags": ["不耐用"], "is_recommended": True, "helpful_count": 2},
    ],
    # 剑麻爬架
    13: [
        {"rating": 5.0, "content": "颜值太高了！摆在家里像装饰品，猫也很喜欢在上面睡觉。",
         "tags": ["颜值高", "猫喜欢"], "is_recommended": True, "helpful_count": 19},
        {"rating": 4.0, "content": "质量不错，但占地面积确实有点大，小户型的要考虑一下。",
         "tags": ["占地面积大"], "is_recommended": True, "helpful_count": 6},
    ],
    # 皇家幼犬奶糕
    14: [
        {"rating": 4.0, "content": "小狗断奶后一直吃这个，消化很好，便便很健康。",
         "tags": ["易消化", "适合幼犬"], "is_recommended": True, "helpful_count": 10},
        {"rating": 3.0, "content": "含有谷物，我家狗有点过敏，后来换了无谷粮就好了。",
         "tags": ["含有谷物"], "is_recommended": False, "helpful_count": 4},
    ],
    # 伯纳天纯幼犬
    15: [
        {"rating": 5.0, "content": "国产粮里算很好的了，无谷配方，小狗长得壮壮的。",
         "tags": ["无谷配方", "国产优质"], "is_recommended": True, "helpful_count": 14},
        {"rating": 4.0, "content": "适口性不错，就是价格再优惠点就更好了。",
         "tags": ["适口性好"], "is_recommended": True, "helpful_count": 3},
    ],
    # 渴望成犬鸡肉
    16: [
        {"rating": 5.0, "content": "狗粮天花板，成分表看得我都想吃，狗狗毛色亮了很多。",
         "tags": ["高品质", "美毛"], "is_recommended": True, "helpful_count": 21},
        {"rating": 4.0, "content": "价格确实贵，但狗狗爱吃，身体也健康，值得投资。",
         "tags": ["价格昂贵"], "is_recommended": True, "helpful_count": 7},
    ],
    # 比乐原味鲜
    17: [
        {"rating": 4.0, "content": "大包装很实惠，里面还有冻干粒，狗狗吃得特别香。",
         "tags": ["大包装实惠", "适口性好"], "is_recommended": True, "helpful_count": 13},
        {"rating": 3.0, "content": "颗粒太大了，我家小型犬咬不动，得掰碎了喂。",
         "tags": ["颗粒偏大"], "is_recommended": False, "helpful_count": 5},
    ],
    # 爵宴鸭肉干
    18: [
        {"rating": 5.0, "content": "纯肉干，打开就能闻到肉香，狗狗爱得不行，训练奖励必备。",
         "tags": ["纯肉", "狗超爱"], "is_recommended": True, "helpful_count": 26},
        {"rating": 4.0, "content": "就是有点硬，小型犬吃起来费劲，不过确实耐嚼。",
         "tags": ["偏硬"], "is_recommended": True, "helpful_count": 7},
    ],
    # 麦富迪牛肉粒
    19: [
        {"rating": 4.0, "content": "分量很足，500g能喂很久，训练的时候用很方便。",
         "tags": ["分量足", "训练好用"], "is_recommended": True, "helpful_count": 11},
        {"rating": 3.0, "content": "看配料表有淀粉和甘油，不是纯肉，不过价格摆在这里。",
         "tags": ["含有添加剂"], "is_recommended": False, "helpful_count": 6},
    ],
    # KONG漏食玩具
    20: [
        {"rating": 5.0, "content": "耐咬之王！我家金毛咬了半年了还完好无损，塞点花生酱能安静半小时。",
         "tags": ["耐咬", "可塞零食"], "is_recommended": True, "helpful_count": 23},
        {"rating": 4.0, "content": "买大了，我家柯基嘴小塞不进去，建议按体重选。",
         "tags": ["尺寸偏大"], "is_recommended": True, "helpful_count": 5},
    ],
    # 贵为鹿角磨牙棒
    21: [
        {"rating": 4.0, "content": "天然鹿角，狗狗啃了一个月还没啃完，很耐咬。",
         "tags": ["天然材质", "耐啃咬"], "is_recommended": True, "helpful_count": 8},
        {"rating": 3.0, "content": "味道确实有点大，放在家里有点腥，不过狗狗喜欢。",
         "tags": ["味道重"], "is_recommended": True, "helpful_count": 3},
    ],
    # 贵为自动发球器
    22: [
        {"rating": 4.0, "content": "狗狗可以自己玩，就是噪音有点大，晚上不敢开。",
         "tags": ["自动发球", "狗狗自嗨"], "is_recommended": True, "helpful_count": 10},
        {"rating": 3.0, "content": "球总是滚到沙发底下，狗狗够不到就嗷嗷叫，挺麻烦的。",
         "tags": ["球易丢"], "is_recommended": False, "helpful_count": 6},
    ],
    # 星记漏食球
    23: [
        {"rating": 5.0, "content": "这个漏食球太好了！狗狗边玩边吃，一顿饭能吃半小时，防止吃太快。",
         "tags": ["难度可调", "狗狗喜欢"], "is_recommended": True, "helpful_count": 17},
        {"rating": 4.0, "content": "清洗稍微麻烦点，不过瑕不掩瑜，狗狗玩得开心最重要。",
         "tags": ["清洁稍麻烦"], "is_recommended": True, "helpful_count": 4},
    ],
    # 福莱希伸缩牵引
    24: [
        {"rating": 5.0, "content": "用过最顺滑的伸缩牵引，5米长度刚刚好，狗狗活动空间大。",
         "tags": ["顺滑", "活动空间大"], "is_recommended": True, "helpful_count": 15},
        {"rating": 3.0, "content": "绳子容易缠到腿上，特别是人多的时候，有点危险。",
         "tags": ["易缠绕"], "is_recommended": False, "helpful_count": 7},
    ],
    # P绳训练牵引
    25: [
        {"rating": 4.0, "content": "训练随行非常好用，一拉就听话了，价格便宜推荐新手。",
         "tags": ["训练效果好", "便宜"], "is_recommended": True, "helpful_count": 12},
        {"rating": 3.0, "content": "确实需要学习怎么用，刚开始不会用把狗勒得直咳嗽。",
         "tags": ["需学习用法"], "is_recommended": True, "helpful_count": 4},
    ],
    # 记忆棉床垫
    26: [
        {"rating": 5.0, "content": "我家金毛13岁了，关节不好，换了记忆棉床垫后明显睡得更安稳了。",
         "tags": ["舒适", "适合老年犬"], "is_recommended": True, "helpful_count": 18},
        {"rating": 4.0, "content": "垫子很大，但确实占地方，不过狗狗舒服最重要。",
         "tags": ["体积大"], "is_recommended": True, "helpful_count": 5},
    ],
    # 四季通用狗窝
    27: [
        {"rating": 4.0, "content": "性价比很高，双面设计很实用，冬天用暖面夏天用凉面。",
         "tags": ["四季可用", "性价比高"], "is_recommended": True, "helpful_count": 9},
        {"rating": 3.0, "content": "用久了填充物会塌陷，支撑性不太好，需要经常拍打。",
         "tags": ["支撑性弱"], "is_recommended": False, "helpful_count": 3},
    ],
}


async def seed_categories(session):
    """Insert categories and return id mapping."""
    print("📝 Seeding categories...")
    # Clear existing data first (respect FK order)
    await session.execute(delete(Review))
    await session.execute(delete(Product))
    await session.execute(delete(Category))
    await session.commit()

    id_map = {}
    for cat_data in CATEGORIES:
        # Handle parent_id mapping: if parent_id refers to an ID in CATEGORIES, map it
        mapped_parent = None
        if cat_data["parent_id"] is not None:
            mapped_parent = id_map.get(cat_data["parent_id"])

        cat = Category(
            name=cat_data["name"],
            pet_type=cat_data["pet_type"],
            parent_id=mapped_parent,
            level=cat_data["level"],
            icon=cat_data.get("icon"),
            sort_order=cat_data["sort_order"],
        )
        session.add(cat)
        await session.flush()  # get generated id
        id_map[cat_data["id"]] = cat.id
        print(f"   ✅ Category: {cat.name} (id={cat.id}, pet_type={cat.pet_type})")

    await session.commit()
    print(f"   📊 Total categories: {len(CATEGORIES)}\n")
    return id_map


async def seed_products(session, category_id_map):
    """Insert products and return list of created product ids."""
    print("📝 Seeding products...")
    product_ids = []

    for idx, prod_data in enumerate(PRODUCTS):
        mapped_cat_id = category_id_map[prod_data["category_id"]]
        # Generate placeholder image URLs using picsum.photos
        image_id = 100 + idx
        image_urls = [
            f"https://picsum.photos/id/{image_id}/400/400",
            f"https://picsum.photos/id/{image_id + 1}/400/400",
        ]
        product = Product(
            category_id=mapped_cat_id,
            name=prod_data["name"],
            brand=prod_data.get("brand"),
            price_min=prod_data.get("price_min"),
            price_max=prod_data.get("price_max"),
            image_urls=image_urls,
            pros=prod_data.get("pros", []),
            cons=prod_data.get("cons", []),
            ratings=prod_data.get("ratings", {}),
            description=prod_data.get("description"),
            ingredients=prod_data.get("ingredients", []),
            specifications=prod_data.get("specifications", {}),
            status="active",
        )
        session.add(product)
        await session.flush()
        product_ids.append(product.id)
        print(f"   ✅ Product: {product.name} (id={product.id})")

    await session.commit()
    print(f"   📊 Total products: {len(product_ids)}\n")
    return product_ids


async def seed_reviews(session, product_ids):
    """Insert reviews for products."""
    print("📝 Seeding reviews...")
    total_reviews = 0

    for product_idx, reviews_data in REVIEWS.items():
        if product_idx >= len(product_ids):
            continue
        product_id = product_ids[product_idx]
        for review_data in reviews_data:
            review = Review(
                product_id=product_id,
                user_id=None,  # anonymous / crawled reviews
                rating=review_data["rating"],
                content=review_data["content"],
                tags=review_data.get("tags", []),
                is_recommended=review_data.get("is_recommended"),
                source="crawled",
                helpful_count=review_data.get("helpful_count", 0),
                status="approved",
            )
            session.add(review)
            total_reviews += 1

    await session.commit()
    print(f"   📊 Total reviews: {total_reviews}\n")


async def seed_mock_user(session):
    """Insert a mock user for H5 dev testing."""
    print("📝 Seeding mock user...")
    result = await session.execute(select(User).where(User.id == 1))
    existing = result.scalar_one_or_none()
    if existing:
        print("   ℹ️  Mock user already exists (id=1)")
        return

    user = User(
        id=1,
        openid="mock_h5_user",
        nickname="H5调试用户",
        avatar_url="",
    )
    session.add(user)
    await session.commit()
    print("   ✅ Mock user created (id=1)")


async def main():
    print("=" * 60)
    print("🌱 Pet Shop Mock Data Seeder")
    print("=" * 60)
    print()

    async with AsyncSessionLocal() as session:
        try:
            await seed_mock_user(session)
            category_id_map = await seed_categories(session)
            product_ids = await seed_products(session, category_id_map)
            await seed_reviews(session, product_ids)

            # Summary
            cat_count = await session.scalar(select(func.count()).select_from(Category))
            prod_count = await session.scalar(select(func.count()).select_from(Product))
            review_count = await session.scalar(select(func.count()).select_from(Review))

            print("=" * 60)
            print("🎉 Seeding completed successfully!")
            print(f"   📦 Categories: {cat_count}")
            print(f"   🐾 Products:   {prod_count}")
            print(f"   💬 Reviews:    {review_count}")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
