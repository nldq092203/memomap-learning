"""Warning codes for the PDF ingestion pipeline.

Every warning carries a stable `code` so the agent can branch on it
deterministically, plus a human-readable `message` for the review UI.
Optional `field` and `context` carry locator information.
"""

from __future__ import annotations

from typing import Any


# v1 codes. New codes for v2/v3/v4 should land here too.
SCANNED_PDF = "scanned_pdf"
OCR_APPLIED = "ocr_applied"
OCR_FAILED = "ocr_failed"
IMAGE_OPTION_DETECTED = "image_option_detected"
MATCHING_EXERCISE_DETECTED = "matching_exercise_detected"
EXTRA_TRANSCRIPT_DETECTED = "extra_transcript_detected"
MISSING_AUDIO = "missing_audio"
MISSING_ANSWER_KEY = "missing_answer_key"
AMBIGUOUS_ANSWER_KEY = "ambiguous_answer_key"
POINTS_DEFAULTED = "points_defaulted"
UNCLASSIFIED_ACTIVITY = "unclassified_activity"
LOW_TEXT_CONFIDENCE = "low_text_confidence"
EMPTY_PAGE = "empty_page"
VALIDATION_FAILED = "validation_failed"
MISSING_ASSET = "missing_asset"


def make_warning(
    code: str,
    message: str,
    *,
    field: str | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a structured warning dict."""
    warning: dict[str, Any] = {"code": code, "message": message}
    if field is not None:
        warning["field"] = field
    if context:
        warning["context"] = context
    return warning


__all__ = [
    "AMBIGUOUS_ANSWER_KEY",
    "EMPTY_PAGE",
    "EXTRA_TRANSCRIPT_DETECTED",
    "IMAGE_OPTION_DETECTED",
    "LOW_TEXT_CONFIDENCE",
    "MATCHING_EXERCISE_DETECTED",
    "MISSING_ANSWER_KEY",
    "MISSING_ASSET",
    "MISSING_AUDIO",
    "OCR_APPLIED",
    "OCR_FAILED",
    "POINTS_DEFAULTED",
    "SCANNED_PDF",
    "UNCLASSIFIED_ACTIVITY",
    "VALIDATION_FAILED",
    "make_warning",
]
