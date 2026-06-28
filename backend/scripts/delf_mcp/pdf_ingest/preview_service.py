"""Build DelfTestPaper candidates from a manifest, validate, return proposals.

Per plan decision D4: group activities by (chapter_number, section). Each
group becomes one paper. Each non-skipped activity within a group becomes
one DelfExercise.

Per plan decision D8: validate every candidate paper and surface errors as
warnings inline. The agent should review before calling save.
"""

from __future__ import annotations

import os
import re
from typing import Any

from src.shared.delf_practice.asset_paths import nested_image_relative_path

from scripts.delf_mcp.naming_service import (
    inspect_existing_test_ids,
    suggest_test_id_from_existing,
)
from scripts.delf_mcp.validation import validate_content

from . import question_extractor
from . import warnings as warning_codes
from .manifest import ActivityRecord, ImageOptionCrop, read_manifest


def _source_book_id(exercise_pdf_path: str) -> str:
    """Stable book id derived from the source PDF filename."""
    stem = os.path.splitext(os.path.basename(exercise_pdf_path))[0]
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-")
    return normalized or stem or "unknown-book"


def _activity_source_ref(
    activity: ActivityRecord,
    *,
    book_id: str,
    page_offset: int,
) -> dict[str, Any]:
    chapter_part = (
        f"chapter-{activity.chapter_number}"
        if activity.chapter_number is not None
        else "chapter-unknown"
    )
    section = activity.section.upper()
    activity_id = (
        f"{book_id}:{section}:{chapter_part}:activity-{activity.activity_number}"
    )
    return {
        "book_id": book_id,
        "activity_id": activity_id,
        "activity_number": activity.activity_number,
        "chapter_number": activity.chapter_number,
        "section": section,
        "page_start": activity.page_start + page_offset,
        "page_end": activity.page_end + page_offset,
        "source_activities": [activity.activity_number],
        "source_pages": list(
            range(
                activity.page_start + page_offset, activity.page_end + page_offset + 1
            )
        ),
    }


def _filter_activities(
    activities: list[ActivityRecord],
    *,
    sections: list[str] | None,
    activity_range: list[int] | None,
) -> list[ActivityRecord]:
    """Apply optional section / activity_range filters from the agent."""
    filtered = activities
    if sections:
        wanted = {s.upper() for s in sections}
        filtered = [a for a in filtered if a.section.upper() in wanted]
    if activity_range and len(activity_range) == 2:
        lo, hi = activity_range
        filtered = [a for a in filtered if lo <= a.activity_number <= hi]
    return filtered


def _group_key(
    activity: ActivityRecord,
    *,
    split_co_by_activity: bool,
) -> tuple[Any, str, int | None]:
    """Grouping key for paper assembly."""
    section = activity.section.upper()
    activity_part = (
        activity.activity_number if split_co_by_activity and section == "CO" else None
    )
    return (activity.chapter_number, section, activity_part)


def _assign_img_urls(
    crops: list[ImageOptionCrop], *, proposed_test_id: str
) -> list[ImageOptionCrop]:
    """Set each crop's img_url to its canonical GitHub-relative path.

    The path matches the existing screenshot-pipeline convention:
    `assets/{test_id}/q{NN}/{label}.webp`.
    """
    enriched: list[ImageOptionCrop] = []
    for crop in crops:
        enriched.append(
            ImageOptionCrop(
                question_number=crop.question_number,
                label=crop.label,
                local_path=crop.local_path,
                page_number=crop.page_number,
                bbox=crop.bbox,
                img_url=nested_image_relative_path(
                    test_id=proposed_test_id,
                    question_number=crop.question_number,
                    label=crop.label,
                ),
                desc=crop.desc,
            )
        )
    return enriched


def _extract_exercise_for_activity(
    activity: ActivityRecord,
    *,
    proposed_test_id: str,
    book_id: str,
    page_offset: int,
) -> tuple[
    dict[str, Any] | None,
    list[dict[str, Any]],
    str | None,
    list[ImageOptionCrop],
]:
    """Run the question extractor against one activity's text.

    Returns (exercise, warnings, skip_reason, enriched_crops). The fourth
    element is the crop list with `img_url` populated — save_service uses
    it to upload each local WebP to the matching GitHub path.
    """
    answer_key = activity.answer_key
    answer_key_typed: dict[int, int] | None = None
    if isinstance(answer_key, dict) and answer_key:
        # Manifest deserializes int keys as strings; normalize back.
        try:
            answer_key_typed = {int(k): int(v) for k, v in answer_key.items()}
        except (TypeError, ValueError):
            answer_key_typed = None

    enriched: list[ImageOptionCrop] = []
    crops = activity.image_option_crops
    if crops:
        enriched = _assign_img_urls(crops, proposed_test_id=proposed_test_id)

    result = question_extractor.extract_exercise(
        activity_number=activity.activity_number,
        title=activity.title or f"Activité {activity.activity_number}",
        activity_text=activity.text,
        answer_key=answer_key_typed,
        transcript=activity.transcript,
        image_option_crops=enriched or None,
    )
    exercise = result.exercise
    if exercise is not None:
        exercise["source_ref"] = _activity_source_ref(
            activity,
            book_id=book_id,
            page_offset=page_offset,
        )

    return (exercise, list(result.warnings), result.skip_reason, enriched)


