import json
from typing import Any, Optional

from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings


class QwenVLClient:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL,
        )
        self.model = "qwen-vl-plus"

    async def analyze_ingredient_image(self, image_url: str) -> dict[str, Any]:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是一个宠物食品成分分析专家。分析图片内容，返回JSON格式结果。\n"
                            "如果是成分表（原料组成），返回：{\"type\": \"成分表\", \"ingredients\": [\"原料1\", \"原料2\", ...]}\n"
                            "如果是营养分析表（保证分析值），返回：{\"type\": \"营养表\", \"nutrition\": {\"粗蛋白\": \"≥32%\", \"粗脂肪\": \"≥15%\", ...}}\n"
                            "如果都不是，返回：{\"type\": \"其他\"}\n"
                            "只返回JSON，不要其他文字。"
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": image_url}},
                        ],
                    },
                ],
                temperature=0.1,
                max_tokens=1000,
            )
            content = response.choices[0].message.content or ""
            content = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            result = json.loads(content)
            logger.info(f"[vision] Analyzed {image_url[:60]}... → type={result.get('type', 'unknown')}")
            return result
        except json.JSONDecodeError as e:
            logger.warning(f"[vision] JSON parse failed for {image_url[:60]}...: {e}, raw={content[:200]}")
            return {"type": "其他"}
        except Exception as e:
            logger.error(f"[vision] API error for {image_url[:60]}...: {type(e).__name__}: {e}")
            return {"type": "其他"}

    async def batch_analyze(self, image_urls: list[str]) -> dict[str, Any]:
        ingredients = []
        nutrition = {}

        for url in image_urls:
            result = await self.analyze_ingredient_image(url)
            if result.get("type") == "成分表":
                ingredients.extend(result.get("ingredients", []))
            elif result.get("type") == "营养表":
                nutrition.update(result.get("nutrition", {}))

        return {
            "ingredients": list(dict.fromkeys(ingredients)),
            "nutrition": nutrition,
        }
