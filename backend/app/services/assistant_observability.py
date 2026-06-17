from collections.abc import Mapping
from typing import Any

from loguru import logger


ASSISTANT_TOOL_CALL = "assistant_tool_call"
ASSISTANT_TOOL_ERROR = "assistant_tool_error"
ASSISTANT_HEALTH_SAFETY = "assistant_health_safety"
ASSISTANT_CARD_GENERATED = "assistant_card_generated"
ASSISTANT_CARD_SKIPPED = "assistant_card_skipped"


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
