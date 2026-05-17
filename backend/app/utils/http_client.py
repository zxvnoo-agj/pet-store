import asyncio
from typing import Optional

import aiohttp
from aiohttp import ClientTimeout, ContentTypeError
from loguru import logger


class HttpClient:
    def __init__(
        self,
        base_url: str = "",
        timeout: int = 30,
        max_retries: int = 3,
        base_delay: float = 2.0,
        rate_limit: Optional[float] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = ClientTimeout(total=timeout)
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.rate_limit = rate_limit
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_request_time: float = 0.0

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=self.timeout,
                headers={"User-Agent": "PetStore/1.0"},
            )
        return self._session

    async def _enforce_rate_limit(self):
        if self.rate_limit and self._last_request_time > 0:
            elapsed = asyncio.get_event_loop().time() - self._last_request_time
            if elapsed < self.rate_limit:
                await asyncio.sleep(self.rate_limit - elapsed)

    async def request(
        self,
        method: str,
        path: str,
        retry_on_status: tuple[int, ...] = (429, 500, 502, 503, 504),
        **kwargs,
    ) -> aiohttp.ClientResponse:
        url = path if path.startswith("http") else f"{self.base_url}/{path.lstrip('/')}"
        last_exc = None

        for attempt in range(self.max_retries):
            try:
                await self._enforce_rate_limit()
                session = await self._get_session()
                self._last_request_time = asyncio.get_event_loop().time()
                async with session.request(method, url, **kwargs) as response:
                    if response.status in retry_on_status and attempt < self.max_retries - 1:
                        delay = self.base_delay * (2 ** attempt)
                        logger.warning(
                            "Request failed with status {status}, retrying in {delay}s (attempt {attempt}/{max})",
                            status=response.status, delay=delay, attempt=attempt + 1, max=self.max_retries,
                            extra={"url": url, "status": response.status},
                        )
                        await asyncio.sleep(delay)
                        continue
                    await response.read()
                    return response
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                last_exc = exc
                if attempt < self.max_retries - 1:
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(
                        "Request error: {error}, retrying in {delay}s (attempt {attempt}/{max})",
                        error=str(exc), delay=delay, attempt=attempt + 1, max=self.max_retries,
                    )
                    await asyncio.sleep(delay)
                    continue
                raise

        raise last_exc or RuntimeError(f"Request failed after {self.max_retries} retries")

    async def get(self, path: str, **kwargs) -> aiohttp.ClientResponse:
        return await self.request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs) -> aiohttp.ClientResponse:
        return await self.request("POST", path, **kwargs)

    async def get_json(self, path: str, **kwargs) -> dict:
        resp = await self.get(path, **kwargs)
        try:
            return await resp.json()
        except ContentTypeError:
            logger.error("Response is not JSON", extra={"url": path, "status": resp.status})
            raise

    async def post_json(self, path: str, json: dict, **kwargs) -> dict:
        resp = await self.post(path, json=json, **kwargs)
        try:
            return await resp.json()
        except ContentTypeError:
            logger.error("Response is not JSON", extra={"url": path, "status": resp.status})
            raise

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self):
        await self._get_session()
        return self

    async def __aexit__(self, *args):
        await self.close()
