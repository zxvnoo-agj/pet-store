import json
from typing import Any

import redis.asyncio as redis

from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


class Cache:
    @staticmethod
    async def get(key: str) -> Any | None:
        value = await redis_client.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    @staticmethod
    async def set(key: str, value: Any, expire: int = 300):
        await redis_client.set(key, json.dumps(value), ex=expire)

    @staticmethod
    async def delete(key: str):
        await redis_client.delete(key)

    @staticmethod
    async def delete_pattern(pattern: str):
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)


cache = Cache()
