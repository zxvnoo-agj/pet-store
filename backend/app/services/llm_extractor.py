import json
from typing import Any

from langchain_openai import ChatOpenAI
from loguru import logger

from app.core.config import settings

llm = ChatOpenAI(
    model=settings.DASHSCOPE_MODEL or settings.OPENAI_MODEL,
    api_key=settings.DASHSCOPE_API_KEY or settings.OPENAI_API_KEY,
    base_url=settings.DASHSCOPE_BASE_URL or None,
    temperature=0.1,
)

EXTRACTION_PROMPT = """你是一个宠物食品和用品的结构化信息提取专家。从下面商品标题和描述中提取结构化信息，返回JSON。

商品标题: {title}
商品描述: {description}

请提取以下字段（如果信息不存在，字段设为null）：
- brand: 品牌名称
- spec_weight: 规格重量 (如 "2kg", "400g")
- spec_form: 形态，只能是以下之一: "干粮", "湿粮", "冻干", "风干", "零食", "罐头", "保健品", "用品", "玩具" 或 null
- origin: 产地国家
- shelf_life: 保质期 (如 "18个月")
- age_range: 适用年龄 (如 "幼猫(4-12月)", "全年龄段")
- special_formula: 特殊配方标签，字符串数组 (如 ["无谷", "低敏"])
- top_8_ingredients: 前8种成分，字符串数组（如果描述中有成分表）
- nutrition_highlight: 营养亮点
- ingredients: 完整成分列表，字符串数组（从描述中提取）
- pros: 优点列表，字符串数组 (如 ["高蛋白", "无谷物"])
- cons: 缺点列表，字符串数组 (如 ["价格昂贵"])
- rating_overall: 综合评分（如果描述中有评分信息，1-5的浮点数）

只返回JSON，不要其他文字。"""


async def extract_product_fields(title: str, description: str) -> dict[str, Any]:
    description = (description or "")[:3000]
    prompt = EXTRACTION_PROMPT.format(title=title, description=description)

    try:
        response = await llm.ainvoke(prompt)
        fields = json.loads(response.content)
        logger.debug(f"LLM extraction completed: brand={fields.get('brand')}, form={fields.get('spec_form')}")
        return fields
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"LLM extraction failed or returned invalid JSON: {e}")
        return {}
