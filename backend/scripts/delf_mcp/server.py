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
- publish_delf_draft    (status draft -> active)

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

from scripts.delf_mcp.delete_service import delete_draft  # noqa: E402
from scripts.delf_mcp.draft_service import save_draft  # noqa: E402
from scripts.delf_mcp.get_service import get_draft  # noqa: E402
from scripts.delf_mcp.list_service import list_drafts  # noqa: E402
from scripts.delf_mcp.naming_service import suggest_delf_test_id as suggest_test_id  # noqa: E402
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


def main() -> None:
    """Entry point — starts the MCP server over stdio."""
    mcp.run()


if __name__ == "__main__":
    main()
