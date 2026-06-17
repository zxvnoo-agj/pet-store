from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assistant_memory import AssistantMemory
from app.models.chat import ChatMessage, ChatSession
from app.schemas.assistant_memory import (
    AssistantMemorySections,
    DreamMemoryRunResponse,
    DreamMemoryUserResult,
    compose_memory_summary,
)
from app.services.assistant_memory_service import AssistantMemoryService


SMALL_TALK_TERMS = ("谢谢", "好的", "哈哈", "你好", "再见", "ok", "OK")
PET_STATUS_TERMS = ("猫", "狗", "幼猫", "成猫", "幼犬", "布偶", "英短", "个月", "岁", "体重", "软便", "腹泻", "呕吐", "挑食")
PREFERENCE_TERMS = ("预算", "以内", "便宜", "贵", "偏好", "喜欢", "不喜欢", "品牌", "鸡肉", "鱼", "冻干", "小包装")
QUESTION_TERMS = ("推荐", "怎么", "如何", "适合", "哪个好", "对比", "换粮", "成分", "猫粮", "狗粮")
CAUTION_TERMS = ("过敏", "软便", "腹泻", "拉稀", "呕吐", "避开", "不能吃", "鸡肉不耐受", "尿不出", "便血")


class DreamMemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.memory_service = AssistantMemoryService(db)

    async def run_once(self, *, dry_run: bool = False, user_id: int | None = None) -> DreamMemoryRunResponse:
        candidates = await self._load_candidates(user_id)
        results: list[DreamMemoryUserResult] = []
        updated = 0

        for candidate_user_id, latest_message_id in candidates:
            try:
                result = await self.process_user(candidate_user_id, latest_message_id, dry_run=dry_run)
            except Exception as exc:
                logger.exception("assistant_memory_dream_failed", user_id=candidate_user_id, error=str(exc))
                result = DreamMemoryUserResult(
                    user_id=candidate_user_id,
                    latest_message_id=latest_message_id,
                    skipped=True,
                    reason="dream_failed",
                )
            results.append(result)
            if result.changed and not result.skipped:
                updated += 1

        return DreamMemoryRunResponse(
            dry_run=dry_run,
            processed=len(results),
            updated=updated,
            results=results,
        )

    async def process_user(
        self,
        user_id: int,
        latest_message_id: int | None = None,
        *,
        dry_run: bool = False,
    ) -> DreamMemoryUserResult:
        memory = await self.memory_service.get_or_create_memory(user_id)
        if not memory.enabled:
            return DreamMemoryUserResult(user_id=user_id, skipped=True, reason="memory_disabled")

        messages = await self._load_new_messages(user_id, memory.last_extracted_message_id or 0)
        if not messages:
            return DreamMemoryUserResult(
                user_id=user_id,
                latest_message_id=latest_message_id,
                skipped=True,
                reason="no_new_messages",
                summary=memory.summary or "",
                sections=self.memory_service.sections_from_memory(memory),
            )

        extracted = self.extract_sections(messages)
        if not any(extracted.model_dump().values()):
            if not dry_run:
                memory.last_extracted_message_id = max(message.id for message in messages)
                memory.last_extracted_at = datetime.now(UTC)
                await self.db.commit()
            return DreamMemoryUserResult(
                user_id=user_id,
                latest_message_id=max(message.id for message in messages),
                skipped=True,
                reason="no_useful_facts",
                summary=memory.summary or "",
                sections=self.memory_service.sections_from_memory(memory),
            )

        merged = self.merge_sections(memory, extracted)
        summary = compose_memory_summary(merged)
        latest_id = max(message.id for message in messages)
        changed = summary != (memory.summary or "")

        if not dry_run and changed:
            memory.pet_status = merged.pet_status
            memory.preferences_budget = merged.preferences_budget
            memory.common_questions = merged.common_questions
            memory.cautions = merged.cautions
            memory.summary = summary
            memory.last_extracted_message_id = latest_id
            memory.last_extracted_at = datetime.now(UTC)
            await self.db.commit()
            await self.db.refresh(memory)
            logger.info("assistant_memory_dream_updated", user_id=user_id, latest_message_id=latest_id)
        elif not dry_run:
            memory.last_extracted_message_id = latest_id
            memory.last_extracted_at = datetime.now(UTC)
            await self.db.commit()

        return DreamMemoryUserResult(
            user_id=user_id,
            latest_message_id=latest_id,
            changed=changed,
            summary=summary,
            sections=merged,
        )

    def extract_sections(self, messages: list[ChatMessage] | list[dict[str, Any]]) -> AssistantMemorySections:
        pet_status: list[str] = []
        preferences_budget: list[str] = []
        common_questions: list[str] = []
        cautions: list[str] = []

        for message in messages:
            role = getattr(message, "role", None) if not isinstance(message, dict) else message.get("role")
            content = getattr(message, "content", "") if not isinstance(message, dict) else message.get("content", "")
            if role != "user" or not self._is_useful(content):
                continue
            snippet = self._snippet(content)
            if any(term in content for term in PET_STATUS_TERMS):
                pet_status.append(snippet)
            if any(term in content for term in PREFERENCE_TERMS):
                preferences_budget.append(snippet)
            if any(term in content for term in QUESTION_TERMS):
                common_questions.extend(self._question_themes(content))
            if any(term in content for term in CAUTION_TERMS):
                cautions.append(snippet)

        return AssistantMemorySections(
            pet_status=self._join_unique(pet_status, limit=120),
            preferences_budget=self._join_unique(preferences_budget, limit=120),
            common_questions=self._join_unique(common_questions, limit=90),
            cautions=self._join_unique(cautions, limit=120),
        )

    def merge_sections(self, memory: AssistantMemory, extracted: AssistantMemorySections) -> AssistantMemorySections:
        current = self.memory_service.sections_from_memory(memory)
        manual_newer = bool(
            memory.last_user_edited_at
            and memory.last_extracted_at
            and memory.last_user_edited_at > memory.last_extracted_at
        )
        merged = AssistantMemorySections(
            pet_status=self._merge_text(current.pet_status, extracted.pet_status, protect_existing=manual_newer),
            preferences_budget=self._merge_text(
                current.preferences_budget,
                extracted.preferences_budget,
                protect_existing=manual_newer,
            ),
            common_questions=self._merge_text(current.common_questions, extracted.common_questions),
            cautions=self._merge_text(current.cautions, extracted.cautions, protect_existing=manual_newer),
        )
        return self._fit_sections(merged)

    async def _load_candidates(self, user_id: int | None) -> list[tuple[int, int]]:
        query = (
            select(ChatSession.user_id, func.max(ChatMessage.id))
            .join(ChatMessage, ChatMessage.session_id == ChatSession.id)
            .outerjoin(AssistantMemory, AssistantMemory.user_id == ChatSession.user_id)
            .where(ChatSession.user_id.is_not(None))
            .where(func.coalesce(AssistantMemory.enabled, True).is_(True))
            .where(ChatMessage.id > func.coalesce(AssistantMemory.last_extracted_message_id, 0))
            .group_by(ChatSession.user_id)
        )
        if user_id is not None:
            query = query.where(ChatSession.user_id == user_id)
        result = await self.db.execute(query)
        return [(int(row[0]), int(row[1])) for row in result.all()]

    async def _load_new_messages(self, user_id: int, after_message_id: int, limit: int = 80) -> list[ChatMessage]:
        result = await self.db.execute(
            select(ChatMessage)
            .join(ChatSession, ChatSession.id == ChatMessage.session_id)
            .where(ChatSession.user_id == user_id)
            .where(ChatMessage.id > after_message_id)
            .order_by(ChatMessage.id.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    def _is_useful(self, content: str) -> bool:
        text = (content or "").strip()
        if len(text) < 4:
            return False
        return not any(text == term or text.startswith(term) for term in SMALL_TALK_TERMS)

    def _snippet(self, content: str, limit: int = 54) -> str:
        text = " ".join(content.strip().split())
        return text[:limit]

    def _question_themes(self, content: str) -> list[str]:
        themes = []
        if "换粮" in content:
            themes.append("换粮节奏")
        if "成分" in content:
            themes.append("成分解读")
        if "对比" in content or "哪个好" in content:
            themes.append("商品对比")
        if "推荐" in content:
            themes.append("商品推荐")
        return themes or [self._snippet(content, 30)]

    def _join_unique(self, values: list[str], limit: int) -> str:
        unique: list[str] = []
        for value in values:
            if value and value not in unique:
                unique.append(value)
        return "；".join(unique)[:limit]

    def _merge_text(self, current: str, incoming: str, *, protect_existing: bool = False, limit: int = 120) -> str:
        current = (current or "").strip()
        incoming = (incoming or "").strip()
        if not incoming:
            return current
        if protect_existing and current:
            return current
        if not current:
            return incoming[:limit]
        if incoming in current:
            return current
        return f"{current}；{incoming}"[:limit]

    def _fit_sections(self, sections: AssistantMemorySections) -> AssistantMemorySections:
        if len(compose_memory_summary(sections)) <= 500:
            return sections
        return AssistantMemorySections(
            pet_status=sections.pet_status[:110],
            preferences_budget=sections.preferences_budget[:110],
            common_questions=sections.common_questions[:80],
            cautions=sections.cautions[:110],
        )
