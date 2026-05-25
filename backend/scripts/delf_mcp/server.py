"""DELF MCP server — stdio transport.

Exposes these tools to AI agents:

Validation / naming:
- validate_delf_content
- suggest_delf_test_id

Draft lifecycle:
- save_delf_draft       (create)
- list_delf_drafts      (list)
- get_delf_draft        (read full content)
- update_delf_draft     (overwrite content)
- delete_delf_draft     (remove)
- publish_delf_draft    (status draft -> active, with asset verification)

Asset pipeline (Phase 2):
- crop_screenshot_to_webp        (local crop + WebP encode preview)
- upload_delf_asset              (one image/audio file upload)
- process_screenshot_options     (screenshot -> crops -> uploaded WebPs)
- list_delf_assets               (list assets/ or audio/ for a scope)
- verify_delf_asset_references   (cross-check JSON img_url / audio_filename)
- resolve_delf_audio_filename    (track number -> canonical audio filename)
- migrate_delf_legacy_assets     (copy flat image refs to structured paths)

PDF book ingestion (Phase 3, v1):
- analyze_delf_book_pdf          (render + detect activities + write manifest)
- preview_delf_book_extraction   (build DelfTestPaper candidates from manifest)
- save_delf_book_drafts          (validate + verify + save_or_update drafts)

Run from the `backend/` directory:

    uv run python -m scripts.delf_mcp.server
"""

from __future__ import annotations

import os
import sys
from typing import Any

# Allow `python scripts/delf_mcp/server.py` from `backend/` to resolve `src.*`.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from mcp.server.fastmcp import FastMCP  # noqa: E402

from scripts.delf_mcp.assets.audio_naming import (  # noqa: E402
    resolve_delf_audio_filename as resolve_audio_filename,
)
from scripts.delf_mcp.assets.image_pipeline import (  # noqa: E402
    crop_screenshot_to_webp as do_crop_screenshot,
)
from scripts.delf_mcp.assets.listing_service import (  # noqa: E402
    list_delf_assets as do_list_assets,
)
from scripts.delf_mcp.assets.migration_service import (  # noqa: E402
    migrate_legacy_image_assets as do_migrate_legacy_assets,
)
from scripts.delf_mcp.assets.orchestration import (  # noqa: E402
    process_screenshot_options as do_process_screenshot,
)
from scripts.delf_mcp.assets.upload_service import (  # noqa: E402
    upload_delf_asset as do_upload_asset,
)
from scripts.delf_mcp.assets.verify_service import (  # noqa: E402
    verify_delf_asset_references as do_verify_assets,
)
from scripts.delf_mcp.delete_service import delete_draft  # noqa: E402
from scripts.delf_mcp.draft_service import save_draft  # noqa: E402
from scripts.delf_mcp.get_service import get_draft  # noqa: E402
from scripts.delf_mcp.list_service import list_drafts  # noqa: E402
from scripts.delf_mcp.naming_service import suggest_delf_test_id as suggest_test_id  # noqa: E402
from scripts.delf_mcp.pdf_ingest.analyze_service import (  # noqa: E402
    analyze_delf_book_pdf as do_analyze_book_pdf,
)
from scripts.delf_mcp.pdf_ingest.preview_service import (  # noqa: E402
    preview_delf_book_extraction as do_preview_book_extraction,
)
from scripts.delf_mcp.pdf_ingest.save_service import (  # noqa: E402
    save_delf_book_drafts as do_save_book_drafts,
)
from scripts.delf_mcp.publish_service import publish_draft  # noqa: E402
from scripts.delf_mcp.update_service import update_draft  # noqa: E402
from scripts.delf_mcp.validation import validate_content_for_tool  # noqa: E402


mcp = FastMCP("delf-ingest")


# ---------------------------------------------------------------------------
# Validation & naming
# ---------------------------------------------------------------------------


@mcp.tool()
def validate_delf_content(content: Any) -> dict[str, Any]:
    """Validate DelfTestPaper JSON against the backend Pydantic schema.

    Args:
        content: DelfTestPaper payload as a JSON object or JSON string.

    Returns:
        On success: {valid: true, message, summary: {test_id, section,
        exercise_count, total_questions}}.
        On failure: {valid: false, errors: [{field, message, type}, ...],
        error_count}.
    """
    return validate_content_for_tool(content)


