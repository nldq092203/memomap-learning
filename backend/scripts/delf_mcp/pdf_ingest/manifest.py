from __future__ import annotations

import json
import os
import uuid
from dataclasses import asdict, dataclass, field, is_dataclass
from pathlib import Path
from typing import Any

# Workspace root relative to the backend/ directory. The MCP server cwd is
# the backend/ dir (per the README install instructions), so this resolves
# to backend/.local/delf-extracts.
DEFAULT_WORKSPACE_ROOT = ".local/delf-extracts"

MANIFEST_FILENAME = "manifest.json"
PAGES_SUBDIR = "pages"
CROPS_SUBDIR = "crops"


@dataclass
class ImageOptionCrop:
    """One image-option crop produced from a PDF page (v2).

    `img_url` is filled at preview time once the paper's proposed test_id is
    known. `local_path` points to the WebP saved under
    `{workspace_dir}/crops/q{NN}/{label}.webp`.
    """

    question_number: int
    label: str  # a / b / c / d
    local_path: str  # absolute path to WebP on disk
    page_number: int
    bbox: tuple[float, float, float, float] | None = None  # PDF points
    img_url: str | None = None  # set at preview time
    desc: str = ""


@dataclass
class ActivityRecord:
    """One detected activity in the exercise PDF."""

    activity_number: int  # e.g. 1, 2, 3 — as labeled in the book
    section: str  # "CE" or "CO"; "UNKNOWN" only when classifier abstains
    chapter_number: int | None  # grouping key for paper assembly
    title: str | None  # e.g. "Activité 1"
    page_start: int  # 1-indexed PDF page where activity starts
    page_end: int  # 1-indexed PDF page where it ends (inclusive)
    text: str  # concatenation of page texts within range
    track_numbers: list[int] = field(default_factory=list)  # CO only
    audio_filename: str | None = None  # populated by track_resolver at analyze time
    audio_exists: bool | None = None  # GitHub HEAD result at analyze time
    has_image_options: bool = False  # if True without crops, v1 skips it
    has_matching: bool = False  # if True, v1 skips with matching_exercise_detected
    answer_key: dict[str, Any] | None = None  # parsed from answer PDF; shape varies
    transcript: str | None = None  # v3 — CO transcript from answer PDF
    extra_transcripts: list[dict[str, Any]] = field(default_factory=list)  # v3
    image_option_crops: list[ImageOptionCrop] = field(default_factory=list)  # v2
    warnings: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class Manifest:
    """Top-level state for one analyze run."""

    analysis_id: str
    level: str
    variant: str
    exercise_pdf_path: str
    answer_pdf_path: str | None
    workspace_dir: str  # absolute path to {workspace_root}/{analysis_id}
    source_book_id: str | None = None
    source_page_offset: int = 0
    activities: list[ActivityRecord] = field(default_factory=list)
    warnings: list[dict[str, Any]] = field(default_factory=list)
    schema_version: int = 1


