from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse, Pagination
from app.services.favorite_service import FavoriteService

router = APIRouter()


@router.get("/spus/{spu_id}/favorite", response_model=ApiResponse[dict])
async def get_favorite_status(
    spu_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FavoriteService(db)
    is_favorited = await service.is_favorited(current_user.id, spu_id)
    return ApiResponse(data={"is_favorited": is_favorited})


@router.post("/spus/{spu_id}/favorite", response_model=ApiResponse[dict])
async def toggle_favorite(
    spu_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = FavoriteService(db)

    is_favorited = await service.is_favorited(current_user.id, spu_id)
    if is_favorited:
        await service.remove_favorite(current_user.id, spu_id)
        return ApiResponse(data={"is_favorited": False})
    else:
        await service.add_favorite(current_user.id, spu_id)
        return ApiResponse(data={"is_favorited": True})


@router.get("/users/me/favorites", response_model=ApiResponse[dict])
async def get_my_favorites(
    current_user: User = Depends(get_current_user),
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    service = FavoriteService(db)
    spus, total = await service.get_user_favorites(current_user.id, page, page_size)

    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )

    return ApiResponse(data={"items": spus}, pagination=pagination)
