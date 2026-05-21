import json
from typing import Any

from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings


class SpuAIExtractor:
    """AI-powered extraction service for SPU detail fields."""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL,
        )
        self.vision_model = "qwen-vl-plus"
        self.text_model = settings.DASHSCOPE_MODEL or "qwen-turbo"

    async def parse_ingredients_from_image(self, image_base64: str) -> list[str]:
        """Extract ingredient list from a product image using vision LLM."""
        try:
            response = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是一个宠物食品成分分析专家。仔细查看图片中的成分表（原料组成），"
                            "提取所有成分并返回JSON格式。"
                            "\n返回格式: {\"ingredients\": [\"原料1\", \"原料2\", ...]}"
                            "\n要求："
                            "\n1. 按成分表中的顺序提取"
                            "\n2. 保留原始名称（如'脱水鸡肉'不要简化为'鸡肉'）"
                            "\n3. 去除百分比和数字"
                            "\n4. 只返回JSON，不要其他文字"
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": image_base64}},
                        ],
                    },
                ],
                temperature=0.1,
                max_tokens=1000,
            )
            content = response.choices[0].message.content or ""
            content = (
                content.strip()
                .removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
            result = json.loads(content)
            ingredients = result.get("ingredients", [])
            logger.info(f"[spu-ai] Parsed {len(ingredients)} ingredients from image")
            return ingredients
        except Exception as e:
            logger.error(f"[spu-ai] Failed to parse ingredients from image: {e}")
            return []

    async def parse_nutrition_from_image(self, image_base64: str) -> dict[str, str]:
        """Extract nutrition facts from a product image using vision LLM."""
        try:
            response = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是一个宠物食品营养分析专家。仔细查看图片中的营养分析表（保证分析值/营养成分），"
                            "提取所有营养指标并返回JSON格式。"
                            "\n返回格式: {\"nutrition\": {\"粗蛋白\": \"≥32%\", \"粗脂肪\": \"≥15%\", ...}}"
                            "\n要求："
                            "\n1. 保留原始指标名称和单位"
                            "\n2. 包括常见的：粗蛋白、粗脂肪、粗纤维、粗灰分、水分、钙、磷、牛磺酸等"
                            "\n3. 只返回JSON，不要其他文字"
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": image_base64}},
                        ],
                    },
                ],
                temperature=0.1,
                max_tokens=1000,
            )
            content = response.choices[0].message.content or ""
            content = (
                content.strip()
                .removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
            result = json.loads(content)
            nutrition = result.get("nutrition", {})
            logger.info(f"[spu-ai] Parsed {len(nutrition)} nutrition items from image")
            return nutrition
        except Exception as e:
            logger.error(f"[spu-ai] Failed to parse nutrition from image: {e}")
            return {}

    async def parse_nutrition_from_text(self, text: str) -> dict[str, str]:
        """Convert text description to structured nutrition JSON using LLM."""
        try:
            response = await self.client.chat.completions.create(
                model=self.text_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是一个宠物食品营养数据转换专家。将用户提供的营养成分描述转换为标准JSON格式。"
                            "\n返回格式: {\"nutrition\": {\"粗蛋白\": \"≥32%\", \"粗脂肪\": \"≥15%\", ...}}"
                            "\n要求："
                            "\n1. 识别所有营养指标名称和数值"
                            "\n2. 标准化指标名称（如'蛋白质'转为'粗蛋白'）"
                            "\n3. 保留原始数值和单位"
                            "\n4. 只返回JSON，不要其他文字"
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"请将以下营养成分转换为JSON格式：\n\n{text}",
                    },
                ],
                temperature=0.1,
                max_tokens=1000,
            )
            content = response.choices[0].message.content or ""
            content = (
                content.strip()
                .removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
            result = json.loads(content)
            nutrition = result.get("nutrition", {})
            logger.info(f"[spu-ai] Converted text to {len(nutrition)} nutrition items")
            return nutrition
        except Exception as e:
            logger.error(f"[spu-ai] Failed to parse nutrition from text: {e}")
            return {}

    async def generate_pros_cons(
        self, ingredients: list[str], nutrition: dict[str, str]
    ) -> dict[str, list[str]]:
        """Generate pros and cons from ingredients and nutrition using LLM."""
        try:
            ingredients_text = "\n".join([f"- {i}" for i in ingredients])
            nutrition_text = "\n".join([f"- {k}: {v}" for k, v in nutrition.items()])

            response = await self.client.chat.completions.create(
                model=self.text_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是一个宠物食品评价专家。根据提供的成分和营养数据，分析该产品的优缺点。"
                            "\n返回格式: {\"pros\": [\"优点1\", \"优点2\", ...], \"cons\": [\"缺点1\", \"缺点2\", ...]}"
                            "\n要求："
                            "\n1. 优点和缺点各3-6条"
                            "\n2. 基于具体成分和营养数据，不要泛泛而谈"
                            "\n3. 语言简洁，每条不超过20字"
                            "\n4. 只返回JSON，不要其他文字"
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"成分列表：\n{ingredients_text}\n\n"
                            f"营养成分：\n{nutrition_text}\n\n"
                            f"请分析该宠物食品的优缺点："
                        ),
                    },
                ],
                temperature=0.3,
                max_tokens=1000,
            )
            content = response.choices[0].message.content or ""
            content = (
                content.strip()
                .removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
            result = json.loads(content)
            pros = result.get("pros", [])
            cons = result.get("cons", [])
            logger.info(f"[spu-ai] Generated {len(pros)} pros and {len(cons)} cons")
            return {"pros": pros, "cons": cons}
        except Exception as e:
            logger.error(f"[spu-ai] Failed to generate pros/cons: {e}")
            return {"pros": [], "cons": []}


# Singleton instance
spu_ai_extractor = SpuAIExtractor()
