from app.services.dream_memory_service import DreamMemoryService
from tests.fixtures.assistant_memory import assert_memory_summary_valid


def test_daily_dream_extraction_composes_current_memory_candidate():
    service = DreamMemoryService(db=None)
    sections = service.extract_sections([
        {"role": "user", "content": "我家6个月布偶猫换粮容易软便，预算每月300以内。"},
        {"role": "user", "content": "哈哈谢谢"},
        {"role": "user", "content": "下次还想问幼猫粮推荐和换粮节奏。"},
    ])
    summary = (
        f"宠物状况：{sections.pet_status}"
        f"偏好预算：{sections.preferences_budget}"
        f"常问问题：{sections.common_questions}"
        f"注意事项：{sections.cautions}"
    )

    assert "布偶" in sections.pet_status
    assert "预算" in sections.preferences_budget
    assert "换粮节奏" in sections.common_questions
    assert "软便" in sections.cautions
    assert_memory_summary_valid(summary)
