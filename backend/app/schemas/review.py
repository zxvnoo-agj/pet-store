from datetime import datetime

from pydantic import BaseModel


class ReviewUser(BaseModel):
    nickname: str
    avatar: str | None = None


class ReviewBase(BaseModel):
    rating: float
    content: str
    images: list[str] = []
    tags: list[str] = []
    is_recommended: bool | None = None


class ReviewCreate(ReviewBase):
    pass


class ReviewResponse(ReviewBase):
    id: int
    spu_id: int
    user: ReviewUser | None = None
    helpful_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewSummary(BaseModel):
    average_rating: float = 0.0
    rating_distribution: dict = {}
    top_tags: list[str] = []
    recommend_rate: float = 0.0


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    summary: ReviewSummary


class AdminReviewResponse(ReviewResponse):
    external_note_id: str | None = None
    author: str | None = None
    note_published_at: datetime | None = None
    note_likes: int | None = None
