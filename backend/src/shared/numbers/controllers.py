from __future__ import annotations

from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.session_engine import NumbersSessionGenerator
from src.config import Config


# Singleton generator (pure sampling, no AI)
_GENERATOR: NumbersSessionGenerator | None = None


def get_generator() -> NumbersSessionGenerator:
    """
    Return a singleton NumbersSessionGenerator instance.

    Keeps sampling logic and configuration away from HTTP views.
    """
    global _GENERATOR
    if _GENERATOR is None:
        _GENERATOR = NumbersSessionGenerator()
    return _GENERATOR


def parse_number_types(raw_types: list[str]) -> list[NumberType]:
    """
    Parse and validate raw number type strings into NumberType enums.

    Raises ValueError on invalid input; HTTP-specific code lives in views.
    """
    types: list[NumberType] = []
    for raw in raw_types:
        try:
            types.append(NumberType(raw))
        except ValueError:
            raise ValueError(f"Invalid number type: {raw}")

    if not types:
        raise ValueError("At least one number type is required")

    return types


def build_audio_url(raw_audio_ref: str | None) -> str | None:
    """
    Build a client-facing audio URL from a stored audio_ref.

    Priority:
    1. If raw_audio_ref is already an absolute URL, return as-is.
    2. If NUMBERS_AUDIO_BASE_URL is configured, treat raw_audio_ref as a
       relative path inside the public audio repository.
    3. Fallback: expose backend streaming endpoint for legacy Drive IDs.
    """
    if not isinstance(raw_audio_ref, str) or not raw_audio_ref:
        return None

    # Already a full URL
    if raw_audio_ref.startswith(("http://", "https://")):
        return raw_audio_ref

    base_url = Config.NUMBERS_AUDIO_BASE_URL
    if base_url:
        return f"{base_url.rstrip('/')}/{raw_audio_ref.lstrip('/')}"

    # Legacy behaviour: route through backend audio proxy
    if not raw_audio_ref.startswith("/"):
        return f"/api/web/numbers/audio/{raw_audio_ref}"
    return raw_audio_ref


__all__ = [
    "get_generator",
    "parse_number_types",
    "build_audio_url",
]

