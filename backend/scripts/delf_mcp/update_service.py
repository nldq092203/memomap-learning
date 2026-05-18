"""Update an existing DELF draft's content (validated) in DB + GitHub."""

from __future__ import annotations

from typing import Any

from src.config import Config
from src.extensions import logger
from src.shared.delf_practice.content_service import invalidate_delf_content_cache
from src.shared.delf_practice.github_manager import GitHubDelfManager
from src.shared.delf_practice.schemas import DelfTestPaper
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository

from scripts.delf_mcp.validation import validate_content


def _build_preview_url(
    level: str, variant: str, section: str, test_id: str
) -> str:
    origin = getattr(Config, "WEB_ORIGIN", "http://localhost:3000").rstrip("/")
    return f"{origin}/learning/delf-practice/{level}/{variant}/{section}/{test_id}"


def update_draft(
    *,
    draft_id: str,
    content: Any,
    repo: DelfTestPaperRepository | None = None,
    github_mgr: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Validate then overwrite an existing draft's content in DB + GitHub.

    - Refuses to update non-draft papers (active or archived).
    - Refuses to rename: `content.test_id` must equal the existing DB row.
    - Uses `create_or_update_file` so an existing GitHub file is replaced.
    """
    # 1. Validate the new content first
    validation = validate_content(content)
    if not validation["valid"]:
        return {
            "success": False,
            "valid": False,
            "errors": validation["errors"],
            "error_count": validation["error_count"],
            "message": "Content failed validation; the draft was not updated.",
        }

    paper_model: DelfTestPaper = validation["paper"]

    # 2. Resolve target row
    repo = repo or DelfTestPaperRepository()
    db_row = repo.get_by_id(draft_id)
    if db_row is None:
        return {
            "success": False,
            "error": f"No DELF paper found with draft_id '{draft_id}'",
        }
    if db_row.status != "draft":
        return {
            "success": False,
            "error": (
                f"Refusing to update paper '{db_row.test_id}': status is "
                f"'{db_row.status}', not 'draft'"
            ),
            "message": "Only drafts can be updated through this tool.",
        }
    if paper_model.test_id != db_row.test_id:
        return {
            "success": False,
            "error": (
                f"content.test_id '{paper_model.test_id}' does not match the "
                f"existing draft's test_id '{db_row.test_id}'"
            ),
            "message": (
                "Renaming a draft is not supported. Keep the same test_id, or "
                "delete and re-save instead."
            ),
        }

    # 3. Write JSON to GitHub (overwrite allowed for updates)
    github_mgr = github_mgr or GitHubDelfManager()
    json_payload = paper_model.model_dump_json(indent=2, by_alias=True)
    try:
        github_mgr.create_or_update_file(
            file_path=db_row.github_path,
            content=json_payload.encode("utf-8"),
            commit_message=f"chore(delf): update draft {db_row.test_id} via MCP",
        )
    except Exception as exc:
        return {
            "success": False,
            "error": f"GitHub commit failed: {exc}",
            "message": "Draft was not updated. Verify GITHUB_TOKEN and try again.",
        }

    # 4. Update DB row's exercise_count / audio_filename to match new content
    repo.update(
        db_row.id,
        exercise_count=len(paper_model.exercises),
        audio_filename=paper_model.audio_filename,
    )

    # 5. Invalidate cache
    try:
        invalidate_delf_content_cache(
            level=db_row.level,
            variant=db_row.variant,
            section=db_row.section,
            test_id=db_row.test_id,
        )
    except Exception as exc:
        logger.warning(
            "[DELF-MCP] Cache invalidation failed for {}: {}", db_row.test_id, exc
        )

    return {
        "success": True,
        "draft_id": db_row.id,
        "test_id": db_row.test_id,
        "status": "draft",
        "github_path": db_row.github_path,
        "preview_url": _build_preview_url(
            db_row.level, db_row.variant, db_row.section, db_row.test_id
        ),
        "message": "Draft updated successfully",
    }


__all__ = ["update_draft"]