def _build_paper(
    *,
    chapter: Any,
    section: str,
    activities: list[ActivityRecord],
    proposed_test_id: str,
    audio_filename: str | None,
    book_id: str,
    page_offset: int,
) -> tuple[
    dict[str, Any],
    list[dict[str, Any]],
    list[int],
    list[dict[str, Any]],
]:
    """Assemble a DelfTestPaper dict from one group's activities.

    Returns (paper, warnings, source_pages, image_uploads). `image_uploads`
    is the list of `{local_path, img_url, question_number, label}` records
    save_service uploads to GitHub before asset verification runs.
    """
    exercises: list[dict[str, Any]] = []
    warnings_out: list[dict[str, Any]] = []
    skipped_activities: list[int] = []
    source_pages: list[int] = []
    extra_transcripts: list[dict[str, Any]] = []
    image_uploads: list[dict[str, Any]] = []

    for activity in activities:
        exercise, warnings_for_activity, _skip_reason, enriched_crops = (
            _extract_exercise_for_activity(
                activity,
                proposed_test_id=proposed_test_id,
                book_id=book_id,
                page_offset=page_offset,
            )
        )
        warnings_out.extend(warnings_for_activity)
        if exercise is None:
            skipped_activities.append(activity.activity_number)
            continue
        exercises.append(exercise)
        for page in range(activity.page_start, activity.page_end + 1):
            if page not in source_pages:
                source_pages.append(page)
        for crop in enriched_crops:
            if crop.img_url and crop.local_path:
                image_uploads.append(
                    {
                        "local_path": crop.local_path,
                        "img_url": crop.img_url,
                        "question_number": crop.question_number,
                        "label": crop.label,
                    }
                )
        # v3: pull listening-only document blocks up to paper-level
        # extra_transcripts so they're available at save time.
        for extra in activity.extra_transcripts:
            if isinstance(extra, dict) and extra.get("id") and extra.get("content"):
                extra_transcripts.append(
                    {
                        "id": str(extra["id"]),
                        "content": str(extra["content"]),
                    }
                )

    paper_source_pages = sorted(page + page_offset for page in source_pages)
    paper_source_activities = [a.activity_number for a in activities]
    paper: dict[str, Any] = {
        "test_id": proposed_test_id,
        "section": section,
        "audio_filename": audio_filename if section == "CO" else None,
        "exercises": exercises,
        "extra_transcripts": extra_transcripts,
        "source_ref": {
            "book_id": book_id,
            "activity_id": (
                f"{book_id}:{section}:chapter-{chapter}"
                if chapter is not None
                else f"{book_id}:{section}:chapter-unknown"
            ),
            "chapter_number": chapter,
            "section": section,
            "source_activities": paper_source_activities,
            "source_pages": paper_source_pages,
        },
    }
    if skipped_activities:
        warnings_out.append(
            warning_codes.make_warning(
                "skipped_activities",
                f"Chapter {chapter} / {section}: skipped activities "
                f"{skipped_activities} (see per-activity warnings).",
                context={"skipped_activities": skipped_activities},
            )
        )
    return paper, warnings_out, source_pages, image_uploads


def _next_test_id(used: set[str]) -> str:
    """Suggest the next `tp-NN` ID, accounting for IDs already proposed in this run."""
    suggested, _ = suggest_test_id_from_existing(used)
    return suggested


