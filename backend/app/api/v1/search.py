
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse
from app.services.search_service import SearchService

router = APIRouter()


@router.get("/search", response_model=ApiResponse[dict])
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    pet_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = SearchService(db)
    results = await service.search(q, pet_type)
    return ApiResponse(data=results)


@router.get("/search/suggestions", response_model=ApiResponse[list[dict]])
async def search_suggestions(
    q: str = Query(..., min_length=1, max_length=50, description="Search query prefix"),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time search suggestions for autocomplete."""
    service = SearchService(db)
    suggestions = await service.get_suggestions(q, limit)
    return ApiResponse(data=suggestions)
