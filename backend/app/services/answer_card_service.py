from typing import Any

from app.schemas.chat_cards import (
    AnswerCard,
    AnswerCardType,
    CardItem,
    ComparisonAnswerCard,
    ComparisonCardPayload,
    FollowUpAnswerCard,
    FollowUpCardPayload,
    FoodTransitionPlanAnswerCard,
    FoodTransitionPlanCardPayload,
    IngredientInsightAnswerCard,
    IngredientInsightCardPayload,
    RecommendationListAnswerCard,
    RecommendationListCardPayload,
    SpuAnswerCard,
    SpuCardPayload,
)


PRODUCT_INTENT_TERMS = (
    "推荐",
    "买",
    "选",
    "哪个",
    "哪款",
    "对比",
    "比较",
    "猫粮",
    "狗粮",
    "用品",
    "价格",
    "预算",
    "成分",
    "配方",
)
INGREDIENT_TERMS = ("成分", "配方", "鸡肉粉", "肉粉", "谷物", "蛋白", "脂肪", "牛磺酸", "营养")


class AnswerCardService:
    def build_cards(self, message: str, tool_results: list[dict[str, Any]]) -> list[AnswerCard]:
        cards: list[AnswerCard] = []
        normalized_message = message.lower()

        for result in tool_results:
            tool = result.get("tool")
            output = result.get("output")

            if tool == "compare_spus":
                products = self._as_product_list(output)
                if len(products) >= 2:
                    cards.append(self._comparison_card(products))
                    continue

            if tool == "create_food_transition_plan" and isinstance(output, dict):
                if output.get("status") == "ready":
                    cards.append(self._food_transition_card(output))
                elif output.get("status") == "needs_input":
                    cards.append(self._follow_up_card(output.get("questions"), output.get("reason")))
                continue

            if tool == "search_spus":
                products = self._as_product_list(output)
                if len(products) >= 2:
                    cards.append(self._recommendation_card(products))
                elif len(products) == 1:
                    cards.append(self._spu_card(products[0], "card_spu_1", source=tool))
                elif self._looks_like_product_intent(message):
                    cards.append(self._follow_up_card())
                continue

            if tool == "get_spu_detail" and isinstance(output, dict) and output:
                cards.append(self._spu_card(output, f"card_spu_{output.get('id', 1)}", source=tool))
                if any(term in normalized_message for term in INGREDIENT_TERMS):
                    cards.append(self._ingredient_card(output))

        if not cards and self._looks_like_product_intent(message):
            cards.append(self._follow_up_card())

        return cards[:3]

    def _looks_like_product_intent(self, message: str) -> bool:
        return any(term in message for term in PRODUCT_INTENT_TERMS)

    def _as_product_list(self, value: Any) -> list[dict[str, Any]]:
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            items = value.get("items") or value.get("spus") or value.get("products")
            if isinstance(items, list):
                return [item for item in items if isinstance(item, dict)]
        return []

    def _price_range(self, product: dict[str, Any]) -> str | None:
        price_min = product.get("price_min")
        price_max = product.get("price_max")
        if price_min is None and price_max is None:
            return None
        if price_min is not None and (price_max is None or price_min == price_max):
            return f"¥{price_min}"
        if price_min is None:
            return f"¥{price_max}"
        return f"¥{price_min}-¥{price_max}"

    def _card_item(self, product: dict[str, Any], reason: str | None = None) -> CardItem:
        pros = list(product.get("pros") or [])[:2]
        cautions = list(product.get("cons") or product.get("cautions") or [])[:2]
        return CardItem(
            spu_id=product.get("id") or product.get("spu_id"),
            brand=product.get("brand"),
            name=product.get("name") or product.get("model") or "未知商品",
            pet_type=product.get("pet_type"),
            category=product.get("category") or product.get("category_name"),
            price_range=self._price_range(product),
            image_url=(product.get("image_urls") or [None])[0],
            reason=reason or (pros[0] if pros else None),
            pros=pros,
            cautions=cautions,
        )

    def _spu_card(self, product: dict[str, Any], card_id: str, source: str) -> SpuAnswerCard:
        spu_id = product.get("id") or product.get("spu_id")
        pros = list(product.get("pros") or [])[:3]
        cautions = list(product.get("cons") or product.get("cautions") or [])[:3]
        return SpuAnswerCard(
            card_id=card_id,
            title=f"{product.get('brand', '')} {product.get('name', '商品')}".strip(),
            payload=SpuCardPayload(
                spu_id=int(spu_id),
                brand=product.get("brand") or "",
                name=product.get("name") or "商品",
                pet_type=product.get("pet_type"),
                category=product.get("category") or product.get("category_name"),
                price_range=self._price_range(product),
                pros=pros,
                cautions=cautions,
                image_url=(product.get("image_urls") or [None])[0],
                detail_url=f"/pages/product/detail?id={spu_id}",
            ),
            source=source,
        )

    def _comparison_card(self, products: list[dict[str, Any]]) -> ComparisonAnswerCard:
        items = [self._card_item(product) for product in products[:4]]
        recommendation = "优先看适用宠物、预算、核心优点和注意事项；肠胃敏感时先选小包装试吃。"
        return ComparisonAnswerCard(
            card_id="card_compare_1",
            title="商品对比",
            payload=ComparisonCardPayload(
                items=items,
                dimensions=["适用宠物", "分类", "价格", "优点", "注意事项"],
                recommendation=recommendation,
            ),
            source="compare_spus",
        )

    def _recommendation_card(self, products: list[dict[str, Any]]) -> RecommendationListAnswerCard:
        items = [self._card_item(product, reason=(product.get("pros") or ["匹配当前需求"])[0]) for product in products[:5]]
        filters = sorted({
            value
            for product in products
            for value in (product.get("pet_type"), product.get("category"), product.get("brand"))
            if value
        })
        return RecommendationListAnswerCard(
            card_id="card_list_1",
            title="候选商品",
            payload=RecommendationListCardPayload(
                items=items,
                ranking_reason="按匹配条件、价格信息和商品资料完整度综合整理",
                filters_applied=filters[:5],
            ),
            source="search_spus",
        )

    def _ingredient_card(self, product: dict[str, Any]) -> IngredientInsightAnswerCard:
        ingredients = [str(item) for item in (product.get("ingredients") or [])[:4]]
        nutrition = product.get("nutrition") or {}
        subject = "、".join(ingredients[:2]) if ingredients else "配方与营养"
        benefits = ingredients[:3] or ["可结合完整配方和营养指标判断"]
        cautions = list(product.get("cons") or [])[:2] or ["单一成分不能代表整体适配度，需结合年龄、体况和耐受情况"]
        if nutrition:
            benefits.append("已提供部分营养指标，可进一步结合蛋白、脂肪等数值判断")
        return IngredientInsightAnswerCard(
            card_id=f"card_ingredient_{product.get('id', 1)}",
            title="成分解读",
            payload=IngredientInsightCardPayload(
                subject=subject,
                meaning="这些信息用于判断蛋白来源、能量密度和潜在耐受风险。",
                benefits=benefits[:4],
                cautions=cautions[:4],
                suitable_for=[product.get("pet_type")] if product.get("pet_type") else [],
            ),
            source="get_spu_detail",
        )

    def _follow_up_card(self, questions: list[str] | None = None, reason: str | None = None) -> FollowUpAnswerCard:
        return FollowUpAnswerCard(
            card_id="card_follow_up_1",
            title="补充一下需求",
            payload=FollowUpCardPayload(
                questions=questions or [
                    "是猫还是狗？年龄或阶段是幼年、成年还是老年？",
                    "预算范围大概是多少？是否有品牌偏好或需要避开的成分？",
                    "宠物最近有没有软便、过敏、挑食或体重管理需求？",
                ],
                reason=reason or "商品推荐需要宠物类型、阶段、预算和耐受情况，信息越完整越不容易推荐偏。",
            ),
            source="assistant",
        )

    def _food_transition_card(self, output: dict[str, Any]) -> FoodTransitionPlanAnswerCard:
        return FoodTransitionPlanAnswerCard(
            card_id="card_food_transition_1",
            title=output.get("title") or "换粮计划",
            payload=FoodTransitionPlanCardPayload(
                phases=output.get("phases") or [],
                observe=output.get("observe") or [],
                stop_conditions=output.get("stop_conditions") or [],
                vet_disclaimer=output.get("vet_disclaimer") or "如出现持续异常，请及时咨询兽医。",
            ),
            source="create_food_transition_plan",
        )
