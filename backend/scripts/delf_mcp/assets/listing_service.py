"""List DELF assets (image or audio) under a scope's GitHub directory."""

from __future__ import annotations

from typing import Any

from src.shared.delf_practice.asset_paths import (
    audio_asset_directory,
    image_asset_directory,
)
from src.shared.delf_practice.github_manager import GitHubDelfManager

_IMAGE_EXTS: tuple[str, ...] = (".webp", ".png", ".jpg", ".jpeg")
_AUDIO_EXTS: tuple[str, ...] = (".mp3", ".m4a", ".wav")


def _build_directory(level: str, variant: str, section: str, kind: str) -> str:
    if kind == "image":
        return image_asset_directory(level=level, variant=variant, section=section)
    return audio_asset_directory(level=level, variant=variant, section=section)


def list_delf_assets(
    *,
    level: str,
    variant: str,
    section: str,
    kind: str = "image",
    github: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """List filenames in the scope's `assets/` or `audio/` directory.

    A missing directory yields an empty list (not an error).
    """
    if kind not in ("image", "audio"):
        return {
            "success": False,
            "error": "kind must be 'image' or 'audio'",
        }

    github = github or GitHubDelfManager()
    directory = _build_directory(level, variant, section, kind)
    extensions = _IMAGE_EXTS if kind == "image" else _AUDIO_EXTS

    try:
        if hasattr(github, "list_files_recursive"):
            files = github.list_files_recursive(directory, extensions=extensions)
        else:
            files = github.list_files(directory, extensions=extensions)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not list GitHub directory: {exc}",
            "github_directory": directory,
        }

    return {
        "success": True,
        "kind": kind,
        "level": level.upper(),
        "variant": variant,
        "section": section,
        "github_directory": directory,
        "files": files,
        "total": len(files),
    }


__all__ = ["list_delf_assets"]
