import json

from app.schemas.chat_cards import AnswerCardsEvent
from app.services.answer_card_service import AnswerCardService
from app.services.food_transition_service import FoodTransitionService


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
