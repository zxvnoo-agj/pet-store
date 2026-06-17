from pydantic import TypeAdapter

from app.schemas.chat_cards import AnswerCard, AnswerCardsEvent, AnswerCardType
from app.services.answer_card_service import AnswerCardService


PRODUCT_A = {
    "id": 12,
    "brand": "Orijen",
    "name": "幼猫粮",
    "pet_type": "cat",
    "category": "猫粮",
    "price_min": 120.0,
    "price_max": 168.0,
    "pros": ["动物蛋白来源清晰", "适口反馈较多"],
    "cons": ["换粮需要循序渐进"],
    "ingredients": ["鸡肉", "火鸡肉"],
    "nutrition": {"protein": "40%"},
    "image_urls": ["https://example.com/a.jpg"],
}

PRODUCT_B = {
    "id": 18,
    "brand": "Royal Canin",
    "name": "幼猫粮",
    "pet_type": "cat",
    "category": "猫粮",
    "price_min": 88.0,
    "price_max": 130.0,
    "pros": ["购买渠道稳定"],
    "cons": [],
    "image_urls": [],
}


def test_build_recommendation_card_from_search_results():
    cards = AnswerCardService().build_cards(
        "三个月幼猫推荐什么猫粮？",
        [{"tool": "search_spus", "output": [PRODUCT_A, PRODUCT_B]}],
    )

    assert cards[0].card_type == AnswerCardType.RECOMMENDATION_LIST
    payload = cards[0].payload
    assert len(payload.items) == 2
    assert payload.items[0].spu_id == 12
    assert "cat" in payload.filters_applied


def test_build_comparison_card_from_compare_results():
    cards = AnswerCardService().build_cards(
        "皇家和渴望哪个好？",
        [{"tool": "compare_spus", "output": [PRODUCT_A, PRODUCT_B]}],
    )

    assert cards[0].card_type == AnswerCardType.COMPARISON
    assert len(cards[0].payload.items) == 2
    assert cards[0].payload.recommendation


def test_build_ingredient_card_from_detail_when_asked():
    cards = AnswerCardService().build_cards(
        "这个配方里的鸡肉粉是什么？",
        [{"tool": "get_spu_detail", "output": PRODUCT_A}],
    )

    assert [card.card_type for card in cards] == [
        AnswerCardType.SPU,
        AnswerCardType.INGREDIENT_INSIGHT,
    ]
    assert cards[1].payload.cautions


def test_follow_up_card_when_product_intent_has_no_results():
    cards = AnswerCardService().build_cards(
        "帮我推荐便宜猫粮",
        [{"tool": "search_spus", "output": []}],
    )

    assert cards[0].card_type == AnswerCardType.FOLLOW_UP
    assert len(cards[0].payload.questions) >= 2


def test_build_food_transition_plan_card_from_tool_result():
    cards = AnswerCardService().build_cards(
        "帮我做一个换粮计划",
        [{
            "tool": "create_food_transition_plan",
            "output": {
                "status": "ready",
                "title": "7天换粮计划",
                "phases": [
                    {"day_range": "1-2天", "old_food_ratio": 75, "new_food_ratio": 25, "note": "观察便便"}
                ],
                "observe": ["食欲", "便便形态"],
                "stop_conditions": ["持续腹泻"],
                "vet_disclaimer": "如出现持续异常，请及时咨询兽医。",
            },
        }],
    )

    assert cards[0].card_type == AnswerCardType.FOOD_TRANSITION_PLAN
    assert cards[0].payload.phases[0].new_food_ratio == 25


def test_build_follow_up_card_from_missing_food_transition_inputs():
    cards = AnswerCardService().build_cards(
        "怎么换粮？",
        [{
            "tool": "create_food_transition_plan",
            "output": {
                "status": "needs_input",
                "questions": ["现在吃的旧粮是什么？", "准备换到哪款新粮？"],
                "reason": "需要旧粮和新粮。",
            },
        }],
    )

    assert cards[0].card_type == AnswerCardType.FOLLOW_UP
    assert "旧粮" in cards[0].payload.questions[0]


def test_answer_card_discriminated_union_validates_payload():
    adapter = TypeAdapter(AnswerCard)
    card = adapter.validate_python({
        "card_id": "card_spu_12",
        "card_type": "spu",
        "title": "渴望幼猫粮",
        "payload": {
            "spu_id": 12,
            "brand": "Orijen",
            "name": "幼猫粮",
            "pet_type": "cat",
            "category": "猫粮",
            "price_range": "¥120-¥168",
            "pros": ["动物蛋白来源清晰"],
            "cautions": ["换粮需循序渐进"],
            "detail_url": "/pages/product/detail?id=12",
        },
    })

    event = AnswerCardsEvent(cards=[card])
    assert event.model_dump(mode="json")["cards"][0]["card_type"] == "spu"
