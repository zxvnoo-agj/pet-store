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


class AiReviewSummary(BaseModel):
    overall_pros: list[str] = []
    overall_cons: list[str] = []
    recommendation: str = "中性"
    recommend_rate: float = 0.0
    summary: str = ""
    generated_at: datetime | None = None
    review_count: int = 0


class XHSNoteOut(BaseModel):
    id: int
    external_note_id: str | None = None
    content: str = ""
    author: str | None = None
    note_likes: int | None = None
    note_published_at: datetime | None = None
    source_url: str | None = None
    tags: list[str] = []
    is_recommended: bool | None = None
    comments: list[str] = []

    class Config:
        from_attributes = True


class XHSReviewPageResponse(BaseModel):
    ai_summary: AiReviewSummary | None = None
    notes: list[XHSNoteOut] = []
    pagination: dict = {}
