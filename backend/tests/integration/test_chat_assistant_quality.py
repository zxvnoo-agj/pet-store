from app.agents.agent import AIAgent
from app.services.answer_card_service import AnswerCardService


def test_follow_up_card_for_missing_product_constraints():
    cards = AnswerCardService().build_cards(
        "帮我推荐一款猫粮",
        [{"tool": "search_spus", "output": []}],
    )

    assert cards[0].card_type == "follow_up"
    assert any("预算" in question for question in cards[0].payload.questions)
    assert any("软便" in question for question in cards[0].payload.questions)


def test_health_risk_classifier_flags_emergency_like_prompt():
    agent = AIAgent.__new__(AIAgent)

    assert agent._is_health_risk_message("我家猫持续吐还精神沉郁怎么办？")
