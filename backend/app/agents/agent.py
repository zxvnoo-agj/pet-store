from collections.abc import AsyncIterator
import json

from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from app.agents.prompts import SYSTEM_PROMPT
from app.agents.tools import AgentTools
from app.core.config import settings
from app.services.answer_card_service import AnswerCardService
from app.services.assistant_memory_service import AssistantMemoryService
from app.services.assistant_observability import (
    log_card_generation,
    log_health_safety_path,
    log_tool_call,
    log_tool_error,
)

SPECIES_CN = {
    "cat": "猫", "dog": "狗", "bird": "鸟",
    "fish": "鱼", "reptile": "爬宠", "small_pet": "小宠", "other": "宠物",
}


class AIAgent:
    def __init__(self, db):
        self.db = db
        self.tools = AgentTools(db)
        api_key = settings.DEEPSEEK_API_KEY or settings.OPENAI_API_KEY
        base_url = settings.DEEPSEEK_BASE_URL if settings.DEEPSEEK_API_KEY else None
        model = settings.DEEPSEEK_MODEL or settings.OPENAI_MODEL
        self.llm = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.7,
            streaming=True,
            reasoning_effort="high",
            extra_body={"thinking": {"type": "enabled"}},
        )

    async def _build_pet_context(self, user_id: int) -> str:
        from app.models.pet import Pet
        from app.models.pet_breed import PetBreed
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        result = await self.db.execute(
            select(Pet)
            .options(selectinload(Pet.breed))
            .where(Pet.user_id == user_id)
            .order_by(Pet.created_at.asc())
        )
        pets = list(result.scalars().all())
        if not pets:
            return ""

        lines = ["## 用户宠物信息"]
        for i, pet in enumerate(pets, 1):
            parts = []
            if pet.breed:
                parts.append(f"{pet.breed.name}{SPECIES_CN.get(pet.species, pet.species)}")
            else:
                parts.append(SPECIES_CN.get(pet.species, pet.species))
            if pet.nickname:
                parts.append(f'昵称"{pet.nickname}"')
            if pet.age_months is not None:
                parts.append(f"{pet.age_months}个月大")
            if pet.weight_kg is not None:
                parts.append(f"体重{float(pet.weight_kg)}kg")
            if pet.notes:
                notes = pet.notes[:50]
                parts.append(f"备注: {notes}")
            lines.append(f"- 宠物{i}: {', '.join(parts)}")

        return "\n".join(lines)

    def _get_tools(self):
        from langchain_core.tools import StructuredTool
        return [
            StructuredTool.from_function(
                coroutine=self.tools.search_products,
                name="search_spus",
                description="Search SPUs (products) by pet type, category, brand, or price range",
            ),
            StructuredTool.from_function(
                coroutine=self.tools.get_spu_detail,
                name="get_spu_detail",
                description="Get detailed information about a specific SPU (product) by ID",
            ),
            StructuredTool.from_function(
                coroutine=self.tools.get_reviews_summary,
                name="get_reviews_summary",
                description="Get review summary for a SPU (product) including ratings and top tags",
            ),
            StructuredTool.from_function(
                coroutine=self.tools.compare_products,
                name="compare_spus",
                description="Compare multiple SPUs (products) by their IDs",
            ),
            StructuredTool.from_function(
                coroutine=self.tools.create_food_transition_plan,
                name="create_food_transition_plan",
                description=(
                    "Create a safe food transition plan. Requires old_food, new_food, and gut_status; "
                    "returns follow-up questions if any required input is missing."
                ),
            ),
        ]

    def _decode_tool_output(self, tool_result):
        if isinstance(tool_result, str):
            try:
                return json.loads(tool_result)
            except json.JSONDecodeError:
                return tool_result
        return tool_result

    def _is_health_risk_message(self, message: str) -> bool:
        risk_terms = (
            "一直吐",
            "持续吐",
            "腹泻",
            "拉稀",
            "便血",
            "尿不出",
            "抽搐",
            "呼吸困难",
            "精神沉郁",
            "中毒",
            "吞了",
            "剂量",
            "吃药",
        )
        return any(term in message for term in risk_terms)

    async def chat_stream(
        self, message: str, history: list[dict] | None = None, user_id: int | None = None
    ) -> AsyncIterator[str]:
        tools = self._get_tools()

        pet_context = ""
        if user_id is not None:
            pet_context = await self._build_pet_context(user_id)
            memory_context = await AssistantMemoryService(self.db).build_prompt_context(user_id)
            if memory_context:
                pet_context = "\n\n".join(part for part in (pet_context, memory_context) if part)

        system_prompt = SYSTEM_PROMPT.replace("{pet_context}", pet_context)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent = create_openai_tools_agent(self.llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

        chat_history = []
        if history:
            for msg in history:
                if msg["role"] == "user":
                    chat_history.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    chat_history.append(AIMessage(content=msg["content"]))

        referenced_spus = []
        tool_results = []

        if self._is_health_risk_message(message):
            log_health_safety_path("health_risk_terms_detected", user_id=user_id)

        async for event in agent_executor.astream_events(
            {"input": message, "chat_history": chat_history},
            version="v1",
        ):
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"event: message\ndata: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"
            elif event["event"] == "on_tool_start":
                tool_name = event["name"]
                tool_input = event["data"].get("input")
                log_tool_call(tool_name, "started", user_id=user_id)
                payload = {"tool": tool_name, "status": "started", "input": tool_input}
                yield f"event: tool_call\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            elif event["event"] == "on_tool_end":
                tool_name = event["name"]
                tool_result = event["data"].get("output")
                decoded_result = self._decode_tool_output(tool_result)
                tool_results.append({"tool": tool_name, "output": decoded_result})
                log_tool_call(tool_name, "completed", user_id=user_id)
                # Extract spu IDs from product-producing tool results.
                if tool_name in ("search_spus", "compare_spus", "get_spu_detail") and decoded_result:
                    try:
                        spu_list = decoded_result if isinstance(decoded_result, list) else [decoded_result]
                        for s in spu_list:
                            if isinstance(s, dict) and "id" in s:
                                referenced_spus.append(s)
                    except (json.JSONDecodeError, TypeError):
                        log_tool_error(tool_name, "failed_to_parse_spu_references", user_id=user_id)
                        pass
                payload = {"tool": tool_name, "status": "completed"}
                yield f"event: tool_result\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

        cards = AnswerCardService().build_cards(message, tool_results)
        card_payloads = [card.model_dump(mode="json") for card in cards]
        log_card_generation(card_payloads, user_id=user_id)
        if card_payloads:
            yield f"event: answer_cards\ndata: {json.dumps({'cards': card_payloads}, ensure_ascii=False)}\n\n"

        # Send referenced spus as a final event
        if referenced_spus:
            yield f"event: spus\ndata: {json.dumps({'spus': referenced_spus}, ensure_ascii=False)}\n\n"

        yield "event: done\ndata: {\"status\": \"completed\"}\n\n"
