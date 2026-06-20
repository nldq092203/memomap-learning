"""Cross-check a DelfTestPaper's asset references against GitHub."""

from __future__ import annotations

import json
from typing import Any

from src.shared.delf_practice.asset_paths import (
    audio_asset_directory,
    audio_reference_github_path,
    image_asset_directory,
    image_reference_github_path,
)
from src.shared.delf_practice.github_manager import GitHubDelfManager
from src.shared.delf_practice.schemas import DelfTestPaper


def _parse_content(content: Any) -> tuple[dict | None, str | None]:
    if isinstance(content, dict):
        return content, None
    if isinstance(content, str):
        try:
            return json.loads(content), None
        except json.JSONDecodeError as exc:
            return None, f"Invalid JSON: {exc}"
    return None, "content must be a JSON object or JSON string"


def _collect_image_refs(paper: DelfTestPaper) -> list[tuple[str, str]]:
    """Return [(field_path, img_url_value)] for every image reference."""
    refs: list[tuple[str, str]] = []
    for ex_idx, exercise in enumerate(paper.exercises):
        # Flat options
        for opt_idx, option in enumerate(exercise.options):
            if hasattr(option, "img_url") and option.img_url:
                refs.append((
                    f"exercises[{ex_idx}].options[{opt_idx}].img_url",
                    option.img_url,
                ))
        # Nested-question options
        for q_idx, question in enumerate(exercise.questions):
            for opt_idx, option in enumerate(question.options):
                if hasattr(option, "img_url") and option.img_url:
                    refs.append((
                        f"exercises[{ex_idx}].questions[{q_idx}]"
                        f".options[{opt_idx}].img_url",
                        option.img_url,
                    ))
    return refs


def verify_delf_asset_references(
    *,
    level: str,
    variant: str,
    section: str,
    content: Any,
    github: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Check that every `img_url` and `audio_filename` exists in GitHub.

    Returns `all_present: True` only when every reference resolves. Missing
    references are listed with their exact field path so the agent can fix
    them.
    """
    parsed, err = _parse_content(content)
    if err is not None:
        return {"success": False, "error": err}

    try:
        paper = DelfTestPaper.model_validate(parsed)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Content does not validate as DelfTestPaper: {exc}",
        }

    github = github or GitHubDelfManager()
    image_dir = image_asset_directory(
        level=level, variant=variant, section=section
    )
    audio_dir = audio_asset_directory(
        level=level, variant=variant, section=section
    )

    missing: list[dict[str, str]] = []
    present_count = 0
    checked_refs: list[dict[str, str]] = []

    for field_path, value in _collect_image_refs(paper):
        ref = {"field": field_path, "value": value}
        checked_refs.append(ref)
        github_path = image_reference_github_path(
            level=level,
            variant=variant,
            section=section,
            img_url=value,
        )
        try:
            exists = github.file_exists(github_path)
        except Exception as exc:
            return {
                "success": False,
                "error": f"Could not check image asset {github_path}: {exc}",
            }
        if exists:
            present_count += 1
        else:
            missing.append(ref)

    audio_values: list[tuple[str, str]] = []
    if paper.audio_filename:
        audio_values.append(("audio_filename", paper.audio_filename))
    audio_values.extend(("audio_filenames", value) for value in paper.audio_filenames if value)

    seen_audio: set[str] = set()
    for field_name, audio_filename in audio_values:
        if audio_filename in seen_audio:
            continue
        seen_audio.add(audio_filename)
        ref = {"field": field_name, "value": audio_filename}
        checked_refs.append(ref)
        github_path = audio_reference_github_path(
            level=level,
            variant=variant,
            section=section,
            audio_filename=audio_filename,
        )
        try:
            exists = github.file_exists(github_path)
        except Exception as exc:
            return {
                "success": False,
                "error": f"Could not check audio asset {github_path}: {exc}",
            }
        if exists:
            present_count += 1
        else:
            missing.append(ref)

    return {
        "success": True,
        "all_present": not missing,
        "checked": len(checked_refs),
        "present": present_count,
        "missing": missing,
        "missing_count": len(missing),
        "image_directory": image_dir,
        "audio_directory": audio_dir if seen_audio else None,
    }


__all__ = ["verify_delf_asset_references"]
