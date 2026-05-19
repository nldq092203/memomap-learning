"""Per-level DELF audio filename conventions.

The audio corpus on GitHub uses different capitalization per level
(`DELF_TP_A2_…` for A2 vs `Delf_TP_B1_…` for B1). Centralizing this here
means the agent never has to remember the quirk in its prompt.
"""

from __future__ import annotations

from typing import Any

from src.shared.delf_practice.github_manager import GitHubDelfManager


# Known per-level prefix conventions. Add new levels here as their audio
# packs land in GitHub.
_AUDIO_PREFIX_BY_LEVEL: dict[str, str] = {
    "A2": "DELF_TP_A2_Piste",
    "B1": "Delf_TP_B1_Piste",
}

_DEFAULT_TEMPLATE = "DELF_TP_{LEVEL}_Piste"


def _audio_prefix(level: str) -> str:
    return _AUDIO_PREFIX_BY_LEVEL.get(
        level.upper(),
        _DEFAULT_TEMPLATE.format(LEVEL=level.upper()),
    )


def build_audio_filename(level: str, track_number: int) -> str:
    """Build the canonical audio filename for `level` / `track_number`.

    Track numbers below 10 are zero-padded to width 2.
    """
    return f"{_audio_prefix(level)}{track_number:02d}.mp3"


def build_audio_directory(level: str, variant: str, section: str) -> str:
    return f"delf/{level.lower()}/{variant}/{section}/audio"


def resolve_delf_audio_filename(
    *,
    level: str,
    variant: str,
    section: str,
    track_number: int,
    github: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Resolve a CO track number into the canonical GitHub audio filename.

    Returns a dict with the resolved filename and an `exists` flag from a
    GitHub HEAD-style lookup. Never raises for missing files.
    """
    if not isinstance(track_number, int) or track_number < 1:
        return {
            "success": False,
            "error": "track_number must be a positive integer",
        }

    filename = build_audio_filename(level, track_number)
    directory = build_audio_directory(level, variant, section)
    github_path = f"{directory}/{filename}"

    github = github or GitHubDelfManager()
    try:
        exists = github.file_exists(github_path)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not check GitHub for '{github_path}': {exc}",
            "filename": filename,
            "github_path": github_path,
        }

    response: dict[str, Any] = {
        "success": True,
        "level": level.upper(),
        "variant": variant,
        "section": section,
        "track_number": track_number,
        "filename": filename,
        "audio_filename_value": filename,
        "github_path": github_path,
        "exists": exists,
    }
    if not exists:
        response["message"] = (
            f"Resolved '{filename}' using the {level.upper()} convention, "
            "but no such file exists in GitHub. Upload it first or correct "
            "the track number."
        )
    return response


__all__ = [
    "build_audio_directory",
    "build_audio_filename",
    "resolve_delf_audio_filename",
]
