from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.user import WechatLoginRequest
from app.services.auth_service import AuthService

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