@mcp.tool()
def suggest_delf_test_id(
    level: str,
    variant: str,
    section: str,
    title: str | None = None,
) -> dict[str, Any]:
    """Suggest a DELF test_id after reading existing GitHub and DB data.

    Lists GitHub JSON files under
    delf/{level_lower}/{variant}/{section}/tp/ and reads all matching
    `delf_test_papers` metadata rows, including drafts and active records.

    Args:
        level: A1, A2, B1, B2, C1, or C2.
        variant: Exam variant (e.g. 'tout-public-a2').
        section: Exam section (e.g. 'CE').
        title: Optional paper title used only if the existing corpus uses
            title slugs in test IDs.

    Returns:
        On success: {success: true, suggested_test_id, convention,
        github_existing_test_ids, db_existing_records, all_existing_test_ids}.
        On failure: {success: false, error, message}.
    """
    return suggest_test_id(
        level=level,
        variant=variant,
        section=section,
        title=title,
    )


# ---------------------------------------------------------------------------
# Draft lifecycle: save, list, get, update, delete, publish
# ---------------------------------------------------------------------------


@mcp.tool()
def save_delf_draft(
    level: str,
    variant: str,
    section: str,
    content: Any,
) -> dict[str, Any]:
    """Validate and save a DelfTestPaper as a draft (status='draft').

    Writes JSON to GitHub at delf/{level_lower}/{variant}/{section}/tp/{test_id}.json,
    inserts a metadata row in `delf_test_papers`, and invalidates the content
    cache. Returns a preview URL built from Config.WEB_ORIGIN.

    Args:
        level: A1, A2, B1, B2, C1, or C2.
        variant: Exam variant (e.g. 'tout-public-a2').
        section: Exam section (e.g. 'CE').
        content: DelfTestPaper payload as JSON object or JSON string.

    Returns:
        On success: {success: true, draft_id, test_id, status: 'draft',
        github_path, preview_url, message}.
        On validation failure: {success: false, valid: false, errors,
        error_count, message}.
        On duplicate: {success: false, error, suggestion, suggested_test_id}.
    """
    return save_draft(
        level=level,
        variant=variant,
        section=section,
        content=content,
    )


