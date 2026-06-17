from __future__ import annotations

from dataclasses import dataclass
from typing import Any


MISSING_VALUES = {"", "未知", "不知道", "不清楚", "无", "none", "null"}
SENSITIVE_GUT_TERMS = ("软便", "腹泻", "拉稀", "呕吐", "肠胃敏感", "玻璃胃")


@dataclass(frozen=True)
class FoodTransitionInput:
    old_food: str | None = None
    new_food: str | None = None
    gut_status: str | None = None
    pet_type: str | None = None
    age_stage: str | None = None
    days: int | None = None


class FoodTransitionService:
    def generate_plan(
        self,
        old_food: str | None = None,
        new_food: str | None = None,
        gut_status: str | None = None,
        pet_type: str | None = None,
        age_stage: str | None = None,
        days: int | None = None,
    ) -> dict[str, Any]:
        payload = FoodTransitionInput(
            old_food=self._clean(old_food),
            new_food=self._clean(new_food),
            gut_status=self._clean(gut_status),
            pet_type=self._clean(pet_type),
            age_stage=self._clean(age_stage),
            days=days,
        )
        missing = self._missing_inputs(payload)
        if missing:
            return {
                "status": "needs_input",
                "capability": "food_transition_plan",
                "questions": self._questions_for(missing),
                "reason": "换粮计划需要旧粮、新粮和当前肠胃状态，才能给出更稳妥的比例与观察重点。",
            }

        plan_days = self._plan_days(payload)
        return {
            "status": "ready",
            "capability": "food_transition_plan",
            "title": f"{plan_days}天换粮计划",
            "inputs": {
                "old_food": payload.old_food,
                "new_food": payload.new_food,
                "gut_status": payload.gut_status,
                "pet_type": payload.pet_type,
                "age_stage": payload.age_stage,
            },
            "phases": self._phases(plan_days),
            "observe": ["食欲", "便便形态", "呕吐", "精神状态", "饮水量"],
            "stop_conditions": [
                "持续腹泻或便血",
                "反复呕吐或明显食欲下降",
                "精神沉郁、脱水或疼痛表现",
                "原有疾病宠物出现异常波动",
            ],
            "vet_disclaimer": "换粮计划不能替代兽医诊疗；如出现持续异常、幼宠/老年宠或有基础病，请及时咨询兽医。",
        }

    def _clean(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        if cleaned.lower() in MISSING_VALUES:
            return None
        return cleaned

    def _missing_inputs(self, payload: FoodTransitionInput) -> list[str]:
        missing = []
        if not payload.old_food:
            missing.append("old_food")
        if not payload.new_food:
            missing.append("new_food")
        if not payload.gut_status:
            missing.append("gut_status")
        return missing

    def _questions_for(self, missing: list[str]) -> list[str]:
        question_map = {
            "old_food": "现在吃的旧粮是什么？已经吃了多久？",
            "new_food": "准备换到哪款新粮？是否已经买到小包装？",
            "gut_status": "最近便便、呕吐、食欲和精神状态怎么样？有没有软便或腹泻？",
        }
        return [question_map[item] for item in missing]

    def _plan_days(self, payload: FoodTransitionInput) -> int:
        if payload.days in (7, 10, 14):
            return int(payload.days)
        status = payload.gut_status or ""
        if any(term in status for term in SENSITIVE_GUT_TERMS):
            return 10
        return 7

    def _phases(self, plan_days: int) -> list[dict[str, Any]]:
        if plan_days == 14:
            return [
                self._phase("1-4天", 75, 25, "少量加入新粮，重点观察便便和食欲。"),
                self._phase("5-8天", 50, 50, "状态稳定再进入一半比例；软便则停留或退回上一阶段。"),
                self._phase("9-12天", 25, 75, "逐步提高新粮比例，避免同时更换零食或罐头。"),
                self._phase("13-14天", 0, 100, "完全切换后继续观察2-3天。"),
            ]
        if plan_days == 10:
            return [
                self._phase("1-3天", 80, 20, "肠胃敏感时从更低新粮比例开始。"),
                self._phase("4-6天", 60, 40, "便便稳定再加量；软便明显则延长本阶段。"),
                self._phase("7-9天", 30, 70, "减少旧粮前确认食欲、精神和排便都稳定。"),
                self._phase("第10天", 0, 100, "完全替换后仍需持续观察。"),
            ]
        return [
            self._phase("1-2天", 75, 25, "观察便便和食欲，先不要叠加新零食。"),
            self._phase("3-4天", 50, 50, "状态稳定再进入一半比例；软便则回到上一阶段。"),
            self._phase("5-6天", 25, 75, "继续观察精神、呕吐和饮水量。"),
            self._phase("第7天", 0, 100, "完全替换后继续观察2-3天。"),
        ]

    def _phase(self, day_range: str, old_food_ratio: int, new_food_ratio: int, note: str) -> dict[str, Any]:
        return {
            "day_range": day_range,
            "old_food_ratio": old_food_ratio,
            "new_food_ratio": new_food_ratio,
            "note": note,
        }
