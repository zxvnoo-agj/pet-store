from app.agents.agent import AIAgent
from app.agents.prompts import SYSTEM_PROMPT


def test_system_prompt_contains_health_safety_boundaries():
    assert "不能诊断" in SYSTEM_PROMPT
    assert "开药" in SYSTEM_PROMPT
    assert "剂量" in SYSTEM_PROMPT
    assert "尽快就医" in SYSTEM_PROMPT


def test_health_risk_message_detection():
    agent = AIAgent.__new__(AIAgent)

    assert agent._is_health_risk_message("我家猫一直吐怎么办？")
    assert agent._is_health_risk_message("狗狗尿不出还精神沉郁")
    assert not agent._is_health_risk_message("三个月幼猫推荐什么猫粮？")
