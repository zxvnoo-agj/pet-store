from app.schemas.chat_cards import AnswerCardsEvent
from app.schemas.assistant_memory import (
    AssistantMemoryResponse,
    AssistantMemorySections,
    AssistantMemoryUpdate,
    compose_memory_summary,
)
from tests.fixtures.assistant_memory import (
    DEFAULT_MEMORY_SECTIONS,
    assert_memory_summary_valid,
    memory_sections,
)


def test_answer_cards_sse_payload_contract():
    event = AnswerCardsEvent.model_validate({
        "cards": [
            {
                "card_id": "card_list_1",
                "card_type": "recommendation_list",
                "title": "候选商品",
                "payload": {
                    "filters_applied": ["cat", "猫粮"],
                    "ranking_reason": "按匹配条件综合整理",
                    "items": [
                        {
                            "spu_id": 12,
                            "brand": "Orijen",
                            "name": "幼猫粮",
                            "pet_type": "cat",
                            "category": "猫粮",
                            "price_range": "¥120-¥168",
                            "reason": "动物蛋白来源清晰",
                        }
                    ],
                },
                "source": "search_spus",
            }
        ]
    })

    payload = event.model_dump(mode="json")
    assert payload["cards"][0]["card_type"] == "recommendation_list"
    assert payload["cards"][0]["payload"]["items"][0]["spu_id"] == 12


def test_assistant_memory_response_contract():
    sections = AssistantMemorySections.model_validate(DEFAULT_MEMORY_SECTIONS)
    summary = compose_memory_summary(sections)
    response = AssistantMemoryResponse(
        enabled=True,
        summary=summary,
        sections=sections,
        last_updated_at=None,
        last_extracted_at=None,
        last_user_edited_at=None,
    )

    payload = response.model_dump(mode="json")
    assert payload["enabled"] is True
    assert payload["sections"]["pet_status"] == DEFAULT_MEMORY_SECTIONS["pet_status"]
    assert payload["character_count"] == len(summary)
    assert_memory_summary_valid(payload["summary"])


def test_assistant_memory_update_rejects_unknown_sections():
    try:
        AssistantMemoryUpdate.model_validate({
            "sections": {
                **memory_sections(),
                "private_note": "不应进入长期记忆",
            }
        })
    except ValueError as exc:
        assert "private_note" in str(exc)
    else:
        raise AssertionError("unknown memory section should be rejected")


def test_assistant_memory_update_enforces_500_character_summary():
    try:
        AssistantMemoryUpdate.model_validate({
            "sections": memory_sections(pet_status="猫" * 501)
        })
    except ValueError as exc:
        assert "500" in str(exc)
    else:
        raise AssertionError("oversized assistant memory summary should be rejected")
