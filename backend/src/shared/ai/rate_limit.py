"""AI rate limiting wrapper."""

from typing import Any
from src.infra.ai import enforce_ai_rate_limit


def enforce_rate_limit(subject_id: str | None) -> dict[str, Any] | None:
    """
    Check AI rate limits.
    Returns None if allowed, info dict if exceeded.
    """
    return enforce_ai_rate_limit(subject_id)

