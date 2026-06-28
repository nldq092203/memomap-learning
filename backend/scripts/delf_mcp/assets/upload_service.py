"""Upload one DELF asset (image or audio) to GitHub for a scope."""

from __future__ import annotations

import base64
import binascii
import os
from typing import Any

from src.shared.delf_practice.asset_paths import (
    audio_upload_path,
    image_upload_path,
)
from src.shared.delf_practice.github_manager import GitHubDelfManager

_IMAGE_EXTS: tuple[str, ...] = (".webp", ".png", ".jpg", ".jpeg")
_AUDIO_EXTS: tuple[str, ...] = (".mp3", ".m4a", ".wav")

_DEFAULT_MAX_MB = 20


def _max_asset_bytes() -> int:
    raw = os.getenv("DELF_MCP_MAX_ASSET_MB")
    try:
        value = int(raw) if raw else _DEFAULT_MAX_MB
    except ValueError:
        value = _DEFAULT_MAX_MB
    return max(1, value) * 1024 * 1024


def _allowed_extensions(kind: str) -> tuple[str, ...]:
    if kind == "image":
        return _IMAGE_EXTS
    if kind == "audio":
        return _AUDIO_EXTS
    return ()


def _build_paths(
    level: str,
    variant: str,
    section: str,
    test_id: str,
    filename: str,
    kind: str,
    question_number: int | None,
    label: str | None,
) -> tuple[str, str]:
    """Return (github_path, relative_path_for_json)."""
    if kind == "image":
        path = image_upload_path(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
            filename=filename,
            question_number=question_number,
            label=label,
        )
        return path.github_path, path.relative_path
    # audio — JSON stores bare filename (frontend prepends 'audio/')
    path = audio_upload_path(
        level=level, variant=variant, section=section, filename=filename
    )
    return path.github_path, path.relative_path


def upload_delf_asset(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
    filename: str,
    content_base64: str,
    kind: str,
    overwrite: bool = False,
    question_number: int | None = None,
    label: str | None = None,
    github: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Upload a base64-encoded image or audio file to GitHub for one scope.

    Refuses to overwrite an existing file unless `overwrite=True`. Returns
    the absolute `github_path` and the `relative_path` to use inside the
    DelfTestPaper JSON.
    """
    if kind not in ("image", "audio"):
        return {
            "success": False,
            "error": "kind must be 'image' or 'audio'",
        }

    if not filename or "/" in filename or "\\" in filename or filename in (".", ".."):
        return {
            "success": False,
            "error": f"Invalid filename '{filename}'",
        }

    allowed = _allowed_extensions(kind)
    if not filename.lower().endswith(allowed):
        return {
            "success": False,
            "error": (
                f"Filename '{filename}' does not match an allowed "
                f"{kind} extension: {', '.join(allowed)}"
            ),
        }

    try:
        raw = base64.b64decode(content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        return {
            "success": False,
            "error": f"Invalid content_base64: {exc}",
        }

    limit = _max_asset_bytes()
    if len(raw) > limit:
        return {
            "success": False,
            "error": (
                f"Payload too large: {len(raw)} bytes > {limit} bytes "
                f"(DELF_MCP_MAX_ASSET_MB={limit // (1024 * 1024)})"
            ),
        }

    github = github or GitHubDelfManager()
    github_path, relative_path = _build_paths(
        level,
        variant,
        section,
        test_id,
        filename,
        kind,
        question_number,
        label,
    )

    try:
        already_exists = github.file_exists(github_path)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not check existing file: {exc}",
            "github_path": github_path,
        }

    if already_exists and not overwrite:
        return {
            "success": False,
            "error": (
                f"File already exists at {github_path}. "
                "Pass overwrite=true to replace it."
            ),
            "github_path": github_path,
            "exists": True,
        }

    try:
        if already_exists and overwrite:
            github.create_or_update_file(
                file_path=github_path,
                content=raw,
                commit_message=(
                    f"chore(delf-mcp): replace {kind} {filename} for {test_id}"
                ),
            )
        else:
            github.create_file(
                file_path=github_path,
                content=raw,
                commit_message=(
                    f"chore(delf-mcp): upload {kind} {filename} for {test_id}"
                ),
            )
    except Exception as exc:
        return {
            "success": False,
            "error": f"GitHub upload failed: {exc}",
            "github_path": github_path,
        }

    return {
        "success": True,
        "kind": kind,
        "level": level.upper(),
        "variant": variant,
        "section": section,
        "test_id": test_id,
        "filename": filename,
        "github_path": github_path,
        "relative_path": relative_path,
        "byte_size": len(raw),
        "overwritten": bool(already_exists and overwrite),
    }


__all__ = ["upload_delf_asset"]
