"""Redis client with connection pooling."""

from __future__ import annotations
from functools import wraps
import json
import typing

import redis
from redis.connection import ConnectionPool
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
    _test_client: typing.Any | None = None

    def __new__(cls) -> RedisClient:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if self._pool is None and self._test_client is None:
            self._initialize_pool()

    def _initialize_pool(self) -> None:
        """Initialize Redis connection pool."""
        try:
            if Config.REDIS_URL:
                self._pool = ConnectionPool.from_url(
                    Config.REDIS_URL,
                    max_connections=Config.REDIS_MAX_CONNECTIONS,
                    decode_responses=True,
                )
                logger.info("[Redis] Pool initialized from URL")
            else:
                self._pool = ConnectionPool(
                    host=Config.REDIS_HOST,
                    port=Config.REDIS_PORT,
                    db=Config.REDIS_DB,
                    password=Config.REDIS_PASSWORD,
                    ssl=Config.REDIS_SSL,
                    max_connections=Config.REDIS_MAX_CONNECTIONS,
                    decode_responses=True,
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

    @property
    def client(self) -> redis.Redis:
        """Get Redis client from pool."""
        if self._test_client is not None:
            return self._test_client
        if self._pool is None:
            self._initialize_pool()
        return redis.Redis(connection_pool=self._pool)

    def ping(self) -> bool:
        """Check if Redis connection is alive."""
        try:
            return self.client.ping()
        except RedisError as e:
            logger.error(f"[Redis] Ping failed: {e}")
            return False

    # String operations
    def get(self, key: str) -> str | None:
        try:
            return self.client.get(key)
        except RedisError as e:
            logger.error(f"[Redis] GET failed for {key}: {e}")
            return None

    def set(self, key: str, value: str, ex: int | None = None) -> bool:
        try:
            return bool(self.client.set(key, value, ex=ex))
        except RedisError as e:
            logger.error(f"[Redis] SET failed for {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        try:
            return bool(self.client.delete(key))
        except RedisError as e:
            logger.error(f"[Redis] DELETE failed for {key}: {e}")
            return False

    def incr(self, key: str) -> int | None:
        try:
            return self.client.incr(key)
        except RedisError as e:
            logger.error(f"[Redis] INCR failed for {key}: {e}")
            return None

    def expire(self, key: str, seconds: int) -> bool:
        try:
            return bool(self.client.expire(key, seconds))
        except RedisError as e:
            logger.error(f"[Redis] EXPIRE failed for {key}: {e}")
            return False

    def ttl(self, key: str) -> int:
        try:
            return self.client.ttl(key)
        except RedisError as e:
            logger.error(f"[Redis] TTL failed for {key}: {e}")
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

