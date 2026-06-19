from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserUpdate, WechatLoginRequest
from app.services.auth_service import AuthService, WeChatLoginUnavailableError
from app.services.pet_service import PetService

router = APIRouter()

UPLOAD_ROOT = Path("uploads")
AVATAR_DIR = UPLOAD_ROOT / "avatars"
MAX_AVATAR_SIZE = 2 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def detect_avatar_suffix(content_type: str | None, content: bytes) -> str | None:
    suffix = ALLOWED_AVATAR_TYPES.get(content_type or "")
    if suffix:
        return suffix
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return ".webp"
    return None


@router.post("/auth/wechat-login", response_model=ApiResponse[dict])
async def wechat_login(
    data: WechatLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    try:
        result = await service.wechat_login(data.code, data.encrypted_data, data.iv)
    except WeChatLoginUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ApiResponse(
        data={
            "token": result.token,
            "expires_at": result.expires_at,
            "user": result.user.model_dump(),
            "is_new_user": result.is_new_user,
        }
    )


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
    return ApiResponse(
        data={
            "user": {
                "id": current_user.id,
                "nickname": current_user.nickname,
                "avatar_url": current_user.avatar_url,
                "pets": pet_list,
                "pet_count": len(pet_list),
            }
        }
    )


@router.put("/users/me", response_model=ApiResponse[dict])
async def update_current_user_info(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.nickname is not None:
        nickname = data.nickname.strip()
        if len(nickname) > 64:
            raise HTTPException(status_code=400, detail="Nickname is too long")
        current_user.nickname = nickname or current_user.nickname

    if data.avatar_url is not None:
        avatar_url = data.avatar_url.strip()
        if avatar_url and not (avatar_url.startswith("/uploads/") or avatar_url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Invalid avatar URL")
        current_user.avatar_url = avatar_url or current_user.avatar_url

    await db.commit()
    await db.refresh(current_user)

    return ApiResponse(
        data={
            "user": {
                "id": current_user.id,
                "nickname": current_user.nickname,
                "avatar_url": current_user.avatar_url,
            }
        }
    )


@router.post("/users/me/avatar", response_model=ApiResponse[dict])
async def upload_current_user_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    suffix = detect_avatar_suffix(file.content_type, content)
    if not suffix:
        raise HTTPException(status_code=400, detail="Unsupported avatar image type")

    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="Avatar image is too large")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"user_{current_user.id}_{uuid4().hex}{suffix}"
    file_path = AVATAR_DIR / filename
    file_path.write_bytes(content)

    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    await db.commit()
    await db.refresh(current_user)

    return ApiResponse(
        data={
            "avatar_url": avatar_url,
            "user": {
                "id": current_user.id,
                "nickname": current_user.nickname,
                "avatar_url": current_user.avatar_url,
            },
        }
    )
