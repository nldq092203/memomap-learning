"""Orchestrates the analyze step of PDF book ingestion.

Reads exercise and answer PDFs, detects activities, classifies CE/CO,
parses the answer key, resolves CO audio filenames, and writes a manifest
to disk. Returns a summary that the agent uses to drive the preview step.

This module does NOT save drafts, upload assets, or call any GitHub write
endpoint. It only reads from GitHub via `resolve_delf_audio_filename` to
verify audio existence at analyze-time (per plan decision D7).
"""

from __future__ import annotations

import os
from typing import Any

from . import manifest as manifest_module
from . import question_extractor, track_resolver
from . import warnings as warning_codes
from .activity_detector import detect_activities
from .answer_parser import AnswerKey, parse_answer_pdf
from .manifest import (
    ActivityRecord,
    Manifest,
    init_workspace,
    pages_dir,
    write_manifest,
)
from .pdf_reader import PdfDocument, read_pdf
from .transcript_parser import Transcripts, parse_transcript_pdf


def _peek_extraction(activity: ActivityRecord) -> dict[str, Any]:
    """Look-ahead pass on activity text to detect skip reasons + question count.

    We don't keep the extracted exercise around — it's regenerated at preview
    time. This pass is purely to populate `has_image_options`, `has_matching`,
    and surface skip warnings in the manifest summary.
    """
    result = question_extractor.extract_exercise(
        activity_number=activity.activity_number,
        title=activity.title or f"Activité {activity.activity_number}",
        activity_text=activity.text,
        answer_key=None,
    )
    return {
        "skipped": result.skipped,
        "skip_reason": result.skip_reason,
        "question_count": len(result.questions),
        "warnings": result.warnings,
    }


def _build_activity_records(
    *,
    exercise_pdf: PdfDocument,
    answer_key: AnswerKey,
    transcripts: Transcripts,
    level: str,
    variant: str,
    github: Any | None,
    image_option_crops_by_activity: dict[int, list[Any]] | None = None,
) -> tuple[list[ActivityRecord], list[dict[str, Any]]]:
    """Detect activities and return manifest records + global warnings."""
    classified = detect_activities(exercise_pdf.pages)
    records: list[ActivityRecord] = []
    global_warnings: list[dict[str, Any]] = []
    image_crops = image_option_crops_by_activity or {}

    for activity in classified:
        warnings_for_activity: list[dict[str, Any]] = []

        # 1. Section classification
        section = activity.section
        if section == "UNKNOWN":
            warnings_for_activity.append(
                warning_codes.make_warning(
                    warning_codes.UNCLASSIFIED_ACTIVITY,
                    f"Could not classify activity {activity.activity_number} "
                    "as CE or CO. Manual review needed.",
                    field=f"activity[{activity.activity_number}]",
                )
            )

        # 2. Answer-key presence
        ak_for_activity = answer_key.for_activity(activity.activity_number)
        if ak_for_activity is None:
            warnings_for_activity.append(
                warning_codes.make_warning(
                    warning_codes.MISSING_ANSWER_KEY,
                    f"No answer key found for activity {activity.activity_number}.",
                    field=f"activity[{activity.activity_number}]",
                )
            )

        # 3. Track numbers + audio + transcript (CO only)
        track_numbers: list[int] = []
        audio_filename: str | None = None
        audio_exists: bool | None = None
        transcript: str | None = None
        extras: list[dict[str, Any]] = []
        if section == "CO":
            track_numbers = track_resolver.find_track_numbers(activity.text)
            audio_filename, audio_exists, track_warnings = (
                track_resolver.resolve_tracks_for_activity(
                    activity_number=activity.activity_number,
                    level=level,
                    variant=variant,
                    section="CO",
                    track_numbers=track_numbers,
                    github=github,
                )
            )
            warnings_for_activity.extend(track_warnings)
            transcript = transcripts.for_activity(activity.activity_number)
            extras = transcripts.extras_for_activity(activity.activity_number)
            if transcript is None:
                warnings_for_activity.append(
                    warning_codes.make_warning(
                        "missing_transcript",
                        f"Activity {activity.activity_number} is CO but no "
                        "transcript was found in the answer PDF.",
                        field=f"activity[{activity.activity_number}]",
                    )
                )

        # 4. Out-of-scope detection (image options / matching). When v2
        # crops are present for this activity, treat it as IN-scope rather
        # than skipping it.
        crops_for_activity = image_crops.get(activity.activity_number, [])
        peek = _peek_extraction(
            ActivityRecord(
                activity_number=activity.activity_number,
                section=section,
                chapter_number=activity.chapter_number,
                title=activity.title,
                page_start=activity.page_start,
                page_end=activity.page_end,
                text=activity.text,
            )
        )
        has_image_options = peek["skip_reason"] == warning_codes.IMAGE_OPTION_DETECTED
        has_matching = peek["skip_reason"] == warning_codes.MATCHING_EXERCISE_DETECTED
        for w in peek["warnings"]:
            if w["code"] == warning_codes.IMAGE_OPTION_DETECTED and crops_for_activity:
                # v2 handled it; demote to an info note instead of a skip warning.
                continue
            if w["code"] in (
                warning_codes.MATCHING_EXERCISE_DETECTED,
                warning_codes.UNCLASSIFIED_ACTIVITY,
                warning_codes.IMAGE_OPTION_DETECTED,
            ):
                warnings_for_activity.append(w)

        records.append(
            ActivityRecord(
                activity_number=activity.activity_number,
                section=section,
                chapter_number=activity.chapter_number,
                title=activity.title,
                page_start=activity.page_start,
                page_end=activity.page_end,
                text=activity.text,
                track_numbers=track_numbers,
                audio_filename=audio_filename,
                audio_exists=audio_exists,
                has_image_options=has_image_options,
                has_matching=has_matching,
                answer_key=ak_for_activity,
                transcript=transcript,
                extra_transcripts=extras,
                image_option_crops=crops_for_activity,
                warnings=warnings_for_activity,
            )
        )

    # Bubble up answer-parser-level conflicts (e.g. duplicate activity blocks).
    global_warnings.extend(answer_key.warnings)
    global_warnings.extend(transcripts.warnings)
    return records, global_warnings


