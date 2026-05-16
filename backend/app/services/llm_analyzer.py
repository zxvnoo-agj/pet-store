import json
from typing import Any

from langchain_openai import ChatOpenAI
from loguru import logger

from app.core.config import settings

llm = ChatOpenAI(
    model=settings.DASHSCOPE_MODEL or settings.OPENAI_MODEL,
    api_key=settings.DASHSCOPE_API_KEY or settings.OPENAI_API_KEY,
    base_url=settings.DASHSCOPE_BASE_URL or None,
    temperature=0.3,
)

ANALYSIS_PROMPT = """你是一个宠物用品评价分析专家。分析以下小红书笔记内容，提取结构化分析结果。

笔记标题: {title}
笔记正文: {content}
评论: {comments}

请返回JSON格式分析结果：
- pros: 优点标签数组，每条4-8字 (如 ["颗粒大小适中", "适口性好", "性价比高"])
- cons: 缺点标签数组 (如 ["包装易漏气"])
- recommendation: "推荐"或"不推荐"或"中性"
- confidence: 置信度 0.0-1.0
- summary: 一句话总结（20字以内）
- cat_mood: 猫咪反应（如"很爱吃"、"一般"、"不喜欢"）

只返回JSON，不要其他文字。"""


async def analyze_review(title: str, content: str, comments: list[str]) -> dict[str, Any]:
    content = (content or "")[:2000]
    comments_text = "\n".join((comments or [])[:10])

    prompt = ANALYSIS_PROMPT.format(title=title, content=content, comments=comments_text)

    try:
        response = await llm.ainvoke(prompt)
        result = json.loads(response.content)
        logger.debug(f"LLM analysis completed: recommendation={result.get('recommendation')}, confidence={result.get('confidence')}")
        return result
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"LLM analysis failed: {e}")
        return {
            "pros": [],
            "cons": [],
            "recommendation": "中性",
            "confidence": 0.0,
            "summary": "",
            "cat_mood": "",
        }
