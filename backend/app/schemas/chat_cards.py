from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class AnswerCardType(StrEnum):
    SPU = "spu"
    COMPARISON = "comparison"
    RECOMMENDATION_LIST = "recommendation_list"
    INGREDIENT_INSIGHT = "ingredient_insight"
    FOLLOW_UP = "follow_up"
    FOOD_TRANSITION_PLAN = "food_transition_plan"


class CardItem(BaseModel):
    spu_id: int | None = None
    brand: str | None = None
    name: str
    pet_type: str | None = None
    category: str | None = None
    price_range: str | None = None
    image_url: str | None = None
    reason: str | None = None
    pros: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)


class SpuCardPayload(BaseModel):
    spu_id: int
    brand: str
    name: str
    pet_type: str | None = None
    category: str | None = None
    price_range: str | None = None
    pros: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)
    image_url: str | None = None
    detail_url: str


class ComparisonCardPayload(BaseModel):
    items: list[CardItem] = Field(min_length=2)
    dimensions: list[str] = Field(default_factory=list)
    recommendation: str


class RecommendationListCardPayload(BaseModel):
    items: list[CardItem] = Field(min_length=1)
    ranking_reason: str
    filters_applied: list[str] = Field(default_factory=list)


class IngredientInsightCardPayload(BaseModel):
    subject: str
    meaning: str
    benefits: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)
    suitable_for: list[str] = Field(default_factory=list)


class FollowUpCardPayload(BaseModel):
    questions: list[str] = Field(min_length=1)
    reason: str


class FoodTransitionPhase(BaseModel):
    day_range: str
    old_food_ratio: int
    new_food_ratio: int
    note: str


class FoodTransitionPlanCardPayload(BaseModel):
    phases: list[FoodTransitionPhase] = Field(default_factory=list)
    observe: list[str] = Field(default_factory=list)
    stop_conditions: list[str] = Field(default_factory=list)
    vet_disclaimer: str


class SpuAnswerCard(BaseModel):
    card_id: str
    card_type: Literal[AnswerCardType.SPU] = AnswerCardType.SPU
    title: str
    payload: SpuCardPayload
    source: str | None = None


class ComparisonAnswerCard(BaseModel):
    card_id: str
    card_type: Literal[AnswerCardType.COMPARISON] = AnswerCardType.COMPARISON
    title: str
    payload: ComparisonCardPayload
    source: str | None = None


class RecommendationListAnswerCard(BaseModel):
    card_id: str
    card_type: Literal[AnswerCardType.RECOMMENDATION_LIST] = AnswerCardType.RECOMMENDATION_LIST
    title: str
    payload: RecommendationListCardPayload
    source: str | None = None


class IngredientInsightAnswerCard(BaseModel):
    card_id: str
    card_type: Literal[AnswerCardType.INGREDIENT_INSIGHT] = AnswerCardType.INGREDIENT_INSIGHT
    title: str
    payload: IngredientInsightCardPayload
    source: str | None = None


class FollowUpAnswerCard(BaseModel):
    card_id: str
    card_type: Literal[AnswerCardType.FOLLOW_UP] = AnswerCardType.FOLLOW_UP
    title: str
    payload: FollowUpCardPayload
    source: str | None = None


class FoodTransitionPlanAnswerCard(BaseModel):
    card_id: str
    card_type: Literal[AnswerCardType.FOOD_TRANSITION_PLAN] = AnswerCardType.FOOD_TRANSITION_PLAN
    title: str
    payload: FoodTransitionPlanCardPayload
    source: str | None = None


AnswerCard = Annotated[
    SpuAnswerCard
    | ComparisonAnswerCard
    | RecommendationListAnswerCard
    | IngredientInsightAnswerCard
    | FollowUpAnswerCard
    | FoodTransitionPlanAnswerCard,
    Field(discriminator="card_type"),
]


class AnswerCardsEvent(BaseModel):
    cards: list[AnswerCard] = Field(default_factory=list)
