from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.agent import AIAgent
from app.core.database import AsyncSessionLocal, get_db
from app.core.deps import get_optional_current_user
from app.models.user import User
from app.schemas.chat import ChatSessionCreate, ChatStreamRequest
from app.schemas.common import ApiResponse
from app.services.chat_service import ChatService
from app.services.pet_service import PetService
from app.services.suggested_questions import get_questions as get_suggested_questions

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
    current_user: User | None = Depends(get_optional_current_user),
):
    user_id = current_user.id if current_user else None

    async with AsyncSessionLocal() as db:
        service = ChatService(db)

        # Get chat history before saving the new user message.
        messages = await service.get_session_messages(data.session_id)
        history = [{"role": msg.role, "content": msg.content} for msg in messages[-10:]]

        await service.add_message(data.session_id, "user", data.content)

    async def event_generator():
        import json

        final_response = ""
        referenced_spus = []
        tool_calls = []
        try:
            async with AsyncSessionLocal() as agent_db:
                agent = AIAgent(agent_db)
                async for chunk in agent.chat_stream(data.content, history, user_id=user_id):
                    if chunk.startswith("event: message\ndata: "):
                        try:
                            msg_data = json.loads(chunk[len("event: message\ndata: "):])
                            if msg_data.get("content"):
                                final_response += msg_data["content"]
                        except json.JSONDecodeError:
                            pass
                    elif chunk.startswith("event: tool_call\ndata: "):
                        # Text emitted before a tool call is process narration; keep it out
                        # of the persisted final answer shown in future history loads.
                        final_response = ""
                        try:
                            tool_data = json.loads(chunk[len("event: tool_call\ndata: "):])
                            tool_calls.append({
                                "tool": tool_data.get("tool"),
                                "status": tool_data.get("status", "started"),
                                "input": tool_data.get("input"),
                            })
                        except json.JSONDecodeError:
                            pass
                    elif chunk.startswith("event: tool_result\ndata: "):
                        try:
                            tool_data = json.loads(chunk[len("event: tool_result\ndata: "):])
                            for call in reversed(tool_calls):
                                if call.get("tool") == tool_data.get("tool") and call.get("status") == "started":
                                    call["status"] = tool_data.get("status", "completed")
                                    break
                            else:
                                tool_calls.append({
                                    "tool": tool_data.get("tool"),
                                    "status": tool_data.get("status", "completed"),
                                })
                        except json.JSONDecodeError:
                            pass
                    elif chunk.startswith("event: spus\ndata: "):
                        try:
                            spus_data = json.loads(chunk[len("event: spus\ndata: "):])
                            referenced_spus = spus_data.get("spus", [])
                        except json.JSONDecodeError:
                            pass
                    yield chunk

            # Save assistant message with referenced SPUs after streaming completes.
            if final_response:
                spu_ids = [p["id"] for p in referenced_spus if "id" in p]
                async with AsyncSessionLocal() as save_db:
                    await ChatService(save_db).add_message(
                        data.session_id, "assistant", final_response,
                        tool_calls=tool_calls or None,
                        referenced_spus=spu_ids or None
                    )
        except Exception as exc:
            error_text = "抱歉，刚才处理对话时出现异常，请稍后再试。"
            if not final_response:
                final_response = error_text
                yield f"event: message\ndata: {json.dumps({'content': error_text}, ensure_ascii=False)}\n\n"

            async with AsyncSessionLocal() as save_db:
                await ChatService(save_db).add_message(
                    data.session_id,
                    "assistant",
                    final_response,
                )

            yield f"event: error\ndata: {json.dumps({'message': str(exc)}, ensure_ascii=False)}\n\n"
            yield "event: done\ndata: {\"status\": \"failed\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )


@router.get("/chat/suggested-questions", response_model=ApiResponse[dict])
async def suggested_questions(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    pets = []
    if current_user is not None:
        service = PetService(db)
        pets = await service.list_user_pets(current_user.id)

    questions, source = await get_suggested_questions(
        current_user.id if current_user else None, pets
    )

    return ApiResponse(data={
        "questions": questions,
        "source": source,
    })
