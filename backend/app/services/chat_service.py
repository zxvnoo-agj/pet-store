
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatMessage, ChatSession
from app.schemas.chat import ChatMessageResponse, ChatSessionResponse


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(self, user_id: int | None, title: str | None = None) -> ChatSession:
        session = ChatSession(
            user_id=user_id,
            title=title or "新对话",
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_sessions(self, user_id: int | None) -> list[ChatSessionResponse]:
        count_subquery = (
            select(
                ChatMessage.session_id,
                func.count(ChatMessage.id).label("msg_count"),
            )
            .group_by(ChatMessage.session_id)
            .subquery()
        )

        query = (
            select(ChatSession, count_subquery.c.msg_count)
            .outerjoin(count_subquery, ChatSession.id == count_subquery.c.session_id)
            .order_by(desc(ChatSession.updated_at))
        )
        if user_id:
            query = query.where(ChatSession.user_id == user_id)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            ChatSessionResponse(
                id=session.id,
                title=session.title or "新对话",
                message_count=count or 0,
                updated_at=session.updated_at,
            )
            for session, count in rows
        ]

    async def get_session_messages(self, session_id: int) -> list[ChatMessageResponse]:
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
        tool_calls: list[dict] | None = None,
        tokens_used: int | None = None,
        referenced_products: list[int] | None = None,
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
