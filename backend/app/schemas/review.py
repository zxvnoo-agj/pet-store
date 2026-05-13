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
    user: ReviewUser | None = None
    helpful_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewSummary(BaseModel):
    rating_distribution: dict = {}
    top_tags: list[str] = []
    recommend_rate: float = 0.0


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    summary: ReviewSummary
