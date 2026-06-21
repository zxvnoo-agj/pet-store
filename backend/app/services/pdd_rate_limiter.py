import asyncio
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta


class PDDRateLimitBlocked(Exception):
    """Raised when local protection pauses a PDD API family."""


@dataclass
class _BucketState:
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    last_call_at: datetime | None = None
    calls_today: int = 0
    day: date = field(default_factory=lambda: datetime.now(UTC).date())
    paused_until: datetime | None = None
    pause_reason: str | None = None


class PDDRateLimiter:
    """Small in-process guard for PDD APIs that are sensitive to account throttling."""

    RISK_MARKERS = (
        "当前duoId因大量调取商品接口但出单较少被限制使用",
        "duoid",
        "限制使用",
        "风控",
        "rate limit",
        "too many requests",
    )

    def __init__(self) -> None:
        self._buckets: dict[str, _BucketState] = {}

    def _bucket(self, api_name: str) -> _BucketState:
        if api_name not in self._buckets:
            self._buckets[api_name] = _BucketState()
        return self._buckets[api_name]

    async def wait(self, api_name: str, *, min_interval_seconds: float, daily_limit: int) -> None:
        bucket = self._bucket(api_name)
        async with bucket.lock:
            now = datetime.now(UTC)
            if bucket.day != now.date():
                bucket.day = now.date()
                bucket.calls_today = 0
                bucket.paused_until = None
                bucket.pause_reason = None

            if bucket.paused_until and bucket.paused_until > now:
                raise PDDRateLimitBlocked(bucket.pause_reason or f"{api_name} is paused")

            if daily_limit > 0 and bucket.calls_today >= daily_limit:
                bucket.paused_until = now + timedelta(days=1)
                bucket.pause_reason = f"{api_name} reached local daily limit {daily_limit}"
                raise PDDRateLimitBlocked(bucket.pause_reason)

            if bucket.last_call_at:
                elapsed = (now - bucket.last_call_at).total_seconds()
                if elapsed < min_interval_seconds:
                    await asyncio.sleep(min_interval_seconds - elapsed)

            bucket.last_call_at = datetime.now(UTC)
            bucket.calls_today += 1

    def record_failure(self, api_name: str, error: Exception | str) -> None:
        message = str(error)
        if not any(marker.lower() in message.lower() for marker in self.RISK_MARKERS):
            return

        bucket = self._bucket(api_name)
        now = datetime.now(UTC)
        bucket.paused_until = now + timedelta(hours=24)
        bucket.pause_reason = message


pdd_rate_limiter = PDDRateLimiter()
