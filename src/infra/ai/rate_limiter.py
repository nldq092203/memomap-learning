"""AI rate limiting using Redis."""

from __future__ import annotations
import time
import typing

from src.config import Config
from src.extensions import logger
from src.infra.cache import get_redis_client


class AIRateLimiter:
    """Redis-backed rate limiter for AI calls."""

    USER_PER_MINUTE: int = int(getattr(Config, "AI_RATE_USER_PER_MINUTE", 10))
    USER_PER_DAY: int = int(getattr(Config, "AI_RATE_USER_PER_DAY", 500))
    GLOBAL_PER_MINUTE: int = int(getattr(Config, "AI_RATE_GLOBAL_PER_MINUTE", 200))

    def __init__(self) -> None:
        self._redis = get_redis_client()

    def _incr_with_ttl(self, key: str, ttl_seconds: int) -> int | None:
        count = self._redis.incr(key)
        if count is None:
            return None
        if count == 1:
            self._redis.expire(key, ttl_seconds)
        return count

    def check(self, subject_id: str | None) -> tuple[bool, dict | None]:
        """
        Check all rate limits.
        Returns (True, None) if allowed, (False, info) if exceeded.
        """
        now = int(time.time())
        minute_bucket = now // 60
        day_bucket = time.strftime("%Y%m%d", time.gmtime(now))

        # Global per-minute
        if self.GLOBAL_PER_MINUTE > 0:
            g_key = f"ai:rl:global:m:{minute_bucket}"
            g_count = self._incr_with_ttl(g_key, ttl_seconds=120)
            if g_count is not None and g_count > self.GLOBAL_PER_MINUTE:
                return False, {
                    "scope": "global_minute",
                    "limit": self.GLOBAL_PER_MINUTE,
                    "retry_after": max(self._redis.ttl(g_key), 0),
                }

        # Per-user limits
        if subject_id:
            if self.USER_PER_MINUTE > 0:
                u_min_key = f"ai:rl:user:{subject_id}:m:{minute_bucket}"
                u_min_count = self._incr_with_ttl(u_min_key, ttl_seconds=120)
                if u_min_count is not None and u_min_count > self.USER_PER_MINUTE:
                    return False, {
                        "scope": "user_minute",
                        "limit": self.USER_PER_MINUTE,
                        "retry_after": max(self._redis.ttl(u_min_key), 0),
                    }

            if self.USER_PER_DAY > 0:
                u_day_key = f"ai:rl:user:{subject_id}:d:{day_bucket}"
                u_day_count = self._incr_with_ttl(u_day_key, ttl_seconds=2 * 86400)
                if u_day_count is not None and u_day_count > self.USER_PER_DAY:
                    return False, {
                        "scope": "user_day",
                        "limit": self.USER_PER_DAY,
                        "retry_after": max(self._redis.ttl(u_day_key), 0),
                    }

        return True, None


def enforce_ai_rate_limit(subject_id: str | None) -> dict[str, typing.Any] | None:
    """
    Enforce AI rate limiting.
    Returns None if allowed, or info dict if exceeded.
    """
    limiter = AIRateLimiter()
    try:
        allowed, info = limiter.check(subject_id)
        if not allowed and info:
            logger.warning(
                f"[AI-RATE-LIMIT] scope={info.get('scope')} subject={subject_id}"
            )
            return info
    except Exception as e:
        logger.error(f"[AI-RATE-LIMIT] Error: {e}")
    return None

