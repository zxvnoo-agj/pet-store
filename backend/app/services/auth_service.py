import httpx
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import WechatLoginResponse, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def wechat_login(self, code: str) -> WechatLoginResponse:
        # Exchange code for openid via WeChat API
        # This is a mock implementation - in production, call WeChat API
        async with httpx.AsyncClient() as client:
            # Mock response for development
            # In production:
            # response = await client.get(
            #     "https://api.weixin.qq.com/sns/jscode2session",
            #     params={
            #         "appid": settings.WECHAT_APP_ID,
            #         "secret": settings.WECHAT_APP_SECRET,
            #         "js_code": code,
            #         "grant_type": "authorization_code",
            #     }
            # )
            # data = response.json()
            # openid = data.get("openid")
            
            # Mock openid for development
            openid = f"mock_openid_{code}"
        
        # Find or create user
        result = await self.db.execute(select(User).where(User.openid == openid))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(openid=openid, nickname=f"用户{code[:6]}")
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
        
        # Create JWT token
        token = create_access_token({"sub": str(user.id), "openid": openid})
        
        return WechatLoginResponse(
            token=token,
            expires_at=7 * 24 * 3600,  # 7 days
            user=UserResponse.model_validate(user),
        )
