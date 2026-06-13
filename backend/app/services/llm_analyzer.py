import json
from typing import Any

from langchain_openai import ChatOpenAI
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

llm = ChatOpenAI(
    model=settings.DEEPSEEK_MODEL or settings.OPENAI_MODEL,
    api_key=settings.DEEPSEEK_API_KEY or settings.OPENAI_API_KEY,
    base_url=settings.DEEPSEEK_BASE_URL if settings.DEEPSEEK_API_KEY else None,
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

SUMMARY_PROMPT = """你是宠物用品评价分析专家。以下是对同一商品的多条小红书笔记分析结果：

{notes_summary}

请综合分析所有评价，返回JSON：
- overall_pros: 整体优点标签数组 (每项4-8字)
- overall_cons: 整体缺点标签数组 (每项4-8字)
- recommendation: "推荐"或"不推荐"或"中性"
- recommend_rate: 推荐占比 0.0-1.0
- summary: 一句话总结（50字以内）

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


async def generate_spu_summary(spu_id: int, db: AsyncSession) -> dict[str, Any] | None:
    from datetime import UTC, datetime

    from app.models.review import Review

    result = await db.execute(
        select(Review).where(
            Review.spu_id == spu_id,
            Review.status == "approved",
            Review.llm_review_result.isnot(None),
        )
    )
    reviews = result.scalars().all()

    if len(reviews) < 3:
        logger.info(f"SPU {spu_id}: insufficient reviews ({len(reviews)}), skipping summary generation")
        return None

    notes_summary_lines = []
    for r in reviews:
        analysis = r.llm_review_result or {}
        pros = ", ".join(analysis.get("pros", []) or [])
        cons = ", ".join(analysis.get("cons", []) or [])
        rec = analysis.get("recommendation", "中性")
        summary = analysis.get("summary", "")
        line = f"- 笔记: {r.content[:100]}..."
        if pros:
            line += f"\n  优点: {pros}"
        if cons:
            line += f"\n  缺点: {cons}"
        line += f"\n  推荐态度: {rec}"
        if summary:
            line += f"\n  总结: {summary}"
        notes_summary_lines.append(line)

    notes_text = "\n\n".join(notes_summary_lines)

    try:
        prompt = SUMMARY_PROMPT.format(notes_summary=notes_text)
        response = await llm.ainvoke(prompt)
        result = json.loads(response.content)

        summary = {
            "overall_pros": result.get("overall_pros", []),
            "overall_cons": result.get("overall_cons", []),
            "recommendation": result.get("recommendation", "中性"),
            "recommend_rate": float(result.get("recommend_rate", 0.0)),
            "summary": result.get("summary", ""),
            "generated_at": datetime.now(UTC).isoformat(),
            "review_count": len(reviews),
        }
        logger.info(f"SPU {spu_id}: summary generated ({len(reviews)} reviews)")
        return summary
    except (json.JSONDecodeError, Exception) as e:
        logger.error(f"SPU {spu_id}: LLM summary generation failed: {e}")
        return None
