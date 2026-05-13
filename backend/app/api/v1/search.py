
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
