"""Tests for PDF-ingest existing-exercise preflight behavior."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.pdf_ingest import preview_service, save_service  # noqa: E402
from scripts.delf_mcp.pdf_ingest.manifest import (  # noqa: E402
    ActivityRecord,
    Manifest,
)
from scripts.delf_mcp.tests import fixtures  # noqa: E402


@dataclass
class _Row:
    id: str
    test_id: str
    level: str = "A2"
    variant: str = "tout-public-a2"
    section: str = "CE"
    status: str = "draft"


class _Repo:
    def __init__(self, row: _Row | None = None):
        self.row = row

    def get_by_test_id(self, test_id, level, variant, section):
        if self.row is None:
            return None
        if (
            self.row.test_id == test_id
            and self.row.level.upper() == level.upper()
            and self.row.variant == variant
            and self.row.section == section
        ):
            return self.row
        return None


class _Github:
    def __init__(self, existing_paths: set[str] | None = None):
        self.existing_paths = set(existing_paths or ())

    def file_exists(self, path):
        return path in self.existing_paths


def _manifest() -> Manifest:
    return Manifest(
        analysis_id="analysis-1",
        level="A2",
        variant="tout-public-a2",
        exercise_pdf_path="/tmp/book.pdf",
        answer_pdf_path="/tmp/answers.pdf",
        workspace_dir="/tmp/analysis-1",
        activities=[
            ActivityRecord(
                activity_number=1,
                section="CE",
                chapter_number=1,
                title="Activité 1",
                page_start=1,
                page_end=1,
                text="Activité 1",
                answer_key={"1": 0},
            )
        ],
    )


def test_preview_checks_existing_ids_before_proposing(monkeypatch):
    monkeypatch.setattr(preview_service, "read_manifest", lambda *_, **__: _manifest())
    monkeypatch.setattr(
        preview_service,
        "inspect_existing_test_ids",
        lambda **_: {
            "all_existing_test_ids": ["tp-01", "tp-02"],
        },
    )

    def fake_build_paper(**kwargs):
        paper = fixtures.clone(fixtures.VALID_CE_PAPER)
        paper["test_id"] = kwargs["proposed_test_id"]
        return paper, [], [1], []

    monkeypatch.setattr(preview_service, "_build_paper", fake_build_paper)

    result = preview_service.preview_delf_book_extraction(analysis_id="analysis-1")

    assert result["success"] is True
    assert result["papers"][0]["proposed_test_id"] == "tp-03"
    assert result["papers"][0]["content"]["test_id"] == "tp-03"


def test_save_skips_active_existing_paper_before_uploading_crops():
    paper = fixtures.clone(fixtures.VALID_CE_PAPER)
    paper["test_id"] = "tp-01"
    paper["section"] = "CE"

    result = save_service._save_one_paper(
        paper_content=paper,
        level="A2",
        variant="tout-public-a2",
        image_uploads=[
            {
                "local_path": "/does/not/exist.webp",
                "question_number": 1,
                "label": "a",
            }
        ],
        repo=_Repo(_Row(id="active-1", test_id="tp-01", status="active")),
        github_mgr=_Github(),
        github_repo=_Github(),
    )

    assert result["saved"] is False
    assert result["reason"] == "exercise_exists"
    assert result["details"]["source"] == "DB"
    assert result["details"]["status"] == "active"


def test_save_skips_github_only_existing_paper_before_uploading_crops():
    paper = fixtures.clone(fixtures.VALID_CE_PAPER)
    paper["test_id"] = "tp-99"
    paper["section"] = "CE"

    result = save_service._save_one_paper(
        paper_content=paper,
        level="A2",
        variant="tout-public-a2",
        image_uploads=[
            {
                "local_path": "/does/not/exist.webp",
                "question_number": 1,
                "label": "a",
            }
        ],
        repo=_Repo(None),
        github_mgr=_Github(
            {
                "delf/a2/tout-public-a2/CE/tp/tp-99.json",
            }
        ),
        github_repo=_Github(),
    )

    assert result["saved"] is False
    assert result["reason"] == "exercise_exists"
    assert result["details"]["source"] == "GitHub"
    assert result["details"]["github_path"].endswith("/tp-99.json")
