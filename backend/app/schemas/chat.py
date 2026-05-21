from datetime import datetime

from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    title: str | None = None
    system_prompt: str | None = None


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    message_count: int
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    role: str
    content: str
    tool_calls: list[dict] | None = None
    tokens_used: int | None = None
    referenced_spus: list[int] = []


class ChatMessageResponse(ChatMessageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatStreamRequest(BaseModel):
    session_id: int
    content: str
    context: dict | None = None


class ChatMessageHistory(BaseModel):
    messages: list[ChatMessageResponse]
