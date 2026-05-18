"""List DELF drafts (status='draft') with optional scope filters."""

from __future__ import annotations

from typing import Any

from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository


def _serialize_draft(row: Any) -> dict[str, Any]:
    return {
        "draft_id": getattr(row, "id", None),
        "test_id": getattr(row, "test_id", None),
        "level": getattr(row, "level", None),
        "variant": getattr(row, "variant", None),
        "section": getattr(row, "section", None),
        "exercise_count": getattr(row, "exercise_count", 0),
        "audio_filename": getattr(row, "audio_filename", None),
        "github_path": getattr(row, "github_path", None),
        "created_at": getattr(row, "created_at", None).isoformat()
        if getattr(row, "created_at", None)
        else None,
    }


def list_drafts(
    *,
    level: str | None = None,
    section: str | None = None,
    variant: str | None = None,
    limit: int = 50,
    repo: DelfTestPaperRepository | None = None,
) -> dict[str, Any]:
    """Return all drafts (status='draft') matching the optional filters."""
    if not isinstance(limit, int) or limit < 1:
        return {
            "success": False,
            "error": "limit must be a positive integer (max 100)",
        }
    limit = min(limit, 100)

    repo = repo or DelfTestPaperRepository()

    try:
        rows = repo.list_by_status(
            status="draft",
            level=level,
            section=section,
            variant=variant,
            limit=limit,
        )
    except Exception as exc:
        return {
            "success": False,
            "error": f"Failed to list drafts: {exc}",
        }

    drafts = [_serialize_draft(row) for row in rows]
    return {
        "success": True,
        "drafts": drafts,
        "total": len(drafts),
        "limit": limit,
    }


__all__ = ["list_drafts"]
