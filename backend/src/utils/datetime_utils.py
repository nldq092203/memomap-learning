"""Date and time utilities."""

from __future__ import annotations

from datetime import datetime, timezone


def to_iso_utc(dt: datetime) -> str:
    """
    Serialize a datetime as an ISO 8601 string in UTC.

    Returns: '2025-01-01T10:00:00+00:00'
    """
    dt_utc = dt.astimezone(timezone.utc)
    return dt_utc.isoformat()


def parse_iso_to_utc(value: str | None) -> datetime | None:
    """
    Parse ISO 8601 strings into an aware UTC datetime.

    Handles:
    - Plain ISO with offset: '2025-01-01T10:00:00+00:00'
    - Trailing 'Z': '2025-01-01T10:00:00Z'

    Returns None on failure.
    """
    if not value:
        return None

    s = value.strip()
    if not s:
        return None

    # Strip trailing 'Z'
    if s.endswith("Z"):
        s = s[:-1]

    try:
        dt = datetime.fromisoformat(s)
    except Exception:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def now_iso() -> str:
    """Return current UTC time as ISO string."""
    return to_iso_utc(datetime.now(timezone.utc))

