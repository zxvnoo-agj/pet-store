import json

from loguru import logger
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.utils.cache import cache

CACHE_PREFIX = "suggested_questions:"
CACHE_TTL = 86400  # 24 hours

DEFAULT_QUESTIONS = [
    "3个月幼猫推荐什么猫粮？",
    "皇家和渴望哪个好？",
    "200元预算推荐",
    "猫咪软便怎么办？",
]

AI_QUESTIONS_FALLBACK = [
    "幼猫吃什么猫粮好？",
    "狗狗驱虫多久一次？",
    "推荐性价比高的猫砂",
    "宠物疫苗什么时候打？",
]

QUESTIONS_GENERATION_PROMPT = """你是一个宠物用品小程序的推荐问题生成助手。
用户的宠物信息如下：
{pet_descriptions}

请根据用户的宠物信息生成3-5个用户可能会问的自然语言问题，问题应与宠物用品或护理相关。
请仅输出一个JSON字符串数组。

示例：["3个月英短适合什么猫粮？", "英短幼猫每天喂食量是多少？"]"""


async def invalidate_cache(user_id: int):
    await cache.delete(f"{CACHE_PREFIX}{user_id}")


def _get_llm():
    if settings.DASHSCOPE_API_KEY:
        return ChatOpenAI(
            model=settings.DASHSCOPE_MODEL,
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL,
            temperature=0.7,
        )
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
    )


def _format_pet_descriptions(pets) -> str:
    if not pets:
        return "用户暂无宠物信息"
    lines = []
    for i, pet in enumerate(pets, 1):
        parts = []
        if pet.breed and pet.breed.name:
            parts.append(f"{pet.breed.name}{species_cn(pet.species)}")
        else:
            parts.append(species_cn(pet.species))
        if pet.nickname:
            parts.append(f'昵称"{pet.nickname}"')
        if pet.age_months is not None:
            parts.append(f"{pet.age_months}个月大")
        if pet.weight_kg is not None:
            parts.append(f"体重{float(pet.weight_kg)}kg")
        lines.append(f"- 宠物{i}: {', '.join(parts)}")
    return "\n".join(lines)


def species_cn(species: str) -> str:
    return {
        "cat": "猫", "dog": "狗", "bird": "鸟",
        "fish": "鱼", "reptile": "爬宠", "small_pet": "小宠", "other": "宠物",
    }.get(species, species)


async def get_questions(user_id: int | None, pets) -> tuple[list[str], str]:
    if not pets:
        return list(DEFAULT_QUESTIONS), "default"

    if user_id is not None:
        try:
            cached = await cache.get(f"{CACHE_PREFIX}{user_id}")
            if cached is not None and isinstance(cached, list):
                return cached, "cache"
        except Exception:
            logger.debug("Failed to read suggested questions cache")

    try:
        llm = _get_llm()
        pet_descriptions = _format_pet_descriptions(pets)
        prompt = QUESTIONS_GENERATION_PROMPT.format(pet_descriptions=pet_descriptions)
        messages = [
            SystemMessage(content="你是一个专业的宠物用品助手。请根据用户宠物信息生成推荐问题。"),
            HumanMessage(content=prompt),
        ]
        response = await llm.ainvoke(messages)
        questions = json.loads(response.content.strip())

        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("Invalid LLM response format")

        questions = [str(q) for q in questions[:5]]

        if user_id is not None:
            try:
                await cache.set(f"{CACHE_PREFIX}{user_id}", questions, expire=CACHE_TTL)
            except Exception:
                logger.debug("Failed to cache suggested questions")

        return questions, "ai"

    except Exception as e:
        logger.warning(f"Failed to generate suggested questions: {e}")
        return list(AI_QUESTIONS_FALLBACK), "default"
