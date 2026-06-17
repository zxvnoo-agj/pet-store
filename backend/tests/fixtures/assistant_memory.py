from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any


MEMORY_SECTIONS = (
    "pet_status",
    "preferences_budget",
    "common_questions",
    "cautions",
)

SECTION_LABELS = {
    "pet_status": "宠物状况",
    "preferences_budget": "偏好预算",
    "common_questions": "常问问题",
    "cautions": "注意事项",
}

DEFAULT_MEMORY_SECTIONS: dict[str, str] = {
    "pet_status": "6个月布偶猫，换粮易软便。",
    "preferences_budget": "偏好肠胃友好型幼猫粮，预算每月300元以内。",
    "common_questions": "猫粮选择、换粮节奏。",
    "cautions": "突然换粮会软便，鸡肉配方需谨慎。",
}

DEFAULT_MEMORY_SUMMARY = (
    "宠物状况：6个月布偶猫，换粮易软便。"
    "偏好预算：偏好肠胃友好型幼猫粮，预算每月300元以内。"
    "常问问题：猫粮选择、换粮节奏。"
    "注意事项：突然换粮会软便，鸡肉配方需谨慎。"
)

DEFAULT_DREAM_MESSAGES = [
    {
        "id": 101,
        "role": "user",
        "content": "我家6个月布偶换粮容易软便，预算一个月300以内，想找幼猫粮。",
    },
    {
        "id": 102,
        "role": "assistant",
        "content": "可以优先看肠胃友好、蛋白来源清晰的幼猫粮，换粮要循序渐进。",
    },
    {
        "id": 103,
        "role": "user",
        "content": "它吃鸡肉配方好像不太稳定，先记一下。",
    },
]


def memory_sections(**overrides: str) -> dict[str, str]:
    sections = deepcopy(DEFAULT_MEMORY_SECTIONS)
    unknown = set(overrides) - set(MEMORY_SECTIONS)
    if unknown:
        raise ValueError(f"Unknown assistant memory sections: {sorted(unknown)}")
    sections.update(overrides)
    return sections


def compose_memory_summary(sections: dict[str, str] | None = None) -> str:
    source = sections or DEFAULT_MEMORY_SECTIONS
    parts = []
    for key in MEMORY_SECTIONS:
        value = (source.get(key) or "").strip()
        if value:
            parts.append(f"{SECTION_LABELS[key]}：{value}")
    return "".join(parts)


def assistant_memory_row(
    user_id: int = 1,
    *,
    enabled: bool = True,
    sections: dict[str, str] | None = None,
    last_extracted_message_id: int | None = 103,
) -> dict[str, Any]:
    now = datetime(2026, 6, 17, 10, 0, tzinfo=timezone.utc)
    normalized_sections = memory_sections(**(sections or {}))
    return {
        "id": 1,
        "user_id": user_id,
        "enabled": enabled,
        **normalized_sections,
        "summary": compose_memory_summary(normalized_sections),
        "last_extracted_message_id": last_extracted_message_id,
        "last_extracted_at": now,
        "last_user_edited_at": None,
        "created_at": now,
        "updated_at": now,
    }


def dream_messages() -> list[dict[str, Any]]:
    return deepcopy(DEFAULT_DREAM_MESSAGES)


def assert_memory_summary_valid(summary: str, max_chars: int = 500) -> None:
    assert len(summary) <= max_chars
    assert "宠物状况：" in summary
    assert "偏好预算：" in summary
    assert "常问问题：" in summary
    assert "注意事项：" in summary