@mcp.tool()
def list_delf_drafts(
    level: str | None = None,
    section: str | None = None,
    variant: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """List existing drafts (status='draft'), newest first.

    Args:
        level: Optional filter, A1..C2.
        section: Optional filter (e.g. 'CE').
        variant: Optional filter (e.g. 'tout-public-a2').
        limit: Max rows to return (1-100, default 50).

    Returns:
        {success: true, drafts: [{draft_id, test_id, level, variant, section,
        exercise_count, audio_filename, github_path, created_at}], total, limit}.
    """
    return list_drafts(
        level=level,
        section=section,
        variant=variant,
        limit=limit,
    )


@mcp.tool()
def get_delf_draft(draft_id: str) -> dict[str, Any]:
    """Return a draft's full metadata and content (fetched fresh from GitHub).

    Args:
        draft_id: UUID of the draft (the `id` column).

    Returns:
        On success: {success: true, draft_id, test_id, level, variant, section,
        status, exercise_count, audio_filename, github_path, created_at,
        updated_at, preview_url, content, validation}.
        On failure: {success: false, error}.

    If the JSON file cannot be loaded from GitHub, the response still includes
    metadata plus a `content_error` field. Otherwise `validation` reports
    whether the persisted content still passes the schema + DELF rules.
    """
    return get_draft(draft_id=draft_id)


@mcp.tool()
def update_delf_draft(
    draft_id: str,
    content: Any,
) -> dict[str, Any]:
    """Overwrite an existing draft's content (validated before saving).

    Args:
        draft_id: UUID of the draft to update.
        content: New DelfTestPaper payload as JSON object or JSON string.

    Returns:
        On success: {success: true, draft_id, test_id, status: 'draft',
        github_path, preview_url, message}.
        On validation failure: {success: false, valid: false, errors,
        error_count, message}.
        On status mismatch / rename attempt: {success: false, error, message}.
    """
    return update_draft(draft_id=draft_id, content=content)


@mcp.tool()
def delete_delf_draft(
    draft_id: str,
    confirm_delete: bool = False,
    delete_github_file: bool = False,
) -> dict[str, Any]:
    """Delete a draft. Requires `confirm_delete=true`.

    Args:
        draft_id: UUID of the draft to delete.
        confirm_delete: Must be true to proceed.
        delete_github_file: If true, also delete the GitHub JSON file
            (default false — the file is preserved).

    Returns:
        {success, draft_id, test_id, github_path, github_file_deleted, message}.

    Only drafts (status='draft') can be deleted. Active/archived papers are
    rejected.
    """
    return delete_draft(
        draft_id=draft_id,
        confirm_delete=confirm_delete,
        delete_github_file=delete_github_file,
    )


@mcp.tool()
def publish_delf_draft(
    draft_id: str | None = None,
    test_id: str | None = None,
    level: str | None = None,
    variant: str | None = None,
    section: str | None = None,
    confirm_publish: bool = False,
) -> dict[str, Any]:
    """Publish a draft (status draft → active). Requires `confirm_publish=true`.

    Identify the target by either `draft_id` OR
    (`test_id`, `level`, `variant`, `section`). The content is re-fetched from
    GitHub and re-validated; publishing is refused if the persisted JSON no
    longer passes validation.

    Args:
        draft_id: UUID of the draft (preferred when known).
        test_id: Alternative — paper test_id, used with level/variant/section.
        level, variant, section: Required when identifying by `test_id`.
        confirm_publish: Must be true to proceed.

    Returns:
        {success, draft_id, test_id, level, variant, section, status: 'active',
        student_url, message}.
    """
    return publish_draft(
        draft_id=draft_id,
        test_id=test_id,
        level=level,
        variant=variant,
        section=section,
        confirm_publish=confirm_publish,
    )


# ---------------------------------------------------------------------------
# Asset pipeline (Phase 2)
# ---------------------------------------------------------------------------


@mcp.tool()
def crop_screenshot_to_webp(
    screenshot_base64: str,
    crops: list[dict[str, Any]] | None = None,
    auto_detect: dict[str, Any] | None = None,
    webp_quality: int = 92,
) -> dict[str, Any]:
    """Crop one or more regions out of a base64 screenshot and return WebP bytes.

    Pure-local: no DB, GitHub, or network. Useful to preview a crop before
    committing it through `upload_delf_asset` or `process_screenshot_options`.

    Args:
        screenshot_base64: Base64-encoded PNG/JPG/WEBP screenshot.
        crops: List of `{label, left, top, right, bottom}` boxes.
        auto_detect: Alternative — `{region, expected_count, min_area?,
            padding?}`. When set, ignores `crops`.
        webp_quality: 1-100, default 92.

    Returns:
        On success: `{success: true, mode, image_size, crops: [{label,
        content_base64, width_px, height_px, byte_size}]}`.
        On failure: `{success: false, error|errors, error_count?}`.
    """
    return do_crop_screenshot(
        screenshot_base64=screenshot_base64,
        crops=crops,
        auto_detect=auto_detect,
        webp_quality=webp_quality,
    )


@mcp.tool()
def upload_delf_asset(
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
) -> dict[str, Any]:
    """Upload one image or audio file to GitHub for a DELF scope.

    Args:
        level: A1..C2.
        variant: e.g. 'tout-public-a2'.
        section: e.g. 'CE' or 'CO'.
        test_id: Used for the commit message and structured image paths.
        filename: Bare filename with the correct extension.
        content_base64: File bytes encoded as base64.
        kind: 'image' (→ assets/) or 'audio' (→ audio/).
        overwrite: If false (default) refuses to replace an existing file.
        question_number + label: When both are provided for image uploads,
            writes to `assets/{test_id}/qNN/{label}.ext`. Without them,
            preserves the legacy flat `assets/{filename}` upload path.

    Returns:
        `{success, github_path, relative_path, kind, byte_size, overwritten}`.
        `relative_path` is what should appear in the JSON
        (`assets/<filename>` for images, bare `<filename>` for audio).
    """
    return do_upload_asset(
        level=level,
        variant=variant,
        section=section,
        test_id=test_id,
        filename=filename,
        content_base64=content_base64,
        kind=kind,
        overwrite=overwrite,
        question_number=question_number,
        label=label,
    )


@mcp.tool()
def process_screenshot_options(
    level: str,
    variant: str,
    section: str,
    test_id: str,
    screenshot_base64: str,
    questions: list[dict[str, Any]],
    webp_quality: int = 92,
    overwrite: bool = False,
) -> dict[str, Any]:
    """One-shot: crop screenshot → WebP → upload → return `img_url` strings.

    Image assets use the structured convention
    `assets/{test_id}/qNN/{label}.webp`. Partial failures are reported
    per-option in `failures`; successful uploads still appear in `results`.

    Args:
        questions: `[{question_number, options: [{label, crop?}],
            auto_detect?}, ...]`.
    """
    return do_process_screenshot(
        level=level,
        variant=variant,
        section=section,
        test_id=test_id,
        screenshot_base64=screenshot_base64,
        questions=questions,
        webp_quality=webp_quality,
        overwrite=overwrite,
    )


@mcp.tool()
def list_delf_assets(
    level: str,
    variant: str,
    section: str,
    kind: str = "image",
) -> dict[str, Any]:
    """List existing image (or audio) filenames for a scope.

    A missing directory yields an empty list (not an error).
    """
    return do_list_assets(
        level=level,
        variant=variant,
        section=section,
        kind=kind,
    )


@mcp.tool()
def verify_delf_asset_references(
    level: str,
    variant: str,
    section: str,
    content: Any,
) -> dict[str, Any]:
    """Cross-check every `img_url` and `audio_filename` against GitHub.

    Returns `all_present: true` only when every reference resolves; missing
    references are reported with their exact JSON field path so the agent
    can fix them. `publish_delf_draft` invokes this internally and refuses
    to publish when any reference is missing.
    """
    return do_verify_assets(
        level=level,
        variant=variant,
        section=section,
        content=content,
    )


@mcp.tool()
def resolve_delf_audio_filename(
    level: str,
    variant: str,
    section: str,
    track_number: int,
) -> dict[str, Any]:
    """Resolve a CO track number into the canonical GitHub audio filename.

    Encapsulates per-level naming quirks (`DELF_TP_A2_…` vs `Delf_TP_B1_…`)
    so the agent never has to template the filename in its prompt. The
    returned `audio_filename_value` is the exact string to paste into
    `DelfTestPaper.audio_filename`. `exists` is checked against GitHub.
    """
    return resolve_audio_filename(
        level=level,
        variant=variant,
        section=section,
        track_number=track_number,
    )


@mcp.tool()
def migrate_delf_legacy_assets(
    level: str,
    variant: str,
    section: str,
    test_id: str,
    dry_run: bool = True,
    confirm_write: bool = False,
    overwrite: bool = False,
    webp_quality: int = 92,
) -> dict[str, Any]:
    """Convert image refs to structured per-paper WebP asset paths.

    Legacy source files are copied, never deleted. By default this is a dry
    run. To write, set `dry_run=false` and `confirm_write=true`.

    Converts refs like `assets/tp01-q1-a.png` or `assets/tp01-q1-a.webp` to
    `assets/{test_id}/qNN/{label}.webp`, updates the paper JSON, and verifies
    all updated refs before committing the JSON. PNG/JPG/JPEG sources are
    converted to WebP.
    """
    return do_migrate_legacy_assets(
        level=level,
        variant=variant,
        section=section,
        test_id=test_id,
        dry_run=dry_run,
        confirm_write=confirm_write,
        overwrite=overwrite,
        webp_quality=webp_quality,
    )


# ---------------------------------------------------------------------------
# PDF book ingestion (Phase 3)
# ---------------------------------------------------------------------------


@mcp.tool()
def analyze_delf_book_pdf(
    exercise_pdf_path: str,
    answer_pdf_path: str | None,
    level: str,
    variant: str,
    ocr_mode: str = "auto",
    ocr_language: str = "fra",
    page_range: list[int] | None = None,
) -> dict[str, Any]:
    """Analyze a DELF book PDF: detect activities, classify CE/CO, write manifest.

    Renders each exercise-PDF page to `.local/delf-extracts/{analysis_id}/`,
    parses the answer PDF for answer keys, resolves CO audio filenames via
    `resolve_delf_audio_filename`, and persists a manifest the agent uses to
    drive `preview_delf_book_extraction`.

    Scanned PDFs are OCRed with `ocrmypdf` when `ocr_mode` is "auto" or
    "force". CE flat/nested MCQ and image-option exercises are supported.
    Matching exercises are detected and skipped with a
    `matching_exercise_detected` warning.

    Args:
        exercise_pdf_path: Absolute path to the exercise PDF file.
        answer_pdf_path: Absolute path to the answer/transcript PDF, or
            None to skip answer parsing (every activity will then get a
            `missing_answer_key` warning).
        level: A1, A2, B1, B2, C1, or C2.
        variant: e.g. 'tout-public-a2'.
        ocr_mode: "auto" (default), "off", or "force".
        ocr_language: Tesseract language code, default "fra".
        page_range: Optional 1-indexed inclusive `[start_page, end_page]`.

    Returns:
        On success: {success: true, analysis_id, manifest_path,
        workspace_dir, page_count, activity_count, activities_summary,
        warnings, message}.
        On failure: {success: false, error, message?}.
    """
    return do_analyze_book_pdf(
        exercise_pdf_path=exercise_pdf_path,
        answer_pdf_path=answer_pdf_path,
        level=level,
        variant=variant,
        ocr_mode=ocr_mode,
        ocr_language=ocr_language,
        page_range=page_range,
    )


@mcp.tool()
def preview_delf_book_extraction(
    analysis_id: str,
    sections: list[str] | None = None,
    activity_range: list[int] | None = None,
    split_co_by_activity: bool = False,
) -> dict[str, Any]:
    """Build DelfTestPaper candidates from a manifest. Validates each.

    Reads the manifest written by `analyze_delf_book_pdf`, groups activities
    by (chapter_number, section), checks DB + GitHub for existing test_ids,
    builds one paper per group, runs `validate_delf_content` on each, and
    returns the proposals for human review. No GitHub writes, no DB writes.

    Args:
        analysis_id: ID returned by `analyze_delf_book_pdf`.
        sections: Optional filter, e.g. ["CE"], ["CO"], or ["CE", "CO"].
        activity_range: Optional `[lo, hi]` inclusive bounds on activity_number.
        split_co_by_activity: When true, each CO activity becomes one paper.

    Returns:
        {success, analysis_id, papers: [{proposed_test_id, content,
        validation, warnings, source_pages, source_activities, chapter_number}],
        warnings}.
    """
    return do_preview_book_extraction(
        analysis_id=analysis_id,
        sections=sections,
        activity_range=activity_range,
        split_co_by_activity=split_co_by_activity,
    )


@mcp.tool()
def save_delf_book_drafts(
    analysis_id: str,
    selected_papers: list[dict[str, Any]],
    confirm_save: bool = False,
) -> dict[str, Any]:
    """Save approved DelfTestPaper drafts from a PDF analysis. Re-validates.

    For each paper:
    - Re-runs `validate_delf_content`. Skips with `validation_failed` if it
      fails.
    - Re-runs `verify_delf_asset_references`. Skips with `missing_asset`
      if any referenced audio or image is absent in GitHub.
    - If the test_id has no existing paper → `save_delf_draft`.
    - If the test_id has an existing draft → `update_delf_draft`.
    - If the test_id has an active/archived DB row or GitHub-only JSON file →
      skip before uploading assets or writing JSON.

    Requires `confirm_save=true`. Mirrors the `publish_delf_draft` ceremony.

    Args:
        analysis_id: ID returned by `analyze_delf_book_pdf`. Used to read
            the manifest's level/variant.
        selected_papers: `[{content: DelfTestPaper-shape dict}, ...]`. The
            content may have been hand-edited after preview.
        confirm_save: Must be True. Defaults to False so a bare call no-ops.

    Returns:
        {success, analysis_id, saved: [{test_id, route, draft_id,
        github_path, preview_url}], skipped: [{test_id, reason, details}],
        saved_count, skipped_count}.
    """
    return do_save_book_drafts(
        analysis_id=analysis_id,
        selected_papers=selected_papers,
        confirm_save=confirm_save,
    )


def main() -> None:
    """Entry point — starts the MCP server over stdio."""
    mcp.run()


if __name__ == "__main__":
    main()
