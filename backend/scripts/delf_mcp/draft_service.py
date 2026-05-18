"""Save validated DelfTestPaper content as a draft to DB + GitHub."""

from __future__ import annotations

from typing import Any

from src.config import Config
from src.extensions import logger
from src.shared.delf_practice.content_service import invalidate_delf_content_cache
from src.shared.delf_practice.github_manager import GitHubDelfManager
from src.shared.delf_practice.schemas import DelfTestPaper
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository

from scripts.delf_mcp.naming_service import (
    build_github_directory,
    inspect_existing_test_ids,
    suggest_test_id_from_existing,
)
from scripts.delf_mcp.validation import validate_content


def _build_github_path(level: str, variant: str, section: str, test_id: str) -> str:
    return f"delf/{level.lower()}/{variant}/{section}/tp/{test_id}.json"


def _build_preview_url(
    level: str, variant: str, section: str, test_id: str
) -> str:
    origin = getattr(Config, "WEB_ORIGIN", "http://localhost:3000").rstrip("/")
    return f"{origin}/learning/delf-practice/{level}/{variant}/{section}/{test_id}"


def save_draft(
    *,
    level: str,
    variant: str,
    section: str,
    content: Any,
) -> dict[str, Any]:
    """Validate then persist a DELF test paper as a draft.

    Returns a structured result dict (never raises for expected failures).
    """
    # 1. Validate first
    validation = validate_content(content)
    if not validation["valid"]:
        return {
            "success": False,
            "valid": False,
            "errors": validation["errors"],
            "error_count": validation["error_count"],
            "quality_warnings": validation.get("quality_warnings", []),
            "quality_warning_count": validation.get("quality_warning_count", 0),
            "message": "Content failed validation; nothing was saved.",
        }

    paper: DelfTestPaper = validation["paper"]
    test_id = paper.test_id

    repo = DelfTestPaperRepository()
    github_mgr = GitHubDelfManager()

    # 2. Corpus preflight: DB metadata can be stale, so read GitHub too before
    #    choosing whether this test_id is safe to create.
    try:
        corpus = inspect_existing_test_ids(
            level=level,
            variant=variant,
            section=section,
            repo=repo,
            github=github_mgr,
        )
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not inspect existing DELF corpus: {exc}",
            "message": (
                "Draft was not saved because the GitHub/DB preflight could not "
                "confirm the target path is unused."
            ),
        }

    existing_db_records = [
        record
        for record in corpus["db_existing_records"]
        if record["test_id"] == test_id
    ]
    exists_in_github = test_id in corpus["github_existing_test_ids"]
    if existing_db_records or exists_in_github:
        suggested, convention = suggest_test_id_from_existing(
            set(corpus["all_existing_test_ids"])
        )
        sources = []
        if existing_db_records:
            sources.append("DB")
        if exists_in_github:
            sources.append("GitHub")
        return {
            "success": False,
            "error": (
                f"Test paper '{test_id}' already exists for "
                f"{level}/{variant}/{section} in {', '.join(sources)}"
            ),
            "suggestion": (
                f"Try test_id '{suggested}' (set content.test_id='{suggested}' "
                f"and call save_delf_draft again)"
            ),
            "suggested_test_id": suggested,
            "convention": convention,
            "existing_db_records": existing_db_records,
            "github_path": _build_github_path(level, variant, section, test_id),
            "github_directory": build_github_directory(level, variant, section),
        }

    # 3. Create DB row first (status="draft")
    github_path = _build_github_path(level, variant, section, test_id)
    db_row = repo.create(
        test_id=test_id,
        level=level,
        variant=variant,
        section=section,
        github_path=github_path,
        exercise_count=len(paper.exercises),
        audio_filename=paper.audio_filename,
        status="draft",
    )

    # 4. Commit JSON to GitHub. If this fails, roll back the DB row so we
    #    don't leave dangling metadata pointing at a non-existent file.
    try:
        json_payload = paper.model_dump_json(indent=2, by_alias=True)
        if github_mgr.file_exists(github_path):
            raise FileExistsError(
                f"GitHub file already exists at {github_path}; refusing to overwrite"
            )
        github_mgr.create_file(
            file_path=github_path,
            content=json_payload.encode("utf-8"),
            commit_message=f"chore(delf): draft {test_id} via MCP",
        )
    except Exception as exc:
        logger.error(
            "[DELF-MCP] GitHub commit failed for {}: {}. Rolling back DB row.",
            test_id,
            exc,
        )
        repo.delete(db_row.id)
        return {
            "success": False,
            "error": f"GitHub commit failed: {exc}",
            "message": "Draft was not saved. Verify GITHUB_TOKEN and try again.",
        }

    # 5. Invalidate cache so a future read picks up the new content
    try:
        invalidate_delf_content_cache(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
        )
    except Exception as exc:
        logger.warning(
            "[DELF-MCP] Cache invalidation failed for {}: {}", test_id, exc
        )

    result = {
        "success": True,
        "draft_id": db_row.id,
        "test_id": test_id,
        "status": "draft",
        "github_path": github_path,
        "preview_url": _build_preview_url(level, variant, section, test_id),
        "message": "Draft saved successfully",
    }
    if validation.get("quality_warnings"):
        result["quality_warnings"] = validation["quality_warnings"]
        result["quality_warning_count"] = validation["quality_warning_count"]
    return result


__all__ = ["save_draft"]