def _activities_summary(records: list[ActivityRecord]) -> list[dict[str, Any]]:
    """Compact preview-friendly summary the agent reads first."""
    summary: list[dict[str, Any]] = []
    for record in records:
        summary.append({
            "activity_number": record.activity_number,
            "section": record.section,
            "chapter_number": record.chapter_number,
            "title": record.title,
            "page_start": record.page_start,
            "page_end": record.page_end,
            "track_numbers": record.track_numbers,
            "audio_filename": record.audio_filename,
            "audio_exists": record.audio_exists,
            "has_image_options": record.has_image_options,
            "has_image_option_crops": bool(record.image_option_crops),
            "has_matching": record.has_matching,
            "has_answer_key": record.answer_key is not None,
            "has_transcript": record.transcript is not None,
            "extra_transcript_count": len(record.extra_transcripts),
            "warning_count": len(record.warnings),
        })
    return summary


def analyze_delf_book_pdf(
    *,
    exercise_pdf_path: str,
    answer_pdf_path: str | None,
    level: str,
    variant: str,
    workspace_root: str | None = None,
    github: Any | None = None,
) -> dict[str, Any]:
    """Analyze a DELF book PDF and write a manifest to disk.

    Args:
        exercise_pdf_path: Absolute path to the exercise PDF.
        answer_pdf_path: Absolute path to the answer/transcript PDF. May be
            None — in that case every activity gets a `missing_answer_key`
            warning.
        level: DELF level (A1..C2).
        variant: e.g. 'tout-public-a2'.
        workspace_root: Override the default `.local/delf-extracts` dir
            (used by tests).
        github: Optional `GitHubDelfManager`-shaped object (used by tests
            to avoid hitting the real GitHub API).

    Returns:
        {success, analysis_id, manifest_path, activities_summary, warnings}
        on success.
        {success: false, error, message} on failure.
    """
    if not exercise_pdf_path or not os.path.exists(exercise_pdf_path):
        return {
            "success": False,
            "error": f"exercise_pdf_path not found: {exercise_pdf_path}",
            "message": "Provide an absolute path to a readable PDF file.",
        }
    if answer_pdf_path is not None and not os.path.exists(answer_pdf_path):
        return {
            "success": False,
            "error": f"answer_pdf_path not found: {answer_pdf_path}",
            "message": "Provide an absolute path to a readable PDF file or omit the parameter.",
        }

    analysis_id, workspace = init_workspace(workspace_root=workspace_root)

    try:
        exercise_pdf = read_pdf(
            exercise_pdf_path,
            render_to_dir=pages_dir(workspace),
        )
    except ValueError as exc:
        # Scanned PDF — surfaces as a clean error, not a crash.
        return {
            "success": False,
            "analysis_id": analysis_id,
            "error": str(exc),
            "warning_code": warning_codes.SCANNED_PDF,
        }
    except ImportError as exc:
        return {
            "success": False,
            "error": str(exc),
            "message": "pymupdf is missing — install backend/requirements-delf-pdf.txt.",
        }

    answer_key = AnswerKey()
    transcripts = Transcripts()
    if answer_pdf_path is not None:
        try:
            answer_pdf = read_pdf(answer_pdf_path, render_to_dir=None)
        except ValueError as exc:
            return {
                "success": False,
                "analysis_id": analysis_id,
                "error": f"Answer PDF appears to be scanned: {exc}",
                "warning_code": warning_codes.SCANNED_PDF,
            }
        answer_key = parse_answer_pdf(answer_pdf.pages)
        transcripts = parse_transcript_pdf(answer_pdf.pages)

    # v2 image-option extraction. Imported lazily so the module loads when
    # Pillow is missing — only callers actually using image-option PDFs
    # trip the dep check.
    image_crops_by_activity: dict[int, list[Any]] = {}
    image_extraction_warning: dict[str, Any] | None = None
    try:
        from .image_option_extractor import extract_image_options_for_activities

        image_crops_by_activity = extract_image_options_for_activities(
            exercise_pdf_path=exercise_pdf_path,
            exercise_pdf=exercise_pdf,
            workspace_dir=workspace,
        )
    except ImportError:
        # Pillow missing — leave image-option support disabled. v1 warn-and-skip
        # behavior takes over via _peek_extraction.
        pass
    except Exception as exc:
        # Best-effort; never block analyze. Surface as a global warning.
        image_extraction_warning = warning_codes.make_warning(
            "image_extraction_failed",
            f"Image-option extraction failed: {exc}. "
            "Falling back to v1 warn-and-skip behavior.",
        )

    records, global_warnings = _build_activity_records(
        exercise_pdf=exercise_pdf,
        answer_key=answer_key,
        transcripts=transcripts,
        level=level,
        variant=variant,
        github=github,
        image_option_crops_by_activity=image_crops_by_activity,
    )
    if image_extraction_warning is not None:
        global_warnings.append(image_extraction_warning)

    if answer_pdf_path is None:
        global_warnings.insert(
            0,
            warning_codes.make_warning(
                warning_codes.MISSING_ANSWER_KEY,
                "No answer PDF provided — every activity will be missing "
                "its answer key. Save will be blocked until answers are set.",
            ),
        )

    manifest = Manifest(
        analysis_id=analysis_id,
        level=level.upper(),
        variant=variant,
        exercise_pdf_path=os.path.abspath(exercise_pdf_path),
        answer_pdf_path=(
            os.path.abspath(answer_pdf_path) if answer_pdf_path else None
        ),
        workspace_dir=workspace,
        activities=records,
        warnings=global_warnings,
    )
    manifest_path = write_manifest(manifest)

    return {
        "success": True,
        "analysis_id": analysis_id,
        "manifest_path": manifest_path,
        "workspace_dir": workspace,
        "page_count": exercise_pdf.page_count,
        "activity_count": len(records),
        "activities_summary": _activities_summary(records),
        "warnings": global_warnings,
        "message": (
            f"Analyzed {len(records)} activities across {exercise_pdf.page_count} "
            "pages. Call preview_delf_book_extraction with this analysis_id."
        ),
    }


# Re-export for convenience.
read_manifest = manifest_module.read_manifest

__all__ = ["analyze_delf_book_pdf", "read_manifest"]
