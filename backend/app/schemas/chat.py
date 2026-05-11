from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None


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
    tool_calls: Optional[List[dict]] = None
    tokens_used: Optional[int] = None
    referenced_products: List[int] = []


class ChatMessageResponse(ChatMessageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatStreamRequest(BaseModel):
    session_id: int
    content: str
    context: Optional[dict] = None


class ChatMessageHistory(BaseModel):
    messages: List[ChatMessageResponse]
