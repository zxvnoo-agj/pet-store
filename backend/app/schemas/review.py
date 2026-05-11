from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ReviewUser(BaseModel):
    nickname: str
    avatar: Optional[str] = None


class ReviewBase(BaseModel):
    rating: float
    content: str
    images: List[str] = []
    tags: List[str] = []
    is_recommended: Optional[bool] = None


class ReviewCreate(ReviewBase):
    pass


class ReviewResponse(ReviewBase):
    id: int
    user: Optional[ReviewUser] = None
    helpful_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewSummary(BaseModel):
    rating_distribution: dict = {}
    top_tags: List[str] = []
    recommend_rate: float = 0.0


class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]
    summary: ReviewSummary
