from typing import Optional, List
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatSessionResponse, ChatMessageResponse


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(self, user_id: Optional[int], title: Optional[str] = None) -> ChatSession:
        session = ChatSession(
            user_id=user_id,
            title=title or "新对话",
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_sessions(self, user_id: Optional[int]) -> List[ChatSessionResponse]:
        query = select(ChatSession).order_by(desc(ChatSession.updated_at))
        if user_id:
            query = query.where(ChatSession.user_id == user_id)
        
        result = await self.db.execute(query)
        sessions = result.scalars().all()
        
        session_list = []
        for session in sessions:
            msg_count = await self.db.execute(
                select(func.count(ChatMessage.id)).where(ChatMessage.session_id == session.id)
            )
            session_list.append(ChatSessionResponse(
                id=session.id,
                title=session.title or "新对话",
                message_count=msg_count.scalar(),
                updated_at=session.updated_at,
            ))
        
        return session_list

    async def get_session_messages(self, session_id: int) -> List[ChatMessageResponse]:
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        messages = result.scalars().all()
        return [ChatMessageResponse.model_validate(m) for m in messages]

    async def add_message(
        self,
        session_id: int,
        role: str,
        content: str,
        tool_calls: Optional[List[dict]] = None,
        tokens_used: Optional[int] = None,
        referenced_products: Optional[List[int]] = None,
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            tokens_used=tokens_used,
            referenced_products=referenced_products or [],
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def clear_session(self, session_id: int):
        await self.db.execute(
            select(ChatMessage).where(ChatMessage.session_id == session_id).delete()
        )
        await self.db.commit()
