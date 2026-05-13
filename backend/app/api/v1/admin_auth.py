from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_current_admin
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter()


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    user: dict


@router.post("/admin/auth/login", response_model=ApiResponse[dict])
async def admin_login(
    data: AdminLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.openid == f"admin:{data.username}")
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.profile.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": str(user.id)})
    return ApiResponse(data={
        "token": token,
        "user": {
            "id": user.id,
            "nickname": user.nickname,
            "is_admin": user.is_admin,
        },
    })


@router.get("/admin/auth/me", response_model=ApiResponse[dict])
async def admin_me(
    current_admin: User = Depends(get_current_admin),
):
    return ApiResponse(data={
        "id": current_admin.id,
        "nickname": current_admin.nickname,
        "is_admin": current_admin.is_admin,
    })
