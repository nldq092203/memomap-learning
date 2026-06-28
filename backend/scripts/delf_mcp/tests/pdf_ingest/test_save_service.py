"""Tests for save_delf_book_drafts.

Mocks the test-paper repository, GitHub manager, and GitHub asset verifier
to avoid hitting the network or DB. Covers the validation gate, asset
verification gate, and the save-vs-update routing rule (plan decision D6).
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import pytest

from scripts.delf_mcp.pdf_ingest import save_service as save_module
from scripts.delf_mcp.pdf_ingest import warnings as warning_codes
from scripts.delf_mcp.pdf_ingest.manifest import (
    ActivityRecord,
    Manifest,
    init_workspace,
    write_manifest,
)

# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


@dataclass
class _FakeRow:
    id: str
    test_id: str
    level: str
    variant: str
    section: str
    github_path: str
    status: str = "draft"
    exercise_count: int = 0
    audio_filename: str | None = None


class _FakeRepo:
    def __init__(self, rows: list[_FakeRow] | None = None):
        self.rows: list[_FakeRow] = list(rows or [])
        self.create_calls: list[dict] = []
        self.update_calls: list[tuple[str, dict]] = []

    def get_by_id(self, paper_id):
        return next((r for r in self.rows if r.id == paper_id), None)

    def get_by_test_id(self, test_id, level, variant, section):
        for r in self.rows:
            if (
                r.test_id == test_id
                and r.level.upper() == level.upper()
                and r.variant == variant
                and r.section == section
            ):
                return r
        return None

    def list_by_scope(self, level, variant, section, status=None):
        return [
            r
            for r in self.rows
            if r.level.upper() == level.upper()
            and r.variant == variant
            and r.section == section
        ]

    def update(self, paper_id, **updates):
        row = self.get_by_id(paper_id)
        if row is None:
            return None
        self.update_calls.append((paper_id, dict(updates)))
        for k, v in updates.items():
            if hasattr(row, k):
                setattr(row, k, v)
        return row

    def delete(self, paper_id):
        row = self.get_by_id(paper_id)
        if row is None:
            return False
        self.rows.remove(row)
        return True

    def create(self, **kwargs):
        self.create_calls.append(kwargs)
        new_row = _FakeRow(
            id=f"row-{len(self.rows) + 1}",
            test_id=kwargs["test_id"],
            level=kwargs["level"].upper(),
            variant=kwargs["variant"],
            section=kwargs["section"],
            github_path=kwargs["github_path"],
            status=kwargs.get("status", "draft"),
            exercise_count=kwargs.get("exercise_count", 0),
            audio_filename=kwargs.get("audio_filename"),
        )
        self.rows.append(new_row)
        return new_row


class _FakeGithubManager:
    """Write side. update_draft and save_draft both call this."""

    def __init__(self, *, existing_paths: set[str] | None = None):
        self.created: list[tuple[str, bytes]] = []
        self.created_or_updated: list[tuple[str, bytes]] = []
        self.existing_paths: set[str] = set(existing_paths or ())
        self.files: dict[str, bytes] = {}

    def file_exists(self, path: str) -> bool:
        return path in self.existing_paths

    def create_file(self, file_path, content, commit_message):
        self.created.append((file_path, content))
        self.existing_paths.add(file_path)
        self.files[file_path] = (
            content if isinstance(content, bytes) else content.encode()
        )
        return {"content": {"html_url": f"https://example.com/{file_path}"}}

    def create_or_update_file(self, file_path, content, commit_message):
        self.created_or_updated.append((file_path, content))
        self.existing_paths.add(file_path)
        self.files[file_path] = (
            content if isinstance(content, bytes) else content.encode()
        )
        return {"content": {"html_url": f"https://example.com/{file_path}"}}

    def list_json_stems(self, directory_path: str) -> list[str]:
        prefix = directory_path.rstrip("/") + "/"
        stems = []
        for path in self.files:
            if path.startswith(prefix) and path.endswith(".json"):
                stems.append(os.path.basename(path)[:-5])
        return sorted(stems)

    def read_file(self, file_path: str) -> bytes:
        return self.files[file_path]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _seed_manifest(tmp_path) -> str:
    analysis_id, workspace = init_workspace(workspace_root=str(tmp_path))
    manifest = Manifest(
        analysis_id=analysis_id,
        level="A2",
        variant="tout-public-a2",
        exercise_pdf_path="/tmp/x.pdf",
        answer_pdf_path=None,
        workspace_dir=workspace,
        activities=[
            ActivityRecord(
                activity_number=1,
                section="CE",
                chapter_number=1,
                title="Activité 1",
                page_start=1,
                page_end=1,
                text="",
            ),
        ],
    )
    write_manifest(manifest)
    return analysis_id


def _valid_ce_paper(test_id: str = "tp-01") -> dict:
    return {
        "test_id": test_id,
        "section": "CE",
        "audio_filename": None,
        "exercises": [
            {
                "id": "ex-1",
                "title": "Activité 1",
                "type": "multiple_choice",
                "question_text": "Q1?",
                "options": ["A", "B"],
                "correct_answer": 0,
                "points": 1.0,
            },
        ],
    }


def _valid_ce_paper_with_source(
    test_id: str = "tp-01",
    activity_id: str = "book-a:CE:chapter-1:activity-1",
) -> dict:
    paper = _valid_ce_paper(test_id)
    paper["source_ref"] = {
        "book_id": "book-a",
        "activity_id": "book-a:CE:chapter-1",
        "chapter_number": 1,
        "section": "CE",
        "source_activities": [1],
        "source_pages": [12],
    }
    paper["exercises"][0]["source_ref"] = {
        "book_id": "book-a",
        "activity_id": activity_id,
        "activity_number": 1,
        "chapter_number": 1,
        "section": "CE",
        "page_start": 12,
        "page_end": 12,
        "source_activities": [1],
        "source_pages": [12],
    }
    return paper


# ---------------------------------------------------------------------------
# Shared monkeypatching: short-circuit deep dependencies of save_draft.
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _patch_deep_deps(monkeypatch):
    # Cache invalidation is a Redis call; no-op it.
    from scripts.delf_mcp import draft_service, update_service

    monkeypatch.setattr(
        draft_service, "invalidate_delf_content_cache", lambda **_: None
    )
    monkeypatch.setattr(
        update_service, "invalidate_delf_content_cache", lambda **_: None
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_save_refuses_without_confirm(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[{"content": _valid_ce_paper()}],
        confirm_save=False,
        workspace_root=str(tmp_path),
    )
    assert out["success"] is False
    assert "confirm_save" in out["error"]


def test_save_blocks_on_validation_failure(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    bad = _valid_ce_paper()
    bad["exercises"][0]["correct_answer"] = 99  # out of bounds

    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[{"content": bad}],
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=_FakeRepo(),
        github_mgr=_FakeGithubManager(),
        github_repo=_FakeGithubManager(),
    )
    assert out["success"] is True
    assert out["saved"] == []
    assert len(out["skipped"]) == 1
    assert out["skipped"][0]["reason"] == warning_codes.VALIDATION_FAILED


def test_save_blocks_on_missing_audio_for_co(tmp_path, monkeypatch):
    analysis_id = _seed_manifest(tmp_path)

    paper = _valid_ce_paper("tp-01")
    paper["section"] = "CO"
    paper["audio_filename"] = "DELF_TP_A2_Piste09.mp3"

    repo = _FakeRepo()
    gh = _FakeGithubManager()  # nothing exists

    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[{"content": paper}],
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=repo,
        github_mgr=gh,
        github_repo=gh,
    )
    assert out["saved"] == []
    skipped = out["skipped"][0]
    assert skipped["reason"] == warning_codes.MISSING_ASSET


def test_save_happy_path_creates_draft_via_save_route(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    repo = _FakeRepo()
    gh = _FakeGithubManager()

    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[{"content": _valid_ce_paper()}],
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=repo,
        github_mgr=gh,
        github_repo=gh,
    )
    assert out["success"] is True
    assert len(out["saved"]) == 1
    saved = out["saved"][0]
    assert saved["route"] == "save"
    assert saved["test_id"] == "tp-01"
    assert repo.create_calls, "expected draft_service.save_draft to create a DB row"
    # GitHub write also occurred.
    assert any(path.endswith("tp-01.json") for path, _ in gh.created)


def test_save_existing_draft_routes_to_update(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    # Pre-existing draft for the same test_id.
    existing = _FakeRow(
        id="row-1",
        test_id="tp-01",
        level="A2",
        variant="tout-public-a2",
        section="CE",
        github_path="delf/a2/tout-public-a2/CE/tp/tp-01.json",
        status="draft",
    )
    repo = _FakeRepo([existing])
    gh = _FakeGithubManager(
        existing_paths={
            "delf/a2/tout-public-a2/CE/tp/tp-01.json",
        }
    )

    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[{"content": _valid_ce_paper()}],
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=repo,
        github_mgr=gh,
        github_repo=gh,
    )
    assert out["success"] is True
    saved = out["saved"][0]
    assert saved["route"] == "update"
    assert saved["draft_id"] == "row-1"
    assert gh.created_or_updated, "expected an update write"


def test_save_partial_outcome_mixed_results(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    repo = _FakeRepo()
    gh = _FakeGithubManager()

    good = _valid_ce_paper("tp-01")
    bad = _valid_ce_paper("tp-02")
    bad["exercises"][0]["correct_answer"] = 99

    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[{"content": good}, {"content": bad}],
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=repo,
        github_mgr=gh,
        github_repo=gh,
    )
    assert out["saved_count"] == 1
    assert out["skipped_count"] == 1
    assert out["saved"][0]["test_id"] == "tp-01"
    assert out["skipped"][0]["reason"] == warning_codes.VALIDATION_FAILED


def test_save_blocks_duplicate_pdf_source_activity(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    repo = _FakeRepo()
    gh = _FakeGithubManager()

    existing_path = "delf/a2/tout-public-a2/CE/tp/tp-01.json"
    gh.files[existing_path] = (
        save_module.validate_content(_valid_ce_paper_with_source("tp-01"))["paper"]
        .model_dump_json(indent=2, by_alias=True)
        .encode("utf-8")
    )
    gh.existing_paths.add(existing_path)

    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[{"content": _valid_ce_paper_with_source("tp-02")}],
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=repo,
        github_mgr=gh,
        github_repo=gh,
    )

    assert out["saved"] == []
    skipped = out["skipped"][0]
    assert skipped["reason"] == "source_activity_exists"
    assert skipped["details"]["existing_test_id"] == "tp-01"


def test_save_rejects_non_list_selection(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=[],
        confirm_save=True,
        workspace_root=str(tmp_path),
    )
    assert out["success"] is False
    assert "non-empty list" in out["error"]


# ---------------------------------------------------------------------------
# v2 — image option crops uploaded before save
# ---------------------------------------------------------------------------


def _image_option_paper(test_id: str = "tp-01") -> dict:
    return {
        "test_id": test_id,
        "section": "CE",
        "audio_filename": None,
        "exercises": [
            {
                "id": "ex-1",
                "title": "Activité 1",
                "type": "multiple_choice_image",
                "question_text": "Quelle scène ?",
                "options": [
                    {
                        "label": "a",
                        "img_url": f"assets/{test_id}/q01/a.webp",
                        "desc": "",
                    },
                    {
                        "label": "b",
                        "img_url": f"assets/{test_id}/q01/b.webp",
                        "desc": "",
                    },
                ],
                "correct_answer": 1,
                "points": 1.0,
            }
        ],
    }


def test_save_uploads_crops_then_creates_draft(tmp_path):
    # Set up local crop files.
    crop_a = tmp_path / "a.webp"
    crop_b = tmp_path / "b.webp"
    crop_a.write_bytes(b"\x52\x49\x46\x46fake-webp-a")
    crop_b.write_bytes(b"\x52\x49\x46\x46fake-webp-b")

    analysis_id = _seed_manifest(tmp_path)
    repo = _FakeRepo()
    gh = _FakeGithubManager()

    paper = _image_option_paper()
    selected = [
        {
            "content": paper,
            "image_uploads": [
                {
                    "local_path": str(crop_a),
                    "img_url": "assets/tp-01/q01/a.webp",
                    "question_number": 1,
                    "label": "a",
                },
                {
                    "local_path": str(crop_b),
                    "img_url": "assets/tp-01/q01/b.webp",
                    "question_number": 1,
                    "label": "b",
                },
            ],
        }
    ]

    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=selected,
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=repo,
        github_mgr=gh,
        github_repo=gh,
    )
    assert out["success"] is True
    assert out["saved_count"] == 1
    saved = out["saved"][0]
    assert saved["route"] == "save"
    # Both crops uploaded before draft commit.
    image_writes = [
        path for path, _ in gh.created if "/assets/" in path and path.endswith(".webp")
    ]
    assert any(path.endswith("/q01/a.webp") for path in image_writes)
    assert any(path.endswith("/q01/b.webp") for path in image_writes)
    # Uploaded crop metadata surfaced in response.
    assert len(saved["uploaded_crops"]) == 2


def test_save_skips_paper_when_local_crop_missing(tmp_path):
    analysis_id = _seed_manifest(tmp_path)
    paper = _image_option_paper()
    selected = [
        {
            "content": paper,
            "image_uploads": [
                {
                    "local_path": "/tmp/does-not-exist.webp",
                    "img_url": "assets/tp-01/q01/a.webp",
                    "question_number": 1,
                    "label": "a",
                },
            ],
        }
    ]
    out = save_module.save_delf_book_drafts(
        analysis_id=analysis_id,
        selected_papers=selected,
        confirm_save=True,
        workspace_root=str(tmp_path),
        repo=_FakeRepo(),
        github_mgr=_FakeGithubManager(),
        github_repo=_FakeGithubManager(),
    )
    assert out["saved"] == []
    assert out["skipped"][0]["reason"] == warning_codes.MISSING_ASSET
    assert "upload_failures" in out["skipped"][0]["details"]
