from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.chat import ChatSessionCreate, ChatSessionResponse, ChatMessageHistory, ChatStreamRequest
from app.services.chat_service import ChatService
from app.agents.agent import AIAgent

router = APIRouter()


@router.post("/chat/sessions", response_model=ApiResponse[dict])
async def create_session(
    data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    session = await service.create_session(None, data.title)
    return ApiResponse(data={
        "session_id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
    })


@router.get("/chat/sessions", response_model=ApiResponse[dict])
async def get_sessions(
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    sessions = await service.get_sessions(None)
    return ApiResponse(data={"sessions": sessions})


@router.get("/chat/sessions/{session_id}/messages", response_model=ApiResponse[dict])
async def get_session_messages(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    messages = await service.get_session_messages(session_id)
    return ApiResponse(data={"messages": messages})


@router.post("/chat/sessions/{session_id}/clear", response_model=ApiResponse[dict])
async def clear_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    await service.clear_session(session_id)
    return ApiResponse(data={"success": True})


@router.post("/chat/stream")
async def chat_stream(
    data: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ChatService(db)
    agent = AIAgent(db)
    
    # Get chat history
    messages = await service.get_session_messages(data.session_id)
    history = [{"role": msg.role, "content": msg.content} for msg in messages[-10:]]
    
    # Save user message
    await service.add_message(data.session_id, "user", data.content)
    
    async def event_generator():
        full_response = ""
        async for chunk in agent.chat_stream(data.content, history):
            if chunk.startswith("data: "):
                content = chunk[6:].strip()
                full_response += content
            yield chunk
        
        # Save assistant message
        await service.add_message(data.session_id, "assistant", full_response)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )
