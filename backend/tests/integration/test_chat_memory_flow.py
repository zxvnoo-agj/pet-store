import json

from app.services.answer_card_service import AnswerCardService


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
