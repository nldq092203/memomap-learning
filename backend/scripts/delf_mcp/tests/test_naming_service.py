"""Tests for DELF MCP test_id suggestion logic."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass

# Allow running pytest directly from the `backend/` directory.
_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.naming_service import (  # noqa: E402
    inspect_existing_test_ids,
    suggest_delf_test_id,
    suggest_test_id_from_existing,
)


@dataclass
class _Record:
    id: str
    test_id: str
    status: str
    github_path: str


class _Repo:
    def __init__(self, records):
        self.records = records

    def list_by_scope(self, level, variant, section, status=None):
        return self.records


class _Github:
    def __init__(self, ids):
        self.ids = ids

    def list_json_stems(self, directory_path):
        return self.ids


def test_suggest_next_canonical_id_from_db_and_github():
    suggested, convention = suggest_test_id_from_existing(
        {"tp-01", "tp-02", "tp-03-une-nouvelle-vie"}
    )

    assert suggested == "tp-04"
    assert convention == "tp-XX"


def test_suggest_uses_widest_existing_canonical_padding():
    suggested, _ = suggest_test_id_from_existing({"tp-009"})

    assert suggested == "tp-010"


def test_inspect_existing_test_ids_includes_drafts_and_github_only_files():
    records = [
        _Record(
            id="draft-id",
            test_id="tp-01",
            status="draft",
            github_path="delf/a2/tout-public-a2/CE/tp/tp-01.json",
        )
    ]

    result = inspect_existing_test_ids(
        level="A2",
        variant="tout-public-a2",
        section="CE",
        repo=_Repo(records),
        github=_Github(["tp-02"]),
    )

    assert result["github_directory"] == "delf/a2/tout-public-a2/CE/tp"
    assert result["db_existing_test_ids"] == ["tp-01"]
    assert result["github_existing_test_ids"] == ["tp-02"]
    assert result["all_existing_test_ids"] == ["tp-01", "tp-02"]
    assert result["db_existing_records"][0]["status"] == "draft"


def test_suggest_delf_test_id_returns_structured_failure_on_preflight_error():
    class FailingGithub:
        def list_json_stems(self, directory_path):
            raise RuntimeError("GitHub unavailable")

    result = suggest_delf_test_id(
        level="A2",
        variant="tout-public-a2",
        section="CE",
        repo=_Repo([]),
        github=FailingGithub(),
    )

    assert result["success"] is False
    assert "GitHub unavailable" in result["error"]
