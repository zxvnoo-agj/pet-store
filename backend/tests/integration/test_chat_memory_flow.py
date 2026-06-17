import json

import pytest
from loguru import logger

from app.models.assistant_memory import AssistantMemory
from app.schemas.chat_cards import AnswerCardsEvent
from app.schemas.assistant_memory import AssistantMemoryUpdate
from app.services.answer_card_service import AnswerCardService
from app.services.assistant_memory_service import AssistantMemoryService
from app.services.assistant_observability import log_card_generation
from app.services.dream_memory_service import DreamMemoryService
from app.services.food_transition_service import FoodTransitionService
from tests.fixtures.assistant_memory import memory_sections


def test_answer_cards_event_payload_is_sse_serializable():
    cards = AnswerCardService().build_cards(
        "皇家和渴望哪个好？",
        [{
            "tool": "compare_spus",
            "output": [
                {"id": 1, "brand": "A", "name": "幼猫粮", "pet_type": "cat", "category": "猫粮"},
                {"id": 2, "brand": "B", "name": "幼猫粮", "pet_type": "cat", "category": "猫粮"},
            ],
        }],
    )

    payload = {"cards": [card.model_dump(mode="json") for card in cards]}
    event = f"event: answer_cards\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

    assert event.startswith("event: answer_cards")
    assert '"card_type": "comparison"' in event


def test_food_transition_tool_result_becomes_answer_card_event():
    tool_output = FoodTransitionService().generate_plan(
        old_food="旧粮",
        new_food="新粮",
        gut_status="便便正常",
        pet_type="cat",
    )
    cards = AnswerCardService().build_cards(
        "帮我做一个换粮计划",
        [{"tool": "create_food_transition_plan", "output": tool_output}],
    )

    event = AnswerCardsEvent(cards=cards)
    payload = event.model_dump(mode="json")
    assert payload["cards"][0]["card_type"] == "food_transition_plan"
    assert payload["cards"][0]["payload"]["phases"][-1]["new_food_ratio"] == 100


def test_user_memory_edit_pause_resume_and_clear_payloads():
    update = AssistantMemoryUpdate.model_validate({"sections": memory_sections()})
    service = AssistantMemoryService(db=None)

    assert update.sections.pet_status
    assert service is not None


class _MemoryExecuteResult:
    def __init__(self, memory):
        self.memory = memory

    def scalar_one_or_none(self):
        return self.memory


class _MemoryDb:
    def __init__(self):
        self.memory = AssistantMemory(user_id=88, enabled=True, summary="")
        self.commits = 0

    async def execute(self, _query):
        return _MemoryExecuteResult(self.memory)

    def add(self, memory):
        self.memory = memory

    async def commit(self):
        self.commits += 1

    async def refresh(self, _memory):
        return None


@pytest.fixture
def log_records():
    records = []
    sink_id = logger.add(lambda message: records.append(message.record), level="INFO")
    try:
        yield records
    finally:
        logger.remove(sink_id)


@pytest.mark.asyncio
async def test_memory_edit_pause_and_clear_emit_structured_logs(log_records):
    service = AssistantMemoryService(_MemoryDb())

    await service.update_memory(88, AssistantMemoryUpdate.model_validate({"sections": memory_sections()}))
    await service.update_settings(88, enabled=False)
    await service.update_settings(88, enabled=True)
    await service.clear_memory(88)

    events = [record["message"] for record in log_records]
    assert "assistant_memory_updated" in events
    assert events.count("assistant_memory_settings_updated") == 2
    assert "assistant_memory_cleared" in events
    assert any(record["extra"].get("character_count", 0) <= 500 for record in log_records)
    assert any(record["extra"].get("enabled") is False for record in log_records)


@pytest.mark.asyncio
async def test_dream_failure_emits_structured_log(monkeypatch, log_records):
    service = DreamMemoryService(db=None)

    async def fake_candidates(_user_id):
        return [(88, 123)]

    async def fail_process_user(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(service, "_load_candidates", fake_candidates)
    monkeypatch.setattr(service, "process_user", fail_process_user)

    result = await service.run_once(dry_run=True)

    assert result.processed == 1
    assert result.results[0].skipped is True
    failure_logs = [record for record in log_records if record["message"] == "assistant_memory_dream_failed"]
    assert failure_logs
    assert failure_logs[0]["extra"]["user_id"] == 88


def test_card_generation_emits_structured_log(log_records):
    cards = AnswerCardService().build_cards(
        "推荐幼猫粮",
        [{"tool": "search_spus", "output": [{"id": 1, "brand": "A", "name": "幼猫粮", "pet_type": "cat"}]}],
    )

    log_card_generation([card.model_dump(mode="json") for card in cards], user_id=88)

    card_logs = [record for record in log_records if record["message"] == "assistant_card_generated"]
    assert card_logs
    assert card_logs[0]["extra"]["card_count"] == 1
    assert card_logs[0]["extra"]["card_types"] == ["spu"]
