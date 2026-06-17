from collections.abc import Mapping
from typing import Any

from loguru import logger


ASSISTANT_TOOL_CALL = "assistant_tool_call"
ASSISTANT_TOOL_ERROR = "assistant_tool_error"
ASSISTANT_HEALTH_SAFETY = "assistant_health_safety"
ASSISTANT_CARD_GENERATED = "assistant_card_generated"
ASSISTANT_CARD_SKIPPED = "assistant_card_skipped"
ASSISTANT_MEMORY_UPDATED = "assistant_memory_updated"
ASSISTANT_MEMORY_SETTINGS_UPDATED = "assistant_memory_settings_updated"
ASSISTANT_MEMORY_CLEARED = "assistant_memory_cleared"


def log_tool_call(tool: str, status: str, **extra: Any) -> None:
    logger.info(ASSISTANT_TOOL_CALL, tool=tool, status=status, **extra)


def log_tool_error(tool: str, error: Exception | str, **extra: Any) -> None:
    logger.warning(ASSISTANT_TOOL_ERROR, tool=tool, error=str(error), **extra)


def log_health_safety_path(reason: str, **extra: Any) -> None:
    logger.info(ASSISTANT_HEALTH_SAFETY, reason=reason, **extra)


def log_card_generation(cards: list[Mapping[str, Any]], **extra: Any) -> None:
    card_types = [card.get("card_type") for card in cards]
    logger.info(
        ASSISTANT_CARD_GENERATED if cards else ASSISTANT_CARD_SKIPPED,
        card_count=len(cards),
        card_types=card_types,
        **extra,
    )


def log_memory_update(action: str, user_id: int, **extra: Any) -> None:
    event_name = {
        "settings": ASSISTANT_MEMORY_SETTINGS_UPDATED,
        "clear": ASSISTANT_MEMORY_CLEARED,
    }.get(action, ASSISTANT_MEMORY_UPDATED)
    logger.info(event_name, user_id=user_id, action=action, **extra)