def preview_delf_book_extraction(
    *,
    analysis_id: str,
    sections: list[str] | None = None,
    activity_range: list[int] | None = None,
    workspace_root: str | None = None,
    existing_test_ids: set[str] | None = None,
    split_co_by_activity: bool = False,
    repo: Any | None = None,
    github: Any | None = None,
) -> dict[str, Any]:
    """Build DelfTestPaper candidates from a stored manifest.

    Args:
        analysis_id: ID returned by `analyze_delf_book_pdf`.
        sections: Optional filter, e.g. ["CE"], ["CO"], or ["CE", "CO"].
        activity_range: Optional `[lo, hi]` inclusive bounds on activity_number.
        workspace_root: Override `.local/delf-extracts` (tests).
        existing_test_ids: Pre-seeded set of IDs to avoid colliding with.
            Tests pass this in; production also checks DB/GitHub directly.
        split_co_by_activity: When True, each CO activity becomes its own
            candidate paper instead of grouping all CO activities in a chapter.
        repo / github: Optional injectable dependencies for tests.

    Returns:
        {success, analysis_id, papers: [{proposed_test_id, content,
        validation, warnings, source_pages, source_activities}], warnings}.
    """
    try:
        manifest = read_manifest(analysis_id, workspace_root=workspace_root)
    except FileNotFoundError as exc:
        return {"success": False, "error": str(exc)}

    activities = _filter_activities(
        manifest.activities,
        sections=sections,
        activity_range=activity_range,
    )
    book_id = manifest.source_book_id or _source_book_id(manifest.exercise_pdf_path)
    page_offset = manifest.source_page_offset

    # Group by (chapter, section).
    groups: dict[tuple[Any, str, int | None], list[ActivityRecord]] = {}
    group_order: list[tuple[Any, str, int | None]] = []
    for activity in activities:
        key = _group_key(activity, split_co_by_activity=split_co_by_activity)
        if key not in groups:
            groups[key] = []
            group_order.append(key)
        groups[key].append(activity)

    used_ids_by_section: dict[str, set[str]] = {}
    for _, section, _ in group_order:
        section_key = section.upper()
        if section_key not in ("CE", "CO") or section_key in used_ids_by_section:
            continue
        used_ids_by_section[section_key] = set(existing_test_ids or ())
        try:
            corpus = inspect_existing_test_ids(
                level=manifest.level,
                variant=manifest.variant,
                section=section_key,
                repo=repo,
                github=github,
            )
        except Exception as exc:
            return {
                "success": False,
                "error": (
                    "Could not inspect existing DELF exercises before "
                    f"previewing {section_key}: {exc}"
                ),
                "message": (
                    "No paper proposals were generated because the tool could "
                    "not confirm which test_ids already exist."
                ),
            }
        used_ids_by_section[section_key].update(corpus["all_existing_test_ids"])

    papers: list[dict[str, Any]] = []

    for chapter, section, activity_part in group_order:
        group_activities = groups[(chapter, section, activity_part)]
        if section not in ("CE", "CO"):
            # UNKNOWN section: skip the whole group with a warning.
            papers.append(
                {
                    "proposed_test_id": None,
                    "content": None,
                    "validation": None,
                    "warnings": [
                        warning_codes.make_warning(
                            warning_codes.UNCLASSIFIED_ACTIVITY,
                            f"Skipped group chapter={chapter} because section is UNKNOWN.",
                            context={
                                "chapter_number": chapter,
                                "activity_numbers": [
                                    a.activity_number for a in group_activities
                                ],
                            },
                        )
                    ],
                    "source_activities": [a.activity_number for a in group_activities],
                    "source_pages": [],
                }
            )
            continue

        # Pick the first audio filename in the group (CO papers only).
        audio_filename: str | None = None
        if section == "CO":
            for activity in group_activities:
                if activity.audio_filename:
                    audio_filename = activity.audio_filename
                    break

        used_ids = used_ids_by_section.setdefault(section, set(existing_test_ids or ()))
        proposed = _next_test_id(used_ids)
        used_ids.add(proposed)

        paper, paper_warnings, source_pages, image_uploads = _build_paper(
            chapter=chapter,
            section=section,
            activities=group_activities,
            proposed_test_id=proposed,
            audio_filename=audio_filename,
            book_id=book_id,
            page_offset=page_offset,
        )

        validation = validate_content(paper)
        # validation may include a non-JSON `paper` field — strip it.
        validation_view = {k: v for k, v in validation.items() if k != "paper"}

        papers.append(
            {
                "proposed_test_id": proposed,
                "content": paper,
                "validation": validation_view,
                "warnings": paper_warnings,
                "source_activities": [a.activity_number for a in group_activities],
                "source_pages": source_pages,
                "chapter_number": chapter,
                "source_group_activity": activity_part,
                "image_uploads": image_uploads,
            }
        )

    return {
        "success": True,
        "analysis_id": analysis_id,
        "papers": papers,
        "warnings": manifest.warnings,
    }


__all__ = ["preview_delf_book_extraction"]
