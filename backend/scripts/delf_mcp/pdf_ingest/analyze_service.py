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
import re
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
from .ocr_service import ocr_pdf
from .pdf_reader import PdfDocument, read_pdf
from .transcript_parser import Transcripts, parse_transcript_pdf


OCR_MODES = {"auto", "off", "force"}


def _source_book_id(pdf_path: str) -> str:
    stem = os.path.splitext(os.path.basename(pdf_path))[0]
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-")
    return normalized or stem or "unknown-book"


def _create_pdf_page_subset(
    *,
    pdf_path: str,
    page_range: list[int],
    workspace: str,
) -> tuple[str, int]:
    """Create a 1-indexed inclusive page-range subset for faster OCR."""
    if len(page_range) != 2:
        raise ValueError("page_range must be [start_page, end_page]")
    start, end = int(page_range[0]), int(page_range[1])
    if start < 1 or end < start:
        raise ValueError("page_range must be 1-indexed and ascending")

    try:
        import fitz  # pymupdf
    except ImportError as exc:
        raise ImportError(
            "pymupdf is required for page_range PDF slicing. "
            "Install backend/requirements-delf-pdf.txt."
        ) from exc

    source = fitz.open(pdf_path)
    try:
        if end > source.page_count:
            raise ValueError(
                f"page_range end {end} exceeds PDF page_count {source.page_count}"
            )
        out_path = os.path.join(workspace, "source-subset.pdf")
        subset = fitz.open()
        try:
            subset.insert_pdf(source, from_page=start - 1, to_page=end - 1)
            subset.save(out_path)
        finally:
            subset.close()
    finally:
        source.close()
    return out_path, start - 1


