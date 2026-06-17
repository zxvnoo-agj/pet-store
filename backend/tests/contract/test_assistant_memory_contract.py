from app.schemas.chat_cards import AnswerCardsEvent


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
