"""Path helpers for DELF static assets.

This module is the single place that defines how DELF asset paths are laid
out in GitHub and how they are referenced from DelfTestPaper JSON.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_SAFE_SEGMENT_RE = re.compile(r"[^a-z0-9_-]+")
_IMAGE_EXTENSIONS = (".webp", ".png", ".jpg", ".jpeg")
_AUDIO_EXTENSIONS = (".mp3", ".m4a", ".wav")
_LEGACY_FLAT_IMAGE_RE = re.compile(
    r"^tp-?(?P<test_number>\d+)-q(?P<question_number>\d+)"
    r"(?:-p\d+)?-(?P<label>[a-z0-9_-]+)\.(?:webp|png|jpe?g)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class DelfAssetPath:
    """A GitHub path plus the relative value stored in JSON."""

    github_path: str
    relative_path: str


def normalize_path_segment(value: str) -> str:
    """Normalize a path segment while keeping it human-readable."""
    normalized = _SAFE_SEGMENT_RE.sub("-", value.strip().lower())
    normalized = normalized.strip("-_")
    return normalized or "asset"


def scope_prefix(level: str, variant: str, section: str) -> str:
    return f"delf/{level.lower()}/{variant}/{section}"


def test_paper_github_path(
    *, level: str, variant: str, section: str, test_id: str
) -> str:
    return f"{scope_prefix(level, variant, section)}/tp/{test_id}.json"


def image_asset_directory(*, level: str, variant: str, section: str) -> str:
    return f"{scope_prefix(level, variant, section)}/assets"


def audio_asset_directory(*, level: str, variant: str, section: str) -> str:
    return f"{scope_prefix(level, variant, section)}/audio"


def _extension(filename: str, *, default: str, allowed: tuple[str, ...]) -> str:
    lowered = filename.lower()
    for ext in allowed:
        if lowered.endswith(ext):
            return ext
    return default


def nested_image_relative_path(
    *, test_id: str, question_number: int, label: str, extension: str = ".webp"
) -> str:
    """Return the canonical JSON img_url for an option image.

    Example: `assets/tp-19/q01/a.webp`.
    """
    normalized_test_id = normalize_path_segment(test_id)
    normalized_label = normalize_path_segment(label)
    return (
        f"assets/{normalized_test_id}/q{question_number:02d}/"
        f"{normalized_label}{extension}"
    )


def legacy_flat_image_ref_to_nested(img_url: str) -> str | None:
    """Map old flat option-image names to the canonical nested WebP ref.

    Examples:
    - `assets/tp02-q1-p6-a.webp` -> `assets/tp-02/q01/a.webp`
    - `tp04-q3-b.png` -> `assets/tp-04/q03/b.webp`
    """
    value = img_url.strip().lstrip("/")
    if value.startswith("assets/"):
        value = value[len("assets/") :]
    if "/" in value:
        return None

    match = _LEGACY_FLAT_IMAGE_RE.match(value)
    if not match:
        return None

    test_number = int(match.group("test_number"))
    question_number = int(match.group("question_number"))
    label = match.group("label")
    return nested_image_relative_path(
        test_id=f"tp-{test_number:02d}",
        question_number=question_number,
        label=label,
        extension=".webp",
    )


def image_upload_path(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
    filename: str,
    question_number: int | None = None,
    label: str | None = None,
) -> DelfAssetPath:
    """Build image upload paths.

    When `question_number` and `label` are present, use the structured
    per-paper layout. Otherwise, preserve the legacy flat asset convention for
    manual one-off uploads.
    """
    if question_number is not None and label:
        ext = _extension(filename, default=".webp", allowed=_IMAGE_EXTENSIONS)
        relative = nested_image_relative_path(
            test_id=test_id,
            question_number=question_number,
            label=label,
            extension=ext,
        )
    else:
        relative = f"assets/{filename}"

    return DelfAssetPath(
        github_path=f"{scope_prefix(level, variant, section)}/{relative}",
        relative_path=relative,
    )


def audio_upload_path(
    *, level: str, variant: str, section: str, filename: str
) -> DelfAssetPath:
    """Build audio upload paths.

    Audio stays flat for now because the existing JSON model stores a single
    `audio_filename` string and the current A2 corpus shares numbered tracks.
    """
    return DelfAssetPath(
        github_path=f"{audio_asset_directory(level=level, variant=variant, section=section)}/{filename}",
        relative_path=filename,
    )


def image_reference_github_path(
    *, level: str, variant: str, section: str, img_url: str
) -> str:
    """Resolve a JSON img_url to a GitHub path.

    Supports both legacy flat refs (`assets/foo.webp`) and new nested refs
    (`assets/tp-19/q01/a.webp`). Bare filenames are treated as legacy assets.
    """
    value = img_url.strip().lstrip("/")
    if value.startswith("assets/"):
        relative = value
    else:
        relative = f"assets/{value}"
    return f"{scope_prefix(level, variant, section)}/{relative}"


def audio_reference_github_path(
    *, level: str, variant: str, section: str, audio_filename: str
) -> str:
    value = audio_filename.strip().lstrip("/")
    while value.lower().startswith("audio/"):
        value = value.split("/", 1)[1]
    return f"{audio_asset_directory(level=level, variant=variant, section=section)}/{value}"


__all__ = [
    "DelfAssetPath",
    "audio_asset_directory",
    "audio_reference_github_path",
    "audio_upload_path",
    "image_asset_directory",
    "image_reference_github_path",
    "image_upload_path",
    "legacy_flat_image_ref_to_nested",
    "nested_image_relative_path",
    "normalize_path_segment",
    "scope_prefix",
    "test_paper_github_path",
]
