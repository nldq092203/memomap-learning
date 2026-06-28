"""Convention-aware DELF test_id suggestions from DB and GitHub corpus."""

from __future__ import annotations

import re
from typing import Any, Protocol

_CANONICAL_RE = re.compile(r"^tp-(\d+)$")
_NUMBERED_RE = re.compile(r"^tp-(\d+)(?:-.+)?$")
_SLUG_RE = re.compile(r"[^a-z0-9]+")


class _Repo(Protocol):
    def list_by_scope(
        self,
        level: str,
        variant: str,
        section: str,
        status: str | None = None,
    ) -> list[Any]: ...


class _Github(Protocol):
    def list_json_stems(self, directory_path: str) -> list[str]: ...


def build_github_directory(level: str, variant: str, section: str) -> str:
    return f"delf/{level.lower()}/{variant}/{section}/tp"


def _record_to_dict(record: Any) -> dict[str, Any]:
    return {
        "id": getattr(record, "id", None),
        "test_id": getattr(record, "test_id", None),
        "status": getattr(record, "status", None),
        "github_path": getattr(record, "github_path", None),
    }


def _slugify(value: str | None) -> str:
    if not value:
        return ""
    slug = _SLUG_RE.sub("-", value.strip().lower()).strip("-")
    return slug[:40].strip("-")


def _next_numbered_id(
    existing_ids: set[str], title: str | None = None
) -> tuple[str, str]:
    numbered = []
    canonical_widths = []
    slugged_count = 0

    for test_id in existing_ids:
        canonical = _CANONICAL_RE.match(test_id)
        if canonical:
            numbered.append(int(canonical.group(1)))
            canonical_widths.append(len(canonical.group(1)))
            continue

        numbered_match = _NUMBERED_RE.match(test_id)
        if numbered_match:
            numbered.append(int(numbered_match.group(1)))
            slugged_count += 1

    next_num = max(numbered, default=0) + 1
    width = max(canonical_widths or [2])

    slug = _slugify(title)
    use_slug = slugged_count > len(canonical_widths) and bool(slug)
    convention = "tp-XX-title" if use_slug else "tp-XX"
    suffix = f"-{slug}" if use_slug else ""

    for _ in range(1000):
        candidate = f"tp-{next_num:0{width}d}{suffix}"
        if candidate not in existing_ids:
            return candidate, convention
        next_num += 1

    return f"tp-{next_num:0{width}d}{suffix}", convention


def suggest_test_id_from_existing(
    existing_ids: set[str],
    title: str | None = None,
) -> tuple[str, str]:
    """Suggest the next test_id using the observed corpus convention."""
    return _next_numbered_id(existing_ids, title)


def inspect_existing_test_ids(
    *,
    level: str,
    variant: str,
    section: str,
    repo: _Repo | None = None,
    github: _Github | None = None,
) -> dict[str, Any]:
    """Read existing DELF IDs from DB metadata and GitHub files."""
    if repo is None:
        from src.shared.delf_practice.test_paper_repository import (
            DelfTestPaperRepository,
        )

        repo = DelfTestPaperRepository()
    if github is None:
        from src.shared.delf_practice.github_manager import GitHubDelfManager

        github = GitHubDelfManager()
    directory = build_github_directory(level, variant, section)

    db_records = repo.list_by_scope(level, variant, section, status=None)
    github_ids = github.list_json_stems(directory)
    db_ids = [record.test_id for record in db_records]
    all_ids = sorted(set(db_ids) | set(github_ids))

    return {
        "github_directory": directory,
        "github_existing_test_ids": sorted(github_ids),
        "db_existing_records": [_record_to_dict(record) for record in db_records],
        "db_existing_test_ids": sorted(db_ids),
        "all_existing_test_ids": all_ids,
    }


def suggest_delf_test_id(
    *,
    level: str,
    variant: str,
    section: str,
    title: str | None = None,
    repo: _Repo | None = None,
    github: _Github | None = None,
) -> dict[str, Any]:
    """Suggest the next DELF test_id after reading DB and GitHub."""
    try:
        corpus = inspect_existing_test_ids(
            level=level,
            variant=variant,
            section=section,
            repo=repo,
            github=github,
        )
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not inspect existing DELF corpus: {exc}",
            "message": "No test_id was suggested because existing GitHub/DB data could not be read.",
        }

    suggested, convention = suggest_test_id_from_existing(
        set(corpus["all_existing_test_ids"]),
        title=title,
    )
    return {
        "success": True,
        "level": level.upper(),
        "variant": variant,
        "section": section,
        "suggested_test_id": suggested,
        "convention": convention,
        **corpus,
    }


__all__ = [
    "build_github_directory",
    "inspect_existing_test_ids",
    "suggest_delf_test_id",
    "suggest_test_id_from_existing",
]
