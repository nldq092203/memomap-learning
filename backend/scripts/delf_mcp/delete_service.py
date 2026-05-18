"""Delete a DELF draft (DB row, and optionally the GitHub JSON file)."""

from __future__ import annotations

from typing import Any

from src.extensions import logger
from src.shared.delf_practice.content_service import invalidate_delf_content_cache
from src.shared.delf_practice.github_manager import GitHubDelfManager
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository


def delete_draft(
    *,
    draft_id: str,
    confirm_delete: bool = False,
    delete_github_file: bool = False,
    repo: DelfTestPaperRepository | None = None,
    github_mgr: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Delete a draft DB row, optionally also removing the GitHub JSON.

    Safety rails:
    - Requires `confirm_delete=True` explicitly.
    - Only deletes papers with `status="draft"` (not active/archived).
    - Defaults `delete_github_file=False` — the JSON is preserved by default.
    """
    if not confirm_delete:
        return {
            "success": False,
            "error": (
                "Deletion requires explicit confirmation. Set "
                "confirm_delete=true to proceed."
            ),
        }

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
                f"Refusing to delete paper '{db_row.test_id}': status is "
                f"'{db_row.status}', not 'draft'"
            ),
            "message": (
                "Only drafts can be deleted through this tool. Archive or "
                "manually demote an active paper first."
            ),
        }

    # Capture identity before deletion for the response
    record = {
        "draft_id": db_row.id,
        "test_id": db_row.test_id,
        "level": db_row.level,
        "variant": db_row.variant,
        "section": db_row.section,
        "github_path": db_row.github_path,
    }

    # 1. Delete DB row first
    if not repo.delete(db_row.id):
        return {
            "success": False,
            "error": f"Failed to delete DB row for draft '{db_row.id}'",
        }

    # 2. Optionally delete GitHub file
    github_deleted = False
    github_error: str | None = None
    if delete_github_file:
        try:
            github_mgr = github_mgr or GitHubDelfManager()
            github_mgr.delete_file(
                file_path=record["github_path"],
                commit_message=(
                    f"chore(delf): delete draft {record['test_id']} via MCP"
                ),
            )
            github_deleted = True
        except Exception as exc:
            github_error = f"GitHub delete failed: {exc}"
            logger.warning(
                "[DELF-MCP] GitHub delete failed for {}: {}",
                record["test_id"],
                exc,
            )

    # 3. Invalidate cache
    try:
        invalidate_delf_content_cache(
            level=record["level"],
            variant=record["variant"],
            section=record["section"],
            test_id=record["test_id"],
        )
    except Exception as exc:
        logger.warning(
            "[DELF-MCP] Cache invalidation failed for {}: {}",
            record["test_id"],
            exc,
        )

    response: dict[str, Any] = {
        "success": True,
        "draft_id": record["draft_id"],
        "test_id": record["test_id"],
        "github_path": record["github_path"],
        "github_file_deleted": github_deleted,
        "message": "Draft deleted successfully",
    }
    if github_error:
        response["github_warning"] = github_error
    return response


__all__ = ["delete_draft"]
