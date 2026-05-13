import redis.asyncio as redis
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}:{request.url.path}"

        current = await redis_client.get(key)
        if current and int(current) >= self.requests_per_minute:
            return Response(
                status_code=429,
                content='{"code":1004,"message":"Rate limited","data":null}',
                media_type="application/json",
            )

        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, 60)
        await pipe.execute()

        response = await call_next(request)
        return response
