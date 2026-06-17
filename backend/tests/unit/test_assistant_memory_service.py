from datetime import UTC, datetime, timedelta

import pytest

from app.models.assistant_memory import AssistantMemory
from app.schemas.assistant_memory import AssistantMemoryUpdate, compose_memory_summary
from app.services.dream_memory_service import DreamMemoryService
from tests.fixtures.assistant_memory import assert_memory_summary_valid, memory_sections


def test_memory_summary_composition_and_500_character_enforcement():
    update = AssistantMemoryUpdate.model_validate({"sections": memory_sections()})
    summary = compose_memory_summary(update.sections)

    assert_memory_summary_valid(summary)

    with pytest.raises(ValueError, match="500"):
        AssistantMemoryUpdate.model_validate({
            "sections": memory_sections(preferences_budget="预算" * 260)
        })


def test_dream_extraction_filters_small_talk_and_classifies_sections():
    service = DreamMemoryService(db=None)
    sections = service.extract_sections([
        {"role": "user", "content": "谢谢"},
        {"role": "user", "content": "我家6个月布偶最近换粮软便，预算300以内，想推荐幼猫粮"},
        {"role": "assistant", "content": "可以循序渐进换粮。"},
    ])

    assert "布偶" in sections.pet_status
    assert "预算300以内" in sections.preferences_budget
    assert "商品推荐" in sections.common_questions
    assert "软便" in sections.cautions


def test_dream_merge_does_not_overwrite_newer_manual_edit():
    now = datetime.now(UTC)
    memory = AssistantMemory(
        user_id=1,
        enabled=True,
        pet_status="用户手动写入：7个月布偶猫。",
        preferences_budget="用户手动写入：预算300以内。",
        common_questions="猫粮选择",
        cautions="鸡肉配方需谨慎。",
        summary="",
        last_extracted_at=now - timedelta(days=1),
        last_user_edited_at=now,
    )
    service = DreamMemoryService(db=None)

    merged = service.merge_sections(
        memory,
        service.extract_sections([
            {"role": "user", "content": "我家猫最近软便，预算500以内，想推荐猫粮"},
        ]),
    )

    assert merged.pet_status == "用户手动写入：7个月布偶猫。"
    assert merged.preferences_budget == "用户手动写入：预算300以内。"
    assert merged.cautions == "鸡肉配方需谨慎。"
    assert "商品推荐" in merged.common_questions