def _to_jsonable(obj: Any) -> Any:
    """Recursive dataclass -> dict conversion (handles nested lists)."""
    if is_dataclass(obj):
        return {k: _to_jsonable(v) for k, v in asdict(obj).items()}
    if isinstance(obj, list):
        return [_to_jsonable(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _to_jsonable(v) for k, v in obj.items()}
    return obj


def _from_jsonable_image_crop(data: dict[str, Any]) -> ImageOptionCrop:
    bbox_data = data.get("bbox")
    bbox: tuple[float, float, float, float] | None = None
    if bbox_data and len(bbox_data) == 4:
        bbox = (
            float(bbox_data[0]),
            float(bbox_data[1]),
            float(bbox_data[2]),
            float(bbox_data[3]),
        )
    return ImageOptionCrop(
        question_number=int(data["question_number"]),
        label=str(data["label"]),
        local_path=str(data["local_path"]),
        page_number=int(data["page_number"]),
        bbox=bbox,
        img_url=data.get("img_url"),
        desc=str(data.get("desc", "")),
    )


def _from_jsonable_activity(data: dict[str, Any]) -> ActivityRecord:
    return ActivityRecord(
        activity_number=int(data["activity_number"]),
        section=str(data["section"]),
        chapter_number=data.get("chapter_number"),
        title=data.get("title"),
        page_start=int(data["page_start"]),
        page_end=int(data["page_end"]),
        text=str(data.get("text", "")),
        track_numbers=list(data.get("track_numbers") or []),
        audio_filename=data.get("audio_filename"),
        audio_exists=data.get("audio_exists"),
        has_image_options=bool(data.get("has_image_options", False)),
        has_matching=bool(data.get("has_matching", False)),
        answer_key=data.get("answer_key"),
        transcript=data.get("transcript"),
        extra_transcripts=list(data.get("extra_transcripts") or []),
        image_option_crops=[
            _from_jsonable_image_crop(c) for c in data.get("image_option_crops") or []
        ],
        warnings=list(data.get("warnings") or []),
    )


def new_analysis_id() -> str:
    """Short UUID slug used as the analysis directory name."""
    return uuid.uuid4().hex[:12]


def workspace_dir_for(analysis_id: str, *, workspace_root: str | None = None) -> str:
    """Resolve the absolute directory for an analysis.

    `workspace_root` defaults to `.local/delf-extracts` relative to CWD.
    Override only for tests.
    """
    root = workspace_root or DEFAULT_WORKSPACE_ROOT
    return os.path.abspath(os.path.join(root, analysis_id))


def pages_dir(workspace_dir: str) -> str:
    return os.path.join(workspace_dir, PAGES_SUBDIR)


def crops_dir(workspace_dir: str) -> str:
    return os.path.join(workspace_dir, CROPS_SUBDIR)


def init_workspace(*, workspace_root: str | None = None) -> tuple[str, str]:
    """Create a fresh workspace for a new analysis.

    Returns:
        (analysis_id, workspace_dir).
    """
    analysis_id = new_analysis_id()
    workspace = workspace_dir_for(analysis_id, workspace_root=workspace_root)
    Path(pages_dir(workspace)).mkdir(parents=True, exist_ok=True)
    return analysis_id, workspace


def write_manifest(manifest: Manifest) -> str:
    """Persist the manifest to disk. Returns the absolute file path."""
    Path(manifest.workspace_dir).mkdir(parents=True, exist_ok=True)
    path = os.path.join(manifest.workspace_dir, MANIFEST_FILENAME)
    payload = _to_jsonable(manifest)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
    return path


def read_manifest(analysis_id: str, *, workspace_root: str | None = None) -> Manifest:
    """Load a manifest by analysis_id.

    Raises FileNotFoundError if the analysis directory or manifest is missing.
    """
    workspace = workspace_dir_for(analysis_id, workspace_root=workspace_root)
    path = os.path.join(workspace, MANIFEST_FILENAME)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"No manifest for analysis_id '{analysis_id}'. "
            f"Expected at {path}. Call analyze_delf_book_pdf first."
        )
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    if data.get("schema_version") != 1:
        raise ValueError(
            f"Manifest schema_version {data.get('schema_version')} not supported"
        )

    return Manifest(
        analysis_id=str(data["analysis_id"]),
        level=str(data["level"]),
        variant=str(data["variant"]),
        exercise_pdf_path=str(data["exercise_pdf_path"]),
        answer_pdf_path=data.get("answer_pdf_path"),
        workspace_dir=str(data["workspace_dir"]),
        source_book_id=data.get("source_book_id"),
        source_page_offset=int(data.get("source_page_offset", 0)),
        activities=[_from_jsonable_activity(a) for a in data.get("activities", [])],
        warnings=list(data.get("warnings") or []),
        schema_version=int(data.get("schema_version", 1)),
    )


__all__ = [
    "ActivityRecord",
    "DEFAULT_WORKSPACE_ROOT",
    "ImageOptionCrop",
    "MANIFEST_FILENAME",
    "Manifest",
    "crops_dir",
    "init_workspace",
    "new_analysis_id",
    "pages_dir",
    "read_manifest",
    "workspace_dir_for",
    "write_manifest",
]
