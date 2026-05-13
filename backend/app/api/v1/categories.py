
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse
from app.services.category_service import CategoryService

router = APIRouter()


@router.get("/categories", response_model=ApiResponse[dict])
async def get_categories(
    pet_type: str | None = Query(None, description="Filter by pet type"),
    db: AsyncSession = Depends(get_db),
):
    service = CategoryService(db)
    categories = await service.get_category_tree(pet_type)
    return ApiResponse(data={"categories": categories})
