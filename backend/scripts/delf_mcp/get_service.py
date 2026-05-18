"""Fetch a single DELF draft (metadata + content from GitHub)."""

from __future__ import annotations

from typing import Any

from src.config import Config
from src.shared.delf_practice.github_repository import GitHubDelfRepository
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository

from scripts.delf_mcp.validation import validate_content


def _build_preview_url(
    level: str, variant: str, section: str, test_id: str
) -> str:
    origin = getattr(Config, "WEB_ORIGIN", "http://localhost:3000").rstrip("/")
    return f"{origin}/learning/delf-practice/{level}/{variant}/{section}/{test_id}"


def get_draft(
    *,
    draft_id: str,
    repo: DelfTestPaperRepository | None = None,
    github_repo: GitHubDelfRepository | None = None,
) -> dict[str, Any]:
    """Return full draft metadata plus parsed content from GitHub.

    Content is fetched directly from GitHub (no Redis cache) so callers always
    see the latest persisted JSON, including content just saved by the agent.
    """
    repo = repo or DelfTestPaperRepository()
    paper = repo.get_by_id(draft_id)
    if paper is None:
        return {
            "success": False,
            "error": f"No DELF paper found with draft_id '{draft_id}'",
        }

    # Fetch content directly from GitHub raw URL (no cache).
    content_dict: dict[str, Any] | None = None
    content_error: str | None = None
    try:
        github_repo = github_repo or GitHubDelfRepository()
        content_model = github_repo.fetch_test_paper(paper.github_path)
        content_dict = content_model.model_dump(mode="json", by_alias=True)
    except Exception as exc:
        content_error = f"Could not load content from GitHub: {exc}"

    # Re-validate so the caller knows whether the persisted JSON is still
    # schema-clean (the schema may have evolved since save).
    validation_summary: dict[str, Any] | None = None
    if content_dict is not None:
        v = validate_content(content_dict)
        validation_summary = {
            "valid": v["valid"],
            "errors": v.get("errors", []),
            "error_count": v.get("error_count", 0),
            "quality_warnings": v.get("quality_warnings", []),
            "quality_warning_count": v.get("quality_warning_count", 0),
        }

    response: dict[str, Any] = {
        "success": True,
        "draft_id": paper.id,
        "test_id": paper.test_id,
        "level": paper.level,
        "variant": paper.variant,
        "section": paper.section,
        "status": paper.status,
        "exercise_count": paper.exercise_count,
        "audio_filename": paper.audio_filename,
        "github_path": paper.github_path,
        "created_at": paper.created_at.isoformat() if paper.created_at else None,
        "updated_at": paper.updated_at.isoformat() if paper.updated_at else None,
        "preview_url": _build_preview_url(
            paper.level, paper.variant, paper.section, paper.test_id
        ),
        "content": content_dict,
    }
    if content_error:
        response["content_error"] = content_error
    if validation_summary is not None:
        response["validation"] = validation_summary
    return response


__all__ = ["get_draft"]
