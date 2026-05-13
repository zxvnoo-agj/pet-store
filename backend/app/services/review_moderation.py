import json

from langchain_openai import ChatOpenAI
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.review import Review


class ReviewModerationService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.0,
        )

    async def moderate_review(self, review: Review) -> dict:
        prompt = f"""You are a content moderator for a pet supplies e-commerce platform.
Please review the following product review and determine if it should be approved or rejected.

Review Content: {review.content}
Rating: {review.rating}/5

Evaluate based on:
1. Spam or promotional content
2. Offensive or inappropriate language
3. Relevance to pet products
4. Fake or suspicious patterns

Respond in JSON format:
{{
    "decision": "approve" | "reject",
    "confidence": 0.0-1.0,
    "reason": "brief explanation",
    "categories": ["spam", "offensive", "irrelevant", "suspicious"] // if any apply
}}
"""

        try:
            response = await self.llm.ainvoke(prompt)
            result = json.loads(response.content)
            return result
        except Exception as e:
            logger.error(f"LLM moderation failed for review {review.id}: {e}")
            return {
                "decision": "approve",
                "confidence": 0.5,
                "reason": "Moderation service unavailable, defaulting to approve",
                "categories": [],
            }

    async def moderate_pending_reviews(self, db: AsyncSession, batch_size: int = 10):
        result = await db.execute(
            select(Review).where(
                Review.status == "pending",
                Review.llm_review_result.is_(None),
            ).limit(batch_size)
        )
        reviews = result.scalars().all()

        for review in reviews:
            moderation_result = await self.moderate_review(review)
            review.llm_review_result = moderation_result

            if moderation_result.get("decision") == "reject":
                review.status = "rejected"
            else:
                review.status = "approved"

            await db.commit()
            await db.refresh(review)
            logger.info(f"Review {review.id} moderated: {moderation_result['decision']}")

        return len(reviews)
