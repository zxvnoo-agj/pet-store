from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import WechatLoginRequest
from app.services.auth_service import AuthService
from app.services.pet_service import PetService

router = APIRouter()


@router.post("/auth/wechat-login", response_model=ApiResponse[dict])
async def wechat_login(
    data: WechatLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.wechat_login(data.code)
    return ApiResponse(data={
        "token": result.token,
        "expires_at": result.expires_at,
        "user": result.user.model_dump(),
    })


@router.get("/users/me", response_model=ApiResponse[dict])
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet_service = PetService(db)
    pets = await pet_service.list_user_pets(current_user.id)
    pet_list = [
        {
            "id": p.id,
            "species": p.species,
            "breed_name": p.breed.name if p.breed else None,
            "nickname": p.nickname,
        }
        for p in pets
    ]
    return ApiResponse(data={
        "user": {
            "id": current_user.id,
            "nickname": current_user.nickname,
            "avatar_url": current_user.avatar_url,
            "pets": pet_list,
            "pet_count": len(pet_list),
        }
    })
