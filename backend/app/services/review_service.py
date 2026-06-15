from datetime import datetime

from fastapi import HTTPException
from loguru import logger
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.review import Review
from app.models.spu import Spu
from app.schemas.review import (
    AiReviewSummary,
    MyReviewOut,
    PublicReviewOut,
    ReviewResponse,
    ReviewSource,
    ReviewStatus,
    ReviewSummary,
    UserReviewCreate,
    XHSNoteOut,
    serialize_my_review,
    serialize_public_review,
)
from app.services.sensitive_words import find_sensitive_words


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_reviews(
        self,
        spu_id: int,
        rating: int | None = None,
        sort: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ReviewResponse], int]:
        query = select(Review).where(
            Review.spu_id == spu_id,
            Review.status == ReviewStatus.APPROVED
        )
        count_query = select(func.count(Review.id)).where(
            Review.spu_id == spu_id,
            Review.status == ReviewStatus.APPROVED
        )

        if rating:
            query = query.where(Review.rating == rating)
            count_query = count_query.where(Review.rating == rating)

        # Sorting
        if sort == "most_helpful":
            query = query.order_by(desc(Review.helpful_count))
        elif sort == "highest":
            query = query.order_by(desc(Review.rating))
        elif sort == "lowest":
            query = query.order_by(asc(Review.rating))
        else:
            query = query.order_by(desc(Review.created_at))

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        reviews = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        return [ReviewResponse.model_validate(r) for r in reviews], total

    async def get_review_summary(self, spu_id: int) -> ReviewSummary:
        result = await self.db.execute(
            select(Review).where(
                Review.spu_id == spu_id,
                Review.status == ReviewStatus.APPROVED
            )
        )
        reviews = result.scalars().all()

        if not reviews:
            return ReviewSummary()

        # Rating distribution
        rating_distribution = {}
        for r in reviews:
            rating_key = str(int(r.rating))
            rating_distribution[rating_key] = rating_distribution.get(rating_key, 0) + 1

        # Top tags
        tag_counts = {}
        for r in reviews:
            for tag in r.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        # Recommend rate
        recommend_count = sum(1 for r in reviews if r.is_recommended)
        recommend_rate = recommend_count / len(reviews) if reviews else 0.0

        # Average rating
        avg_rating = sum(float(r.rating) for r in reviews) / len(reviews) if reviews else 0.0

        return ReviewSummary(
            average_rating=round(avg_rating, 1),
            rating_distribution=rating_distribution,
            top_tags=[tag for tag, _ in top_tags],
            recommend_rate=round(recommend_rate, 2),
        )

    async def get_spu_xhs_notes(
        self,
        spu_id: int,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[XHSNoteOut], int, AiReviewSummary | None]:
        query = select(Review).where(
            Review.spu_id == spu_id,
            Review.status == "approved",
            Review.source == ReviewSource.XHS_AUTO,
            Review.external_note_id.isnot(None),
        )
        count_query = select(func.count(Review.id)).where(
            Review.spu_id == spu_id,
            Review.status == "approved",
            Review.source == ReviewSource.XHS_AUTO,
            Review.external_note_id.isnot(None),
        )

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(desc(Review.note_likes), desc(Review.created_at))
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        reviews = result.scalars().all()

        spu_result = await self.db.execute(select(Spu).where(Spu.id == spu_id))
        spu = spu_result.scalar_one_or_none()

        ai_summary = None
        if spu and spu.ai_review_summary:
            s = spu.ai_review_summary
            ai_summary = AiReviewSummary(
                overall_pros=s.get("overall_pros", []),
                overall_cons=s.get("overall_cons", []),
                recommendation=s.get("recommendation", "中性"),
                recommend_rate=float(s.get("recommend_rate", 0.0)),
                summary=s.get("summary", ""),
                generated_at=(
                    datetime.fromisoformat(s["generated_at"]) if s.get("generated_at") else None
                ),
                review_count=s.get("review_count", 0),
            )

        notes = []
        for r in reviews:
            comments = []
            if r.llm_review_result:
                comments = r.llm_review_result.get("comments", [])
            if not comments and r.comments:
                comments = [c if isinstance(c, str) else c.get("content", "") for c in r.comments]

            note = XHSNoteOut(
                id=r.id,
                external_note_id=r.external_note_id,
                content=r.content,
                author=r.author,
                note_likes=r.note_likes,
                note_published_at=r.note_published_at,
                source_url=r.source_url,
                tags=r.tags or [],
                is_recommended=r.is_recommended,
                comments=comments[:10],
            )
            notes.append(note)

        return notes, total, ai_summary

    async def list_spu_reviews(
        self,
        spu_id: int,
        page: int = 1,
        page_size: int = 20,
        current_user_id: int | None = None,
    ) -> tuple[list[PublicReviewOut], int, AiReviewSummary | None, MyReviewOut | None]:
        page_size = min(page_size, 100)
        base_filters = (
            Review.spu_id == spu_id,
            Review.status == ReviewStatus.APPROVED,
        )
        query = (
            select(Review)
            .options(selectinload(Review.user))
            .where(*base_filters)
            .order_by(desc(Review.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        count_query = select(func.count(Review.id)).where(*base_filters)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        result = await self.db.execute(query)
        reviews = [serialize_public_review(r) for r in result.scalars().all()]

        my_review = None
        if current_user_id:
            my_result = await self.db.execute(
                select(Review)
                .options(selectinload(Review.user))
                .where(
                    Review.spu_id == spu_id,
                    Review.user_id == current_user_id,
                    Review.source == ReviewSource.USER,
                    Review.status.in_([ReviewStatus.PENDING, ReviewStatus.REJECTED]),
                )
                .order_by(desc(Review.created_at))
                .limit(1)
            )
            mine = my_result.scalar_one_or_none()
            if mine:
                my_review = serialize_my_review(mine)

        ai_summary = await self._get_spu_ai_summary(spu_id)
        return reviews, total, ai_summary, my_review

    async def _get_spu_ai_summary(self, spu_id: int) -> AiReviewSummary | None:
        spu_result = await self.db.execute(select(Spu).where(Spu.id == spu_id))
        spu = spu_result.scalar_one_or_none()
        if not spu or not spu.ai_review_summary:
            return None
        s = spu.ai_review_summary
        return AiReviewSummary(
            overall_pros=s.get("overall_pros", []),
            overall_cons=s.get("overall_cons", []),
            recommendation=s.get("recommendation", "中性"),
            recommend_rate=float(s.get("recommend_rate", 0.0)),
            summary=s.get("summary", ""),
            generated_at=(
                datetime.fromisoformat(s["generated_at"]) if s.get("generated_at") else None
            ),
            review_count=s.get("review_count", 0),
        )

    async def get_user_review_for_spu(self, spu_id: int, user_id: int) -> Review | None:
        result = await self.db.execute(
            select(Review).where(
                Review.spu_id == spu_id,
                Review.user_id == user_id,
                Review.source == ReviewSource.USER,
            )
        )
        return result.scalar_one_or_none()

    async def create_user_review(
        self,
        spu_id: int,
        user_id: int,
        review_data: UserReviewCreate,
    ) -> MyReviewOut:
        existing = await self.get_user_review_for_spu(spu_id, user_id)
        if existing:
            logger.info("review_duplicate_submission", spu_id=spu_id, user_id=user_id)
            raise HTTPException(status_code=409, detail="你已经评价过该商品")

        hits = find_sensitive_words(review_data.content)
        if hits:
            logger.info("review_sensitive_word_hit", spu_id=spu_id, user_id=user_id, hits=hits)
            raise HTTPException(status_code=400, detail="评价内容包含不适合公开展示的信息")

        review = Review(
            spu_id=spu_id,
            user_id=user_id,
            rating=review_data.rating,
            content=review_data.content,
            images=[],
            tags=[],
            is_recommended=review_data.is_recommended,
            source=ReviewSource.USER,
            status=ReviewStatus.PENDING,
        )
        self.db.add(review)
        await self.db.commit()
        await self.db.refresh(review)
        logger.info("review_submitted", review_id=review.id, spu_id=spu_id, user_id=user_id)
        return serialize_my_review(review)

    async def create_review(self, spu_id: int, user_id: int, review_data: dict) -> Review:
        review = Review(
            spu_id=spu_id,
            user_id=user_id,
            rating=review_data["rating"],
            content=review_data["content"],
            images=review_data.get("images", []),
            tags=review_data.get("tags", []),
            is_recommended=review_data.get("is_recommended"),
            status="pending",
        )
        self.db.add(review)
        await self.db.commit()
        await self.db.refresh(review)
        return review