def _read_pdf_with_optional_ocr(
    *,
    pdf_path: str,
    render_to_dir: str | None,
    workspace: str,
    role: str,
    ocr_mode: str,
    ocr_language: str,
) -> tuple[PdfDocument, str, list[dict[str, Any]]]:
    """Read a PDF, optionally OCRing scanned input first."""
    warnings: list[dict[str, Any]] = []

    def _ocr_and_read(*, force_ocr: bool) -> tuple[PdfDocument, str]:
        output_path = os.path.join(workspace, "ocr", f"{role}.ocr.pdf")
        result = ocr_pdf(
            input_pdf_path=pdf_path,
            output_pdf_path=output_path,
            language=ocr_language,
            force_ocr=force_ocr,
        )
        warnings.append(
            warning_codes.make_warning(
                warning_codes.OCR_APPLIED,
                f"OCR was applied to the {role} PDF before analysis.",
                field=f"{role}_pdf_path",
                context={
                    "input_pdf_path": os.path.abspath(pdf_path),
                    "ocr_pdf_path": result.output_pdf_path,
                    "command": result.command,
                },
            )
        )
        return read_pdf(result.output_pdf_path, render_to_dir=render_to_dir), result.output_pdf_path

    if ocr_mode == "force":
        document, effective_path = _ocr_and_read(force_ocr=True)
        return document, effective_path, warnings

    try:
        return read_pdf(pdf_path, render_to_dir=render_to_dir), pdf_path, warnings
    except ValueError:
        if ocr_mode != "auto":
            raise
        try:
            document, effective_path = _ocr_and_read(force_ocr=True)
            return document, effective_path, warnings
        except Exception as exc:
            raise RuntimeError(
                "PDF appears to be scanned and OCR fallback failed: "
                f"{exc}"
            ) from exc


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
        has_image_options = (
            peek["skip_reason"] == warning_codes.IMAGE_OPTION_DETECTED
            or bool(crops_for_activity)
        )
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
    ocr_mode: str = "auto",
    ocr_language: str = "fra",
    page_range: list[int] | None = None,
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
        ocr_mode: `auto` OCRs only scanned PDFs, `force` OCRs before reading,
            and `off` preserves born-digital-only behavior.
        ocr_language: Tesseract language code passed to ocrmypdf.
        page_range: Optional 1-indexed inclusive `[start_page, end_page]`.
            Used to OCR/import one workbook section while preserving source
            book identity and original page numbers.
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
    if ocr_mode not in OCR_MODES:
        return {
            "success": False,
            "error": f"Invalid ocr_mode '{ocr_mode}'. Expected one of: auto, off, force.",
        }

    analysis_id, workspace = init_workspace(workspace_root=workspace_root)
    global_warnings: list[dict[str, Any]] = []
    source_book_id = _source_book_id(exercise_pdf_path)
    source_page_offset = 0
    effective_exercise_pdf_path = exercise_pdf_path
    effective_answer_pdf_path = answer_pdf_path

    if page_range is not None:
        try:
            effective_exercise_pdf_path, source_page_offset = _create_pdf_page_subset(
                pdf_path=exercise_pdf_path,
                page_range=page_range,
                workspace=workspace,
            )
        except (ImportError, ValueError) as exc:
            return {
                "success": False,
                "analysis_id": analysis_id,
                "error": str(exc),
            }
        global_warnings.append(
            warning_codes.make_warning(
                "page_range_applied",
                f"Analyzing source PDF pages {page_range[0]}-{page_range[1]} only.",
                field="page_range",
                context={
                    "source_pdf_path": os.path.abspath(exercise_pdf_path),
                    "subset_pdf_path": os.path.abspath(effective_exercise_pdf_path),
                    "source_page_offset": source_page_offset,
                },
            )
        )

    try:
        exercise_pdf, effective_exercise_pdf_path, ocr_warnings = _read_pdf_with_optional_ocr(
            pdf_path=effective_exercise_pdf_path,
            render_to_dir=pages_dir(workspace),
            workspace=workspace,
            role="exercise",
            ocr_mode=ocr_mode,
            ocr_language=ocr_language,
        )
        global_warnings.extend(ocr_warnings)
    except ValueError as exc:
        # Scanned PDF with OCR disabled — surfaces as a clean error.
        return {
            "success": False,
            "analysis_id": analysis_id,
            "error": str(exc),
            "warning_code": warning_codes.SCANNED_PDF,
            "message": (
                "This PDF appears to be scanned. Re-run with ocr_mode='auto' "
                "or install OCR tools: brew install ocrmypdf tesseract tesseract-lang"
            ),
        }
    except RuntimeError as exc:
        return {
            "success": False,
            "analysis_id": analysis_id,
            "error": str(exc),
            "warning_code": warning_codes.OCR_FAILED,
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
            answer_pdf, effective_answer_pdf_path, ocr_warnings = _read_pdf_with_optional_ocr(
                pdf_path=answer_pdf_path,
                render_to_dir=None,
                workspace=workspace,
                role="answer",
                ocr_mode=ocr_mode,
                ocr_language=ocr_language,
            )
            global_warnings.extend(ocr_warnings)
        except ValueError as exc:
            return {
                "success": False,
                "analysis_id": analysis_id,
                "error": f"Answer PDF appears to be scanned: {exc}",
                "warning_code": warning_codes.SCANNED_PDF,
                "message": (
                    "The answer PDF appears to be scanned. Re-run with "
                    "ocr_mode='auto' or install OCR tools: "
                    "brew install ocrmypdf tesseract tesseract-lang"
                ),
            }
        except RuntimeError as exc:
            return {
                "success": False,
                "analysis_id": analysis_id,
                "error": str(exc),
                "warning_code": warning_codes.OCR_FAILED,
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
            exercise_pdf_path=effective_exercise_pdf_path,
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

    records, record_warnings = _build_activity_records(
        exercise_pdf=exercise_pdf,
        answer_key=answer_key,
        transcripts=transcripts,
        level=level,
        variant=variant,
        github=github,
        image_option_crops_by_activity=image_crops_by_activity,
    )
    global_warnings.extend(record_warnings)
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
        exercise_pdf_path=os.path.abspath(effective_exercise_pdf_path),
        answer_pdf_path=(
            os.path.abspath(effective_answer_pdf_path) if effective_answer_pdf_path else None
        ),
        workspace_dir=workspace,
        source_book_id=source_book_id,
        source_page_offset=source_page_offset,
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
