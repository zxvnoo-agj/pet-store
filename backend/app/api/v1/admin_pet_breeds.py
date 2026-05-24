from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.models.pet_breed import PetBreed
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter()


class BreedCreateRequest(BaseModel):
    species: str
    name: str
    description: str | None = None


class BreedUpdateRequest(BaseModel):
    species: str | None = None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


@router.get("/admin/pet-breeds", response_model=ApiResponse[dict])
async def admin_list_breeds(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    species: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    query = select(PetBreed).order_by(PetBreed.species.asc(), PetBreed.sort_order.asc())
    count_query = select(func.count(PetBreed.id))

    if species:
        query = query.where(PetBreed.species == species)
        count_query = count_query.where(PetBreed.species == species)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    breeds = list(result.scalars().all())

    return ApiResponse(data={
        "breeds": [
            {
                "id": b.id,
                "species": b.species,
                "name": b.name,
                "description": b.description,
                "is_active": b.is_active,
                "sort_order": b.sort_order,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "updated_at": b.updated_at.isoformat() if b.updated_at else None,
            }
            for b in breeds
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.post("/admin/pet-breeds", response_model=ApiResponse[dict], status_code=201)
async def admin_create_breed(
    data: BreedCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    existing = await db.execute(
        select(PetBreed).where(
            PetBreed.species == data.species, PetBreed.name == data.name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该品种已存在")

    breed = PetBreed(
        species=data.species,
        name=data.name,
        description=data.description,
    )
    db.add(breed)
    await db.commit()
    await db.refresh(breed)
    return ApiResponse(data={"id": breed.id, "name": breed.name})


@router.put("/admin/pet-breeds/{breed_id}", response_model=ApiResponse[dict])
async def admin_update_breed(
    breed_id: int,
    data: BreedUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(PetBreed).where(PetBreed.id == breed_id))
    breed = result.scalar_one_or_none()
    if not breed:
        raise HTTPException(status_code=404, detail="品种不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(breed, key, value)

    await db.commit()
    await db.refresh(breed)
    return ApiResponse(data={"id": breed.id, "name": breed.name})


@router.delete("/admin/pet-breeds/{breed_id}", status_code=204)
async def admin_delete_breed(
    breed_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(PetBreed).where(PetBreed.id == breed_id))
    breed = result.scalar_one_or_none()
    if not breed:
        raise HTTPException(status_code=404, detail="品种不存在")

    # Soft delete: set is_active = false
    breed.is_active = False
    await db.commit()
    return None
