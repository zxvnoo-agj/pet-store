from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.pet import (
    BreedListResponse,
    LastSelectedPetResponse,
    LastSelectedPetUpdate,
    PetCreate,
    PetListResponse,
    PetResponse,
    PetUpdate,
)
from app.services.pet_service import PetService

router = APIRouter()


@router.get("/pets", response_model=ApiResponse[PetListResponse])
async def list_my_pets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    pets = await service.list_user_pets(current_user.id)
    pet_responses = [PetResponse.model_validate(p) for p in pets]
    return ApiResponse(data=PetListResponse(pets=pet_responses, total=len(pet_responses)))


@router.post("/pets", response_model=ApiResponse[PetResponse], status_code=201)
async def create_pet(
    data: PetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    try:
        pet = await service.create_pet(current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ApiResponse(data=PetResponse.model_validate(pet))


@router.put("/pets/{pet_id}", response_model=ApiResponse[PetResponse])
async def update_pet(
    pet_id: int,
    data: PetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    try:
        pet = await service.update_pet(pet_id, current_user.id, data)
    except ValueError as e:
        if "不存在" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    return ApiResponse(data=PetResponse.model_validate(pet))


@router.delete("/pets/{pet_id}", status_code=204)
async def delete_pet(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    deleted = await service.delete_pet(pet_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="宠物不存在")
    return ApiResponse(data=None)


@router.get("/pet-breeds", response_model=ApiResponse[BreedListResponse])
async def list_breeds(
    species: str = Query(..., description="Pet species: cat/dog/bird/fish/reptile/small_pet/other"),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    breeds = await service.get_breeds(species)
    from app.schemas.pet import PetBreedResponse

    return ApiResponse(
        data=BreedListResponse(
            breeds=[PetBreedResponse.model_validate(b) for b in breeds]
        )
    )


@router.get("/pets/last-selected", response_model=ApiResponse[LastSelectedPetResponse])
async def get_last_selected_pet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    pet_id = await service.get_last_selected_pet_id(current_user.id)
    return ApiResponse(data=LastSelectedPetResponse(pet_id=pet_id))


@router.put("/pets/last-selected", response_model=ApiResponse[LastSelectedPetResponse])
async def set_last_selected_pet(
    data: LastSelectedPetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PetService(db)
    try:
        await service.set_last_selected_pet_id(current_user.id, data.pet_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ApiResponse(data=LastSelectedPetResponse(pet_id=data.pet_id))
