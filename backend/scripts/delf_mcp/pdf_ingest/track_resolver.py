"""Extract CO track numbers from activity text and resolve to audio filenames.

CO activities mark their associated audio with patterns like:

    Piste 12
    Track 12
    CD 1 - 12

This module collects all such numbers from an activity's text, then calls
the existing `resolve_delf_audio_filename` helper to confirm the file
exists in GitHub. Missing audio is surfaced as a warning at analyze-time
(per plan decision D7).
"""

from __future__ import annotations

import re
from typing import Any

from scripts.delf_mcp.assets.audio_naming import resolve_delf_audio_filename

from . import warnings as warning_codes

# Track-number patterns. Order matters: prefer the most specific match first.
_TRACK_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bpiste\s+(\d{1,3})\b", re.IGNORECASE),
    re.compile(r"\btrack\s+(\d{1,3})\b", re.IGNORECASE),
    re.compile(r"\bcd\s*\d+\s*[-–]\s*(\d{1,3})\b", re.IGNORECASE),
)


def find_track_numbers(text: str) -> list[int]:
    """Return all unique track numbers mentioned in `text` (preserves order)."""
    seen: set[int] = set()
    out: list[int] = []
    for pattern in _TRACK_PATTERNS:
        for match in pattern.finditer(text):
            try:
                number = int(match.group(1))
            except (IndexError, ValueError):
                continue
            if number in seen or number < 1 or number > 999:
                continue
            seen.add(number)
            out.append(number)
    return out


def resolve_track(
    *,
    level: str,
    variant: str,
    section: str,
    track_number: int,
    github: Any | None = None,
) -> dict[str, Any]:
    """Wrap `resolve_delf_audio_filename` so v1 always returns a dict.

    Returns `{success, audio_filename_value, exists, message?}`. Caller
    decides whether to surface a `missing_audio` warning based on `exists`.
    """
    return resolve_delf_audio_filename(
        level=level,
        variant=variant,
        section=section,
        track_number=track_number,
        github=github,
    )


def resolve_tracks_for_activity(
    *,
    activity_number: int,
    level: str,
    variant: str,
    section: str,
    track_numbers: list[int],
    github: Any | None = None,
) -> tuple[str | None, bool | None, list[dict[str, Any]]]:
    """Resolve audio for one activity. Returns (filename, exists, warnings).

    Multi-track activities (rare) take the first track as the canonical
    audio filename — the existing schema stores one `audio_filename` per
    paper. Track 2+ get a warning so the agent knows to handle them.
    """
    warnings_out: list[dict[str, Any]] = []
    if not track_numbers:
        warnings_out.append(
            warning_codes.make_warning(
                warning_codes.MISSING_AUDIO,
                f"Activity {activity_number} is CO but no track number was found.",
                field=f"activity[{activity_number}]",
            )
        )
        return None, None, warnings_out

    if len(track_numbers) > 1:
        warnings_out.append(
            warning_codes.make_warning(
                warning_codes.MISSING_AUDIO,
                f"Activity {activity_number}: multiple tracks detected "
                f"({track_numbers}); using the first only.",
                field=f"activity[{activity_number}]",
                context={"track_numbers": track_numbers},
            )
        )

    first = track_numbers[0]
    result = resolve_track(
        level=level,
        variant=variant,
        section=section,
        track_number=first,
        github=github,
    )
    if not result.get("success"):
        warnings_out.append(
            warning_codes.make_warning(
                warning_codes.MISSING_AUDIO,
                f"Activity {activity_number}: could not resolve track {first}: "
                f"{result.get('error', 'unknown error')}",
                field=f"activity[{activity_number}]",
            )
        )
        return None, None, warnings_out

    filename = result.get("audio_filename_value")
    exists = bool(result.get("exists"))
    if not exists:
        warnings_out.append(
            warning_codes.make_warning(
                warning_codes.MISSING_AUDIO,
                f"Activity {activity_number}: resolved audio '{filename}' "
                "does not exist in GitHub. Upload it before saving the draft.",
                field=f"activity[{activity_number}]",
                context={"github_path": result.get("github_path")},
            )
        )
    return filename, exists, warnings_out


__all__ = [
    "find_track_numbers",
    "resolve_track",
    "resolve_tracks_for_activity",
]
