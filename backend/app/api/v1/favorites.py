from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.common import ApiResponse, Pagination
from app.services.favorite_service import FavoriteService

router = APIRouter()


@router.post("/products/{product_id}/favorite", response_model=ApiResponse[dict])
async def toggle_favorite(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    # TODO: Get user_id from JWT token
    user_id = 1  # Mock user ID
    service = FavoriteService(db)
    
    is_favorited = await service.is_favorited(user_id, product_id)
    if is_favorited:
        await service.remove_favorite(user_id, product_id)
        return ApiResponse(data={"is_favorited": False})
    else:
        await service.add_favorite(user_id, product_id)
        return ApiResponse(data={"is_favorited": True})


@router.get("/users/me/favorites", response_model=ApiResponse[dict])
async def get_my_favorites(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    # TODO: Get user_id from JWT token
    user_id = 1  # Mock user ID
    service = FavoriteService(db)
    products, total = await service.get_user_favorites(user_id, page, page_size)
    
    total_pages = (total + page_size - 1) // page_size
    pagination = Pagination(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )
    
    return ApiResponse(data={"products": products}, pagination=pagination)
