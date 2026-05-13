from collections.abc import AsyncIterator

from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from app.agents.prompts import SYSTEM_PROMPT
from app.agents.tools import AgentTools
from app.core.config import settings


class AIAgent:
    def __init__(self, db):
        self.db = db
        self.tools = AgentTools(db)
        # Use DashScope (Aliyun) if API key is configured, otherwise fallback to OpenAI
        if settings.DASHSCOPE_API_KEY:
            self.llm = ChatOpenAI(
                model=settings.DASHSCOPE_MODEL,
                api_key=settings.DASHSCOPE_API_KEY,
                base_url=settings.DASHSCOPE_BASE_URL,
                temperature=0.7,
                streaming=True,
            )
        else:
            self.llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.7,
                streaming=True,
            )

    def _get_tools(self):
        from langchain_core.tools import StructuredTool
        return [
            StructuredTool.from_function(
                coroutine=self.tools.search_products,
                name="search_products",
                description="Search products by pet type, category, brand, or price range",
            ),
            StructuredTool.from_function(
                coroutine=self.tools.get_product_detail,
                name="get_product_detail",
                description="Get detailed information about a specific product by ID",
            ),
            StructuredTool.from_function(
                coroutine=self.tools.get_reviews_summary,
                name="get_reviews_summary",
                description="Get review summary for a product including ratings and top tags",
            ),
            StructuredTool.from_function(
                coroutine=self.tools.compare_products,
                name="compare_products",
                description="Compare multiple products by their IDs",
            ),
        ]

    async def chat_stream(self, message: str, history: list[dict] | None = None) -> AsyncIterator[str]:
        tools = self._get_tools()

        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
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

        referenced_products = []

        async for event in agent_executor.astream_events(
            {"input": message, "chat_history": chat_history},
            version="v1",
        ):
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    import json
                    yield f"event: message\ndata: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"
            elif event["event"] == "on_tool_start":
                tool_name = event["name"]
                yield f"event: tool_call\ndata: {{\"tool\": \"{tool_name}\", \"status\": \"started\"}}\n\n"
            elif event["event"] == "on_tool_end":
                tool_name = event["name"]
                tool_result = event["data"].get("output")
                # Extract product IDs from search_products and compare_products results
                if tool_name in ("search_products", "compare_products") and tool_result:
                    import json
                    try:
                        products = tool_result if isinstance(tool_result, list) else json.loads(tool_result)
                        for p in products:
                            if isinstance(p, dict) and "id" in p:
                                referenced_products.append(p)
                    except (json.JSONDecodeError, TypeError):
                        pass
                yield f"event: tool_result\ndata: {{\"tool\": \"{tool_name}\", \"status\": \"completed\"}}\n\n"

        # Send referenced products as a final event
        if referenced_products:
            import json
            yield f"event: products\ndata: {json.dumps({'products': referenced_products}, ensure_ascii=False)}\n\n"

        yield "event: done\ndata: {\"status\": \"completed\"}\n\n"
