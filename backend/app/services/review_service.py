from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review
from app.schemas.review import ReviewResponse, ReviewSummary


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
            Review.status == "approved"
        )
        count_query = select(func.count(Review.id)).where(
            Review.spu_id == spu_id,
            Review.status == "approved"
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
                Review.status == "approved"
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
