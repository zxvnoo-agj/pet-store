from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator


SECTION_LABELS = {
    "pet_status": "宠物状况",
    "preferences_budget": "偏好预算",
    "common_questions": "常问问题",
    "cautions": "注意事项",
}


class AssistantMemorySections(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pet_status: str = ""
    preferences_budget: str = ""
    common_questions: str = ""
    cautions: str = ""

    @field_validator("*", mode="before")
    @classmethod
    def normalize_section(cls, value: str | None) -> str:
        if value is None:
            return ""
        return str(value).strip()


def compose_memory_summary(sections: AssistantMemorySections) -> str:
    parts = []
    for key, label in SECTION_LABELS.items():
        value = getattr(sections, key).strip()
        if value:
            parts.append(f"{label}：{value}")
    return "".join(parts)


class AssistantMemoryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sections: AssistantMemorySections

    @model_validator(mode="after")
    def validate_summary_length(self) -> "AssistantMemoryUpdate":
        summary = compose_memory_summary(self.sections)
        if len(summary) > 500:
            raise ValueError("assistant memory summary must be 500 characters or fewer")
        return self


class AssistantMemorySettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool


class AssistantMemoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool = True
    summary: str = Field(default="", max_length=500)
    sections: AssistantMemorySections = Field(default_factory=AssistantMemorySections)
    last_updated_at: datetime | None = None
    last_extracted_at: datetime | None = None
    last_user_edited_at: datetime | None = None

    @computed_field
    @property
    def character_count(self) -> int:
        return len(self.summary or "")


class AssistantMemorySettingsResponse(BaseModel):
    enabled: bool
    last_updated_at: datetime | None = None


class DreamMemoryRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: int | None = None
    dry_run: bool = True


class DreamMemoryUserResult(BaseModel):
    user_id: int
    latest_message_id: int | None = None
    changed: bool = False
    skipped: bool = False
    reason: str | None = None
    summary: str = ""
    sections: AssistantMemorySections = Field(default_factory=AssistantMemorySections)


class DreamMemoryRunResponse(BaseModel):
    dry_run: bool
    processed: int = 0
    updated: int = 0
    results: list[DreamMemoryUserResult] = Field(default_factory=list)
