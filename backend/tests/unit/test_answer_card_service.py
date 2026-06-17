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
