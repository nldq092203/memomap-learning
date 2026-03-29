"""Cached DELF content loading from GitHub."""

from __future__ import annotations

from typing import Any

from src.config import Config
from src.extensions import logger
from src.infra.cache import get_redis_client
from src.shared.delf_practice.github_repository import GitHubDelfRepository
from src.shared.delf_practice.schemas import DelfTestPaper

DELF_CONTENT_CACHE_PREFIX = "delf:test-content:v1"
DELF_CONTENT_CACHE_TTL = int(getattr(Config, "DEFAULT_CACHE_TTL", 3600))


def delf_content_cache_key(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
) -> str:
    """Build the Redis key for one DELF paper."""
    return (
        f"{DELF_CONTENT_CACHE_PREFIX}:"
        f"{level.upper()}:{variant}:{section}:{test_id}"
    )


def invalidate_delf_content_cache(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
) -> None:
    """Invalidate cached DELF paper content."""
    get_redis_client().delete(
        delf_content_cache_key(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
        )
    )


def get_cached_delf_content(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
) -> DelfTestPaper | None:
    """Read and validate cached DELF content from Redis."""
    payload = get_redis_client().get_json(
        delf_content_cache_key(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
        )
    )
    if not isinstance(payload, dict):
        return None

    content = payload.get("content")
    if not isinstance(content, dict):
        return None

    try:
        return DelfTestPaper.model_validate(content)
    except Exception as exc:
        logger.warning("[DELF-CACHE] Invalid cached content for {}: {}", test_id, exc)
        invalidate_delf_content_cache(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
        )
        return None


def set_cached_delf_content(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
    content: DelfTestPaper,
) -> None:
    """Store validated DELF content in Redis."""
    get_redis_client().set_json(
        delf_content_cache_key(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
        ),
        {
            "content": content.model_dump(mode="json", by_alias=True),
            "test_id": test_id,
            "level": level.upper(),
            "variant": variant,
            "section": section,
        },
        ex=DELF_CONTENT_CACHE_TTL,
    )


def resolve_delf_content(
    *,
    paper: Any,
    github_repo: GitHubDelfRepository | None = None,
) -> DelfTestPaper:
    """Load one DELF paper from Redis first, then GitHub on cache miss."""
    cached = get_cached_delf_content(
        level=paper.level,
        variant=paper.variant,
        section=paper.section,
        test_id=paper.test_id,
    )
    if cached is not None:
        return cached

    repo = github_repo or GitHubDelfRepository()
    content = repo.fetch_test_paper(paper.github_path)
    set_cached_delf_content(
        level=paper.level,
        variant=paper.variant,
        section=paper.section,
        test_id=paper.test_id,
        content=content,
    )
    return content
