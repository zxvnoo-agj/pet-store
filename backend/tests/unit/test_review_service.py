from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.schemas.review import ReviewStatus, UserReviewCreate
from app.services.review_service import ReviewService


@pytest.mark.asyncio
async def test_create_user_review_rejects_duplicate(monkeypatch):
    service = ReviewService(MagicMock())
    service.get_user_review_for_spu = AsyncMock(return_value=object())

    with pytest.raises(HTTPException) as exc:
        await service.create_user_review(
            spu_id=1,
            user_id=2,
            review_data=UserReviewCreate(rating=5, content="很好吃", is_recommended=True),
        )

    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_create_user_review_rejects_sensitive_words(monkeypatch):
    service = ReviewService(MagicMock())
    service.get_user_review_for_spu = AsyncMock(return_value=None)
    monkeypatch.setattr("app.services.review_service.find_sensitive_words", lambda _: ["诈骗"])

    with pytest.raises(HTTPException) as exc:
        await service.create_user_review(
            spu_id=1,
            user_id=2,
            review_data=UserReviewCreate(rating=5, content="诈骗内容", is_recommended=True),
        )

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_create_user_review_creates_pending_review(monkeypatch):
    db = MagicMock()
    db.commit = AsyncMock()

    async def refresh(review):
        review.id = 10
        review.created_at = datetime.now(UTC)

    db.refresh = AsyncMock(side_effect=refresh)
    service = ReviewService(db)
    service.get_user_review_for_spu = AsyncMock(return_value=None)
    monkeypatch.setattr("app.services.review_service.find_sensitive_words", lambda _: [])

    review = await service.create_user_review(
        spu_id=1,
        user_id=2,
        review_data=UserReviewCreate(rating=4, content="猫咪愿意吃", is_recommended=True),
    )

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    assert review.id == 10
    assert review.status == ReviewStatus.PENDING
    assert review.source_label == "用户评价"
