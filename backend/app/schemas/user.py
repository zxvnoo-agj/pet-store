from typing import Optional
from pydantic import BaseModel


class UserBase(BaseModel):
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    pet_types: list = []
    profile: dict = {}


class UserCreate(UserBase):
    openid: str


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True


class WechatLoginRequest(BaseModel):
    code: str
    encrypted_data: Optional[str] = None
    iv: Optional[str] = None


class WechatLoginResponse(BaseModel):
    token: str
    expires_at: int
    user: UserResponse
