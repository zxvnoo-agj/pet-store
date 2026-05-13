
from pydantic import BaseModel


class UserBase(BaseModel):
    nickname: str | None = None
    avatar_url: str | None = None
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
    encrypted_data: str | None = None
    iv: str | None = None


class WechatLoginResponse(BaseModel):
    token: str
    expires_at: int
    user: UserResponse
