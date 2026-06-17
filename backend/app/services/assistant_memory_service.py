from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assistant_memory import AssistantMemory
from app.schemas.assistant_memory import (
    AssistantMemoryResponse,
    AssistantMemorySections,
    AssistantMemorySettingsResponse,
    AssistantMemoryUpdate,
    compose_memory_summary,
)
from app.services.assistant_observability import log_memory_update


class AssistantMemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_memory(self, user_id: int) -> AssistantMemory:
        result = await self.db.execute(
            select(AssistantMemory).where(AssistantMemory.user_id == user_id)
        )
        memory = result.scalar_one_or_none()
        if memory:
            return memory

        memory = AssistantMemory(user_id=user_id, enabled=True, summary="")
        self.db.add(memory)
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    async def get_response(self, user_id: int) -> AssistantMemoryResponse:
        memory = await self.get_or_create_memory(user_id)
        return self.to_response(memory)

    async def update_memory(self, user_id: int, data: AssistantMemoryUpdate) -> AssistantMemoryResponse:
        memory = await self.get_or_create_memory(user_id)
        self._apply_sections(memory, data.sections)
        memory.last_user_edited_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(memory)
        log_memory_update("edit", user_id, character_count=len(memory.summary or ""))
        return self.to_response(memory)

    async def update_settings(self, user_id: int, enabled: bool) -> AssistantMemorySettingsResponse:
        memory = await self.get_or_create_memory(user_id)
        memory.enabled = enabled
        memory.last_user_edited_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(memory)
        log_memory_update("settings", user_id, enabled=bool(memory.enabled))
        return AssistantMemorySettingsResponse(enabled=memory.enabled, last_updated_at=memory.updated_at)

    async def clear_memory(self, user_id: int) -> AssistantMemoryResponse:
        memory = await self.get_or_create_memory(user_id)
        self._apply_sections(memory, AssistantMemorySections())
        memory.last_user_edited_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(memory)
        log_memory_update("clear", user_id, character_count=0)
        return self.to_response(memory)

    async def build_prompt_context(self, user_id: int) -> str:
        memory = await self.get_or_create_memory(user_id)
        if not memory.enabled or not memory.summary:
            return ""
        return "\n".join([
            "## AI长期记忆",
            memory.summary,
            "仅将这些记忆用于本次宠物用品和宠物知识建议；若用户纠正，以用户本轮信息为准。",
        ])

    def to_response(self, memory: AssistantMemory) -> AssistantMemoryResponse:
        sections = self.sections_from_memory(memory)
        summary = memory.summary or compose_memory_summary(sections)
        return AssistantMemoryResponse(
            enabled=bool(memory.enabled),
            summary=summary,
            sections=sections,
            last_updated_at=memory.updated_at,
            last_extracted_at=memory.last_extracted_at,
            last_user_edited_at=memory.last_user_edited_at,
        )

    def sections_from_memory(self, memory: AssistantMemory) -> AssistantMemorySections:
        return AssistantMemorySections(
            pet_status=memory.pet_status or "",
            preferences_budget=memory.preferences_budget or "",
            common_questions=memory.common_questions or "",
            cautions=memory.cautions or "",
        )

    def _apply_sections(self, memory: AssistantMemory, sections: AssistantMemorySections) -> None:
        memory.pet_status = sections.pet_status
        memory.preferences_budget = sections.preferences_budget
        memory.common_questions = sections.common_questions
        memory.cautions = sections.cautions
        memory.summary = compose_memory_summary(sections)
