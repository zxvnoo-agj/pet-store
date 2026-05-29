import httpx
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import UserResponse, WechatLoginResponse
from app.utils.wechat import WeChatDecryptError, decrypt_user_info


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def wechat_login(
        self,
        code: str,
        encrypted_data: str | None = None,
        iv: str | None = None,
    ) -> WechatLoginResponse:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.weixin.qq.com/sns/jscode2session",
                params={
                    "appid": settings.WECHAT_APP_ID,
                    "secret": settings.WECHAT_APP_SECRET,
                    "js_code": code,
                    "grant_type": "authorization_code",
                },
            )
            data = response.json()
            openid = data.get("openid")
            session_key = data.get("session_key")
            if not openid:
                raise ValueError(f"WeChat login failed: {data.get('errmsg', 'unknown error')}")

        result = await self.db.execute(select(User).where(User.openid == openid))
        user = result.scalar_one_or_none()

        if not user:
            user = User(openid=openid, nickname=f"用户{code[:6]}")
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

        if encrypted_data and iv and session_key:
            try:
                wechat_info = decrypt_user_info(session_key, encrypted_data, iv)
                nickname = wechat_info.get("nickName")
                avatar_url = wechat_info.get("avatarUrl")
                if nickname:
                    user.nickname = nickname
                if avatar_url:
                    user.avatar_url = avatar_url
                await self.db.commit()
                await self.db.refresh(user)
            except WeChatDecryptError:
                logger.warning("Failed to decrypt WeChat user info")

        token = create_access_token({"sub": str(user.id), "openid": openid})

        return WechatLoginResponse(
            token=token,
            expires_at=7 * 24 * 3600,
            user=UserResponse.model_validate(user),
        )
