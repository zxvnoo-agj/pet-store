from typing import AsyncIterator, List, Optional
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.core.config import settings
from app.agents.prompts import SYSTEM_PROMPT
from app.agents.tools import AgentTools
from app.agents.streaming import stream_response


class AIAgent:
    def __init__(self, db):
        self.db = db
        self.tools = AgentTools(db)
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

    async def chat_stream(self, message: str, history: Optional[List[dict]] = None) -> AsyncIterator[str]:
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
        
        async for event in agent_executor.astream_events(
            {"input": message, "chat_history": chat_history},
            version="v1",
        ):
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {content}\n\n"
            elif event["event"] == "on_tool_start":
                tool_name = event["name"]
                yield f"event: tool_call\ndata: {{\"tool\": \"{tool_name}\", \"status\": \"started\"}}\n\n"
            elif event["event"] == "on_tool_end":
                tool_name = event["name"]
                yield f"event: tool_result\ndata: {{\"tool\": \"{tool_name}\", \"status\": \"completed\"}}\n\n"
        
        yield "event: done\ndata: {\"status\": \"completed\"}\n\n"
