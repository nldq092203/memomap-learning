"""Redis client with connection pooling."""

from __future__ import annotations
from functools import wraps
import json
import time
import typing

import redis
from redis.connection import BlockingConnectionPool, ConnectionPool
from redis.exceptions import RedisError

from src.config import Config
from src.extensions import logger


class RedisClient:
    """
    Singleton Redis client with connection pooling.
    Provides methods for common operations with JSON serialization.
    """

    _instance: RedisClient | None = None
    _pool: ConnectionPool | None = None
    _client: redis.Redis | None = None
    _test_client: typing.Any | None = None
    _disabled_until: float = 0.0

    def __new__(cls) -> RedisClient:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if self._pool is None and self._test_client is None and Config.REDIS_ENABLED:
            self._initialize_pool()

    def _initialize_pool(self) -> None:
        """Initialize Redis connection pool."""
        try:
            pool_cls: type[ConnectionPool]
            if Config.REDIS_POOL_BLOCKING:
                pool_cls = BlockingConnectionPool
            else:
                pool_cls = ConnectionPool

            pool_kwargs = {
                "max_connections": Config.REDIS_MAX_CONNECTIONS,
                "decode_responses": True,
                "socket_connect_timeout": Config.REDIS_SOCKET_CONNECT_TIMEOUT,
                "socket_timeout": Config.REDIS_SOCKET_TIMEOUT,
                "socket_keepalive": Config.REDIS_SOCKET_KEEPALIVE,
                "health_check_interval": Config.REDIS_HEALTH_CHECK_INTERVAL,
                "retry_on_timeout": Config.REDIS_RETRY_ON_TIMEOUT,
            }
            if Config.REDIS_POOL_BLOCKING:
                pool_kwargs["timeout"] = Config.REDIS_POOL_BLOCKING_TIMEOUT

            if Config.REDIS_URL:
                self._pool = pool_cls.from_url(
                    Config.REDIS_URL,
                    **pool_kwargs,
                )
                logger.info("[Redis] Pool initialized from URL")
            else:
                self._pool = pool_cls(
                    host=Config.REDIS_HOST,
                    port=Config.REDIS_PORT,
                    db=Config.REDIS_DB,
                    password=Config.REDIS_PASSWORD,
                    ssl=Config.REDIS_SSL,
                    **pool_kwargs,
                )
                logger.info(
                    f"[Redis] Pool initialized: {Config.REDIS_HOST}:{Config.REDIS_PORT}"
                )
        except Exception as e:
            logger.error(f"[Redis] Failed to initialize pool: {e}")
            raise

    def set_test_client(self, fake_client: typing.Any) -> None:
        """Inject a fake Redis client for tests."""
        self._test_client = fake_client
        self._client = None

    @property
    def enabled(self) -> bool:
        """Whether Redis operations should be attempted."""
        if self._test_client is not None:
            return True
        if not Config.REDIS_ENABLED:
            return False
        return time.time() >= float(self._disabled_until)

    def _trip(self, err: RedisError) -> None:
        until = time.time() + int(Config.REDIS_DISABLE_SECONDS)
        if until > float(self._disabled_until):
            self._disabled_until = until
            logger.warning(
                "[Redis] Disabled for {}s after error: {}",
                Config.REDIS_DISABLE_SECONDS,
                err,
            )

    @property
    def client(self) -> redis.Redis:
        """Get Redis client from pool."""
        if self._test_client is not None:
            return self._test_client
        if not Config.REDIS_ENABLED:
            raise RedisError("Redis is disabled (REDIS_ENABLED=false)")
        if self._pool is None:
            self._initialize_pool()
        if self._client is None:
            self._client = redis.Redis(connection_pool=self._pool)
        return self._client

    def ping(self) -> bool:
        """Check if Redis connection is alive."""
        if not self.enabled:
            return False
        try:
            return self.client.ping()
        except RedisError as e:
            self._trip(e)
            return False

    # String operations
    def get(self, key: str) -> str | None:
        if not self.enabled:
            return None
        try:
            return self.client.get(key)
        except RedisError as e:
            self._trip(e)
            return None

    def set(self, key: str, value: str, ex: int | None = None) -> bool:
        if not self.enabled:
            return False
        try:
            return bool(self.client.set(key, value, ex=ex))
        except RedisError as e:
            self._trip(e)
            return False

    def delete(self, key: str) -> bool:
        if not self.enabled:
            return False
        try:
            return bool(self.client.delete(key))
        except RedisError as e:
            self._trip(e)
            return False

    def incr(self, key: str) -> int | None:
        if not self.enabled:
            return None
        try:
            return self.client.incr(key)
        except RedisError as e:
            self._trip(e)
            return None

    def expire(self, key: str, seconds: int) -> bool:
        if not self.enabled:
            return False
        try:
            return bool(self.client.expire(key, seconds))
        except RedisError as e:
            self._trip(e)
            return False

    def ttl(self, key: str) -> int:
        if not self.enabled:
            return -1
        try:
            return self.client.ttl(key)
        except RedisError as e:
            self._trip(e)
            return -1

    # JSON operations
    def get_json(self, key: str) -> typing.Any | None:
        val = self.get(key)
        if val is None:
            return None
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return None

    def set_json(
        self, key: str, value: typing.Any, ex: int | None = None
    ) -> bool:
        try:
            return self.set(key, json.dumps(value), ex=ex)
        except (TypeError, ValueError) as e:
            logger.error(f"[Redis] JSON encode failed for {key}: {e}")
            return False


def get_redis_client() -> RedisClient:
    """Get the singleton Redis client instance."""
    return RedisClient()


def with_redis_fallback(fallback_value: typing.Any = None):
    """Decorator that returns fallback value on Redis errors."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except RedisError as e:
                logger.warning(f"[Redis] Fallback for {func.__name__}: {e}")
                return fallback_value
        return wrapper
    return decorator
