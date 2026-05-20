import json
from typing import Any

from langchain_openai import ChatOpenAI
from loguru import logger
from openai import AsyncOpenAI

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

CRAWLED_EXTRACTION_PROMPT = """你是一个宠物食品和用品的结构化信息提取专家。从下面爬取的网页内容中提取结构化信息，返回JSON。

网页文本内容:
{raw_text}

请提取以下字段（如果信息不存在，字段设为null）：
- brand: 品牌名称
- spec_weight: 规格重量 (如"2kg", "400g")
- spec_form: 形态，只能是以下之一: "干粮","湿粮","冻干","风干","零食","罐头","保健品","用品","玩具" 或 null
- origin: 产地国家
- shelf_life: 保质期 (如"18个月")
- age_range: 适用年龄 (如"幼猫(4-12月)", "全年龄段")
- special_formula: 特殊配方标签，字符串数组 (如["无谷","低敏"])
- top_8_ingredients: 前8种成分，字符串数组
- nutrition_highlight: 营养亮点

只返回JSON，不要其他文字。"""

_CRAWLED_EXPECTED_FIELDS = [
    "brand",
    "spec_weight",
    "spec_form",
    "origin",
    "shelf_life",
    "age_range",
    "special_formula",
    "top_8_ingredients",
    "nutrition_highlight",
]


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


def _calc_field_completion(fields: dict[str, Any]) -> float:
    filled = sum(1 for f in _CRAWLED_EXPECTED_FIELDS if fields.get(f) is not None)
    return filled / len(_CRAWLED_EXPECTED_FIELDS) if _CRAWLED_EXPECTED_FIELDS else 0.0


def _safe_parse_json(content: str) -> dict[str, Any]:
    content = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning(f"JSON parse failed: {content[:200]}")
        return {}


async def _vision_extract_fields(image_urls: list[str]) -> dict[str, Any]:
    """Use vision model to extract fields from product images."""
    if not image_urls:
        return {}

    try:
        client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL,
        )
        vision_prompt = (
            "你是一个宠物食品和用品识别专家。查看这些商品图片，提取结构化信息，返回JSON。\n\n"
            "请提取以下字段（如果信息不存在，字段设为null）：\n"
            "- brand: 品牌名称\n"
            "- spec_weight: 规格重量 (如\"2kg\", \"400g\")\n"
            "- spec_form: 形态，只能是以下之一: \"干粮\",\"湿粮\",\"冻干\",\"风干\",\"零食\",\"罐头\",\"保健品\",\"用品\",\"玩具\" 或 null\n"
            "- origin: 产地国家\n"
            "- shelf_life: 保质期 (如\"18个月\")\n"
            "- age_range: 适用年龄 (如\"幼猫(4-12月)\", \"全年龄段\")\n"
            "- special_formula: 特殊配方标签，字符串数组 (如[\"无谷\",\"低敏\"])\n"
            "- top_8_ingredients: 前8种成分，字符串数组\n"
            "- nutrition_highlight: 营养亮点\n\n"
            "只返回JSON，不要其他文字。"
        )
        messages = [
            {"role": "system", "content": vision_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": url}}
                    for url in image_urls
                ],
            },
        ]
        response = await client.chat.completions.create(
            model="qwen-vl-plus",
            messages=messages,
            temperature=0.1,
            max_tokens=1000,
        )
        content = response.choices[0].message.content or ""
        fields = _safe_parse_json(content)
        logger.info(f"[vision-extract] Extracted fields: {list(fields.keys())}")
        return fields
    except Exception as e:
        logger.warning(f"Vision extraction failed: {e}")
        return {}


async def extract_from_crawled_content(
    raw_text: str,
    images: list[str] | None = None,
) -> dict[str, Any]:
    """Extract structured fields from crawled product content.

    Steps:
        1. Text extraction via LLM (raw_text up to 5000 chars).
        2. Calculate field completion rate.
        3. If completion < 50% and images available, call vision model for supplement.
        4. Merge results (text takes precedence for factual fields).
    """
    text = (raw_text or "")[:5000]
    prompt = CRAWLED_EXTRACTION_PROMPT.format(raw_text=text)

    try:
        response = await llm.ainvoke(prompt)
        fields = _safe_parse_json(response.content)
    except Exception as e:
        logger.warning(f"LLM crawled extraction failed: {e}")
        fields = {}

    completion_rate = _calc_field_completion(fields)
    logger.debug(
        f"Crawled LLM extraction: completion={completion_rate:.2f}, "
        f"fields={ {k: v is not None for k, v in fields.items()} }"
    )

    if completion_rate < 0.5 and images:
        vision_fields = await _vision_extract_fields(images[:3])
        for key in _CRAWLED_EXPECTED_FIELDS:
            if fields.get(key) is None and vision_fields.get(key) is not None:
                fields[key] = vision_fields[key]
        logger.debug(f"After vision merge: completion={_calc_field_completion(fields):.2f}")

    return fields
