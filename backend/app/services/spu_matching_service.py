import json
from dataclasses import dataclass
from typing import Any

from loguru import logger

from app.core.config import settings
from app.models.spu import Spu


@dataclass
class MatchingResult:
    """Result of matching a listing to an SPU."""

    spu_id: int
    confidence: float
    reason: str


class SpuMatchingService:
    """LLM-based semantic matching service for linking listings to SPUs."""

    def __init__(self):
        self.llm = None

    def _get_llm(self):
        """Lazy init LLM client."""
        if self.llm is None:
            from langchain_openai import ChatOpenAI

            self.llm = ChatOpenAI(
                model=settings.DASHSCOPE_MODEL or settings.OPENAI_MODEL,
                api_key=settings.DASHSCOPE_API_KEY or settings.OPENAI_API_KEY,
                base_url=settings.DASHSCOPE_BASE_URL or None,
                temperature=0.1,
            )
        return self.llm

    async def match_listing_to_spu(
        self,
        listing_title: str,
        spus: list[Spu],
    ) -> MatchingResult:
        """Match a listing title to the best SPU using LLM.

        Returns the best matching SPU with confidence score.
        Confidence tiers:
            - >= 0.85: Auto-link (high confidence)
            - 0.60-0.84: Candidate (medium confidence, needs review)
            - < 0.60: Unmatched (low confidence)
        """
        if not spus:
            return MatchingResult(spu_id=0, confidence=0.0, reason="No SPUs available")

        # Build prompt with listing and candidate SPUs
        spu_descriptions = []
        for spu in spus:
            spu_descriptions.append(
                f"SPU {spu.id}: {spu.brand} {spu.name} {spu.model} "
                f"(Category: {spu.category.name if spu.category else 'N/A'}, "
                f"Pet: {spu.pet_type})"
            )

        prompt = self._build_matching_prompt(listing_title, spu_descriptions)

        try:
            llm = self._get_llm()
            response = await llm.ainvoke(prompt)
            result = self._parse_matching_response(response.content)

            # Validate that the suggested SPU exists
            matched_spu = next((s for s in spus if s.id == result.spu_id), None)
            if not matched_spu:
                return MatchingResult(
                    spu_id=0,
                    confidence=result.confidence * 0.5,
                    reason=f"Suggested SPU {result.spu_id} not found in candidates",
                )

            return result

        except Exception as e:
            logger.warning(f"LLM matching failed: {e}")
            return MatchingResult(spu_id=0, confidence=0.0, reason=f"Matching error: {e}")

    def _build_matching_prompt(self, listing_title: str, spu_descriptions: list[str]) -> str:
        """Build the LLM prompt for matching."""
        spus_text = "\n".join(spu_descriptions)

        return f"""你是一个电商商品匹配专家。请将下面的商品标题与候选 SPU（标准商品单元）进行匹配。

商品标题: {listing_title}

候选 SPU:
{spus_text}

请分析商品标题与每个 SPU 的匹配程度，返回 JSON 格式:
{{
    "spu_id": 最佳匹配的 SPU ID (整数),
    "confidence": 置信度分数 (0.0-1.0),
    "reason": "匹配理由"
}}

置信度评分标准:
- 0.85-1.0: 标题明确对应某个 SPU（品牌、型号、规格完全匹配）
- 0.60-0.84: 标题可能对应某个 SPU（品牌匹配但规格不确定）
- 0.0-0.59: 无法确定对应关系（品牌未知或信息不足）

只返回 JSON，不要其他文字。"""

    def _parse_matching_response(self, content: str) -> MatchingResult:
        """Parse LLM response into MatchingResult."""
        content = (
            content.strip()
            .removeprefix("```json")
            .removeprefix("```")
            .removesuffix("```")
            .strip()
        )

        try:
            data = json.loads(content)
            return MatchingResult(
                spu_id=int(data.get("spu_id", 0)),
                confidence=float(data.get("confidence", 0)),
                reason=data.get("reason", ""),
            )
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse matching response: {e}")
            return MatchingResult(spu_id=0, confidence=0.0, reason="Parse error")
