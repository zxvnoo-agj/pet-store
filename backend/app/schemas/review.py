from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class ReviewSource(StrEnum):
    USER = "user"
    XHS_MANUAL = "xhs_manual"
    XHS_AUTO = "xhs_auto"
    ADMIN_SEED = "admin_seed"


class ReviewStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


REVIEW_SOURCE_LABELS: dict[str, str] = {
    ReviewSource.USER: "用户评价",
    ReviewSource.XHS_MANUAL: "小红书",
    ReviewSource.XHS_AUTO: "小红书",
    ReviewSource.ADMIN_SEED: "运营整理",
}

REVIEW_STATUS_LABELS: dict[str, str] = {
    ReviewStatus.PENDING: "等待审核",
    ReviewStatus.APPROVED: "已通过",
    ReviewStatus.REJECTED: "未通过",
}


def get_review_source_label(source: str | None) -> str:
    return REVIEW_SOURCE_LABELS.get(source or "", "评价")


def get_review_status_label(status: str | None) -> str:
    return REVIEW_STATUS_LABELS.get(status or "", "未知状态")


class ReviewUser(BaseModel):
    nickname: str
    avatar: str | None = None


class ReviewBase(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    content: str = Field(..., min_length=1, max_length=500)
    images: list[str] = []
    tags: list[str] = []
    is_recommended: bool | None = None

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评价内容不能为空")
        return value


class ReviewCreate(ReviewBase):
    pass


class UserReviewCreate(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    content: str = Field(..., min_length=1, max_length=500)
    is_recommended: bool | None = None

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评价内容不能为空")
        return value


class ReviewResponse(ReviewBase):
    id: int
    spu_id: int
    user: ReviewUser | None = None
    helpful_count: int = 0
    source: str = ReviewSource.USER
    source_label: str = get_review_source_label(ReviewSource.USER)
    status: str = ReviewStatus.PENDING
    status_label: str = get_review_status_label(ReviewStatus.PENDING)
    author: str | None = None
    source_url: str | None = None
    reject_reason: str | None = None
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
    user_id: int | None = None
    spu_name: str | None = None


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


class PublicReviewOut(BaseModel):
    id: int
    spu_id: int
    rating: float
    content: str
    tags: list[str] = []
    is_recommended: bool | None = None
    source: str
    source_label: str
    source_url: str | None = None
    author: str | None = None
    status: str
    status_label: str
    note_likes: int | None = None
    created_at: datetime


class MyReviewOut(PublicReviewOut):
    reject_reason: str | None = None


class SpuReviewsPageResponse(BaseModel):
    ai_summary: AiReviewSummary | None = None
    reviews: list[PublicReviewOut] = []
    notes: list[PublicReviewOut] = []
    my_review: MyReviewOut | None = None
    pagination: dict = {}


class ReviewSubmitResponse(BaseModel):
    review: MyReviewOut
    message: str


class AdminReviewReject(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("拒绝原因不能为空")
        return value


class AdminReviewCreate(BaseModel):
    spu_id: int
    rating: float = Field(..., ge=1, le=5)
    content: str = Field(..., min_length=1, max_length=500)
    is_recommended: bool | None = None
    source: ReviewSource = ReviewSource.ADMIN_SEED
    source_url: str | None = None
    external_note_id: str | None = None
    author: str | None = "运营整理"

    @field_validator("source")
    @classmethod
    def validate_admin_source(cls, value: ReviewSource) -> ReviewSource:
        if value not in {ReviewSource.ADMIN_SEED, ReviewSource.XHS_MANUAL}:
            raise ValueError("后台只能创建运营整理或小红书手动评价")
        return value

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评价内容不能为空")
        return value


def serialize_public_review(review) -> PublicReviewOut:
    return PublicReviewOut(
        id=review.id,
        spu_id=review.spu_id,
        rating=float(review.rating),
        content=review.content,
        tags=review.tags or [],
        is_recommended=review.is_recommended,
        source=review.source,
        source_label=get_review_source_label(review.source),
        source_url=review.source_url,
        author=review.author or (review.user.nickname if getattr(review, "user", None) else None),
        status=review.status,
        status_label=get_review_status_label(review.status),
        note_likes=review.note_likes,
        created_at=review.created_at,
    )


def serialize_my_review(review) -> MyReviewOut:
    data = serialize_public_review(review).model_dump()
    data["reject_reason"] = review.reject_reason
    return MyReviewOut(**data)


def serialize_admin_review(review) -> AdminReviewResponse:
    public = serialize_public_review(review)
    return AdminReviewResponse(
        **public.model_dump(),
        images=review.images or [],
        helpful_count=review.helpful_count or 0,
        external_note_id=review.external_note_id,
        note_published_at=review.note_published_at,
        user_id=review.user_id,
        reject_reason=review.reject_reason,
        spu_name=review.spu.name if getattr(review, "spu", None) else None,
    )
