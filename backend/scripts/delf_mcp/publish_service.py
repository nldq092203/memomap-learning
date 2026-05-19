"""Publish a DELF draft (flip status from 'draft' to 'active')."""

from __future__ import annotations

from typing import Any

from src.config import Config
from src.extensions import logger
from src.shared.delf_practice.content_service import invalidate_delf_content_cache
from src.shared.delf_practice.github_manager import GitHubDelfManager
from src.shared.delf_practice.github_repository import GitHubDelfRepository
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository

from scripts.delf_mcp.assets.verify_service import verify_delf_asset_references
from scripts.delf_mcp.validation import validate_content


def _build_student_url(level: str, variant: str, section: str) -> str:
    origin = getattr(Config, "WEB_ORIGIN", "http://localhost:3000").rstrip("/")
    return f"{origin}/learning/delf-practice/{level}/{variant}/{section}"


def _resolve_target(
    repo: DelfTestPaperRepository,
    *,
    draft_id: str | None,
    test_id: str | None,
    level: str | None,
    variant: str | None,
    section: str | None,
) -> tuple[Any | None, str | None]:
    """Return (row, error_message). Either draft_id OR (test_id+L+V+S) wins."""
    if draft_id:
        row = repo.get_by_id(draft_id)
        if row is None:
            return None, f"No DELF paper found with draft_id '{draft_id}'"
        return row, None

    missing = [
        name
        for name, val in (
            ("test_id", test_id),
            ("level", level),
            ("variant", variant),
            ("section", section),
        )
        if not val
    ]
    if missing:
        return None, (
            "Provide either draft_id OR (test_id, level, variant, section). "
            f"Missing: {', '.join(missing)}"
        )

    row = repo.get_by_test_id(test_id, level, variant, section)
    if row is None:
        return None, (
            f"No DELF paper found for test_id='{test_id}', "
            f"{level}/{variant}/{section}"
        )
    return row, None


def publish_draft(
    *,
    draft_id: str | None = None,
    test_id: str | None = None,
    level: str | None = None,
    variant: str | None = None,
    section: str | None = None,
    confirm_publish: bool = False,
    repo: DelfTestPaperRepository | None = None,
    github_repo: GitHubDelfRepository | None = None,
    github_mgr: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Flip a draft to active status after re-validating its GitHub content.

    Safety rails:
    - Requires `confirm_publish=True` explicitly.
    - Refuses to publish if status is not 'draft'.
    - Re-fetches the JSON from GitHub and re-validates it. Refuses if invalid.
    - Invalidates the content cache after the status flip.
    """
    if not confirm_publish:
        return {
            "success": False,
            "error": (
                "Publishing requires explicit confirmation. Set "
                "confirm_publish=true to proceed."
            ),
        }

    repo = repo or DelfTestPaperRepository()
    row, err = _resolve_target(
        repo,
        draft_id=draft_id,
        test_id=test_id,
        level=level,
        variant=variant,
        section=section,
    )
    if err:
        return {"success": False, "error": err}

    if row.status == "active":
        return {
            "success": False,
            "error": (
                f"Paper '{row.test_id}' is already active. "
                "Publishing is a draft → active transition."
            ),
        }
    if row.status != "draft":
        return {
            "success": False,
            "error": (
                f"Refusing to publish paper '{row.test_id}': status is "
                f"'{row.status}', not 'draft'"
            ),
        }

    # Re-validate the persisted JSON to refuse publishing broken content
    try:
        github_repo = github_repo or GitHubDelfRepository()
        content_model = github_repo.fetch_test_paper(row.github_path)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not fetch content from GitHub: {exc}",
            "message": (
                "Publishing was aborted because the persisted JSON could not be "
                "read. Verify the GitHub path and try again."
            ),
        }

    validation = validate_content(
        content_model.model_dump(mode="json", by_alias=True)
    )
    if not validation["valid"]:
        return {
            "success": False,
            "valid": False,
            "errors": validation["errors"],
            "error_count": validation["error_count"],
            "quality_warnings": validation.get("quality_warnings", []),
            "quality_warning_count": validation.get("quality_warning_count", 0),
            "message": (
                "Persisted JSON failed validation; refusing to publish. "
                "Use update_delf_draft to fix the content first."
            ),
        }

    # Asset verification: refuse to publish if any img_url / audio_filename
    # is missing from GitHub. This implements FR-3.8.
    asset_check = verify_delf_asset_references(
        level=row.level,
        variant=row.variant,
        section=row.section,
        content=content_model.model_dump(mode="json", by_alias=True),
        github=github_mgr,
    )
    if not asset_check.get("success"):
        return {
            "success": False,
            "error": asset_check.get("error", "Asset verification failed"),
            "message": (
                "Publishing was aborted because asset references could not be "
                "verified against GitHub."
            ),
        }
    if not asset_check.get("all_present"):
        return {
            "success": False,
            "error": "Refusing to publish: referenced assets are missing.",
            "missing": asset_check.get("missing", []),
            "missing_count": asset_check.get("missing_count", 0),
            "message": (
                "Upload the missing files (process_screenshot_options / "
                "upload_delf_asset) then try again."
            ),
        }

    # Flip status
    updated = repo.update(row.id, status="active")
    if updated is None:
        return {
            "success": False,
            "error": f"Failed to update status for paper '{row.id}'",
        }

    # Invalidate cache
    try:
        invalidate_delf_content_cache(
            level=row.level,
            variant=row.variant,
            section=row.section,
            test_id=row.test_id,
        )
    except Exception as exc:
        logger.warning(
            "[DELF-MCP] Cache invalidation failed for {}: {}", row.test_id, exc
        )

    result = {
        "success": True,
        "draft_id": row.id,
        "test_id": row.test_id,
        "level": row.level,
        "variant": row.variant,
        "section": row.section,
        "status": "active",
        "student_url": _build_student_url(row.level, row.variant, row.section),
        "message": "Exercise published successfully",
    }
    if validation.get("quality_warnings"):
        result["quality_warnings"] = validation["quality_warnings"]
        result["quality_warning_count"] = validation["quality_warning_count"]
    return result


__all__ = ["publish_draft"]
