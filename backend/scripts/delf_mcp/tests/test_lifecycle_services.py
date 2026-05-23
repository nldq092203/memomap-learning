"""Tests for the draft lifecycle services (list/get/update/delete/publish).

All tests use in-memory fakes for the repository and GitHub manager — no DB,
no network. Cache invalidation is patched to a no-op so Redis isn't needed.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone

import pytest

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.tests import fixtures  # noqa: E402
from scripts.delf_mcp import (  # noqa: E402
    delete_service,
    get_service,
    list_service,
    publish_service,
    update_service,
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
    created_at: datetime = field(
        default_factory=lambda: datetime(2026, 5, 17, 10, 0, tzinfo=timezone.utc)
    )
    updated_at: datetime = field(
        default_factory=lambda: datetime(2026, 5, 17, 10, 0, tzinfo=timezone.utc)
    )


class _FakeRepo:
    def __init__(self, rows: list[_FakeRow] | None = None):
        self.rows: list[_FakeRow] = list(rows or [])
        self.deleted_ids: list[str] = []
        self.updates: list[tuple[str, dict]] = []

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

    def list_by_status(self, status="draft", level=None, section=None, variant=None, limit=50):
        out = [r for r in self.rows if r.status == status]
        if level:
            out = [r for r in out if r.level.upper() == level.upper()]
        if section:
            out = [r for r in out if r.section == section]
        if variant:
            out = [r for r in out if r.variant == variant]
        out.sort(key=lambda r: r.created_at, reverse=True)
        return out[:limit]

    def update(self, paper_id, **updates):
        row = self.get_by_id(paper_id)
        if row is None:
            return None
        self.updates.append((paper_id, dict(updates)))
        for k, v in updates.items():
            if k == "level" and v:
                setattr(row, k, v.upper())
            elif hasattr(row, k):
                setattr(row, k, v)
        return row

    def delete(self, paper_id):
        row = self.get_by_id(paper_id)
        if row is None:
            return False
        self.rows.remove(row)
        self.deleted_ids.append(paper_id)
        return True


class _FakeGithubManager:
    """Stands in for GitHubDelfManager (write side)."""

    def __init__(self, files: dict[str, bytes] | None = None):
        self.created_or_updated: list[tuple[str, bytes, str]] = []
        self.deleted: list[str] = []
        self.files = dict(files or {})
        self.fail_on_create_or_update = False
        self.fail_on_delete = False

    def create_or_update_file(self, file_path, content, commit_message):
        if self.fail_on_create_or_update:
            raise RuntimeError("simulated GitHub failure")
        self.created_or_updated.append((file_path, content, commit_message))
        return {"content": {"html_url": f"https://example.com/{file_path}"}}

    def delete_file(self, file_path, commit_message):
        if self.fail_on_delete:
            raise RuntimeError("simulated GitHub delete failure")
        self.deleted.append(file_path)
        return {}

    def read_file(self, file_path):
        try:
            return self.files[file_path]
        except KeyError:
            raise FileNotFoundError(file_path)


class _FakeGithubRepo:
    """Stands in for GitHubDelfRepository (read side)."""

    def __init__(self, content_by_path: dict[str, dict]):
        self.content_by_path = content_by_path
        self.fail = False

    def fetch_test_paper(self, github_path):
        if self.fail:
            raise RuntimeError("simulated GitHub fetch failure")
        from src.shared.delf_practice.schemas import DelfTestPaper

        data = self.content_by_path.get(github_path)
        if data is None:
            raise FileNotFoundError(github_path)
        return DelfTestPaper.model_validate(data)


# ---------------------------------------------------------------------------
# Shared fixtures: silence the real cache-invalidation hook
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _noop_invalidate_cache(monkeypatch):
    for module in (delete_service, publish_service, update_service):
        monkeypatch.setattr(
            module,
            "invalidate_delf_content_cache",
            lambda **_: None,
        )


def _draft_row(**overrides) -> _FakeRow:
    defaults = dict(
        id="row-1",
        test_id="tp-01",
        level="A2",
        variant="tout-public-a2",
        section="CE",
        github_path="delf/a2/tout-public-a2/CE/tp/tp-01.json",
    )
    defaults.update(overrides)
    return _FakeRow(**defaults)


# ---------------------------------------------------------------------------
# list_service
# ---------------------------------------------------------------------------


def test_list_drafts_returns_only_drafts():
    repo = _FakeRepo([
        _draft_row(id="d1", test_id="tp-01"),
        _draft_row(id="a1", test_id="tp-02", status="active"),
        _draft_row(id="d2", test_id="tp-03"),
    ])
    result = list_service.list_drafts(repo=repo)
    assert result["success"] is True
    assert result["total"] == 2
    assert {d["test_id"] for d in result["drafts"]} == {"tp-01", "tp-03"}


def test_list_drafts_filters_by_level_section_variant():
    repo = _FakeRepo([
        _draft_row(id="a", level="A2", section="CE", variant="v1"),
        _draft_row(id="b", level="B1", section="CE", variant="v1", test_id="tp-02"),
        _draft_row(id="c", level="A2", section="CO", variant="v1", test_id="tp-03"),
        _draft_row(id="d", level="A2", section="CE", variant="v2", test_id="tp-04"),
    ])
    out = list_service.list_drafts(
        level="A2", section="CE", variant="v1", repo=repo
    )
    assert [d["draft_id"] for d in out["drafts"]] == ["a"]


def test_list_drafts_rejects_bad_limit():
    out = list_service.list_drafts(repo=_FakeRepo([]), limit=0)
    assert out["success"] is False
    assert "limit" in out["error"]


def test_list_drafts_caps_limit_at_100():
    out = list_service.list_drafts(repo=_FakeRepo([]), limit=999)
    assert out["limit"] == 100


# ---------------------------------------------------------------------------
# get_service
# ---------------------------------------------------------------------------


def test_get_draft_returns_metadata_and_content():
    row = _draft_row()
    repo = _FakeRepo([row])
    github = _FakeGithubRepo({row.github_path: fixtures.VALID_CE_PAPER})

    out = get_service.get_draft(draft_id="row-1", repo=repo, github_repo=github)
    assert out["success"] is True
    assert out["draft_id"] == "row-1"
    assert out["test_id"] == "tp-01"
    assert out["content"]["test_id"] == "tp-01"
    assert out["validation"]["valid"] is True
    assert "preview_url" in out


def test_get_draft_missing_row():
    out = get_service.get_draft(
        draft_id="nope", repo=_FakeRepo([]), github_repo=_FakeGithubRepo({})
    )
    assert out["success"] is False
    assert "draft_id" in out["error"]


def test_get_draft_with_missing_github_file_returns_content_error():
    row = _draft_row()
    out = get_service.get_draft(
        draft_id="row-1",
        repo=_FakeRepo([row]),
        github_repo=_FakeGithubRepo({}),  # no files
    )
    assert out["success"] is True
    assert out["content"] is None
    assert "content_error" in out
    assert "validation" not in out


# ---------------------------------------------------------------------------
# update_service
# ---------------------------------------------------------------------------


def test_update_draft_writes_to_github_and_updates_metadata():
    row = _draft_row(exercise_count=0)
    repo = _FakeRepo([row])
    gh = _FakeGithubManager()

    out = update_service.update_draft(
        draft_id="row-1",
        content=fixtures.VALID_CE_PAPER,
        repo=repo,
        github_mgr=gh,
    )
    assert out["success"] is True
    assert out["status"] == "draft"
    assert gh.created_or_updated, "expected GitHub write"
    file_path, body, _ = gh.created_or_updated[0]
    assert file_path == row.github_path
    assert b'"test_id": "tp-01"' in body
    # exercise_count was updated to len(exercises)
    assert row.exercise_count == 2


def test_update_draft_rejects_renames():
    row = _draft_row(test_id="tp-01")
    repo = _FakeRepo([row])
    bad = json.loads(json.dumps(fixtures.VALID_CE_PAPER))
    bad["test_id"] = "tp-99"

    out = update_service.update_draft(
        draft_id="row-1",
        content=bad,
        repo=repo,
        github_mgr=_FakeGithubManager(),
    )
    assert out["success"] is False
    assert "does not match" in out["error"]


def test_update_draft_refuses_non_draft():
    row = _draft_row(status="active")
    out = update_service.update_draft(
        draft_id="row-1",
        content=fixtures.VALID_CE_PAPER,
        repo=_FakeRepo([row]),
        github_mgr=_FakeGithubManager(),
    )
    assert out["success"] is False
    assert "draft" in out["error"]


def test_update_draft_propagates_validation_errors():
    row = _draft_row()
    bad = fixtures.paper_correct_answer_out_of_range_flat()
    bad["test_id"] = row.test_id

    out = update_service.update_draft(
        draft_id="row-1",
        content=bad,
        repo=_FakeRepo([row]),
        github_mgr=_FakeGithubManager(),
    )
    assert out["success"] is False
    assert out["valid"] is False
    assert out["error_count"] >= 1


def test_update_draft_returns_github_failure():
    row = _draft_row()
    gh = _FakeGithubManager()
    gh.fail_on_create_or_update = True

    out = update_service.update_draft(
        draft_id="row-1",
        content=fixtures.VALID_CE_PAPER,
        repo=_FakeRepo([row]),
        github_mgr=gh,
    )
    assert out["success"] is False
    assert "GitHub" in out["error"]


# ---------------------------------------------------------------------------
# delete_service
# ---------------------------------------------------------------------------


def test_delete_requires_confirmation():
    row = _draft_row()
    out = delete_service.delete_draft(
        draft_id="row-1",
        confirm_delete=False,
        repo=_FakeRepo([row]),
        github_mgr=_FakeGithubManager(),
    )
    assert out["success"] is False
    assert "confirm_delete" in out["error"]


def test_delete_removes_db_row_but_keeps_github_by_default():
    row = _draft_row()
    repo = _FakeRepo([row])
    gh = _FakeGithubManager()
    out = delete_service.delete_draft(
        draft_id="row-1",
        confirm_delete=True,
        repo=repo,
        github_mgr=gh,
    )
    assert out["success"] is True
    assert "row-1" in repo.deleted_ids
    assert gh.deleted == []
    assert out["github_file_deleted"] is False


def test_delete_with_github_flag_also_removes_file():
    row = _draft_row()
    repo = _FakeRepo([row])
    gh = _FakeGithubManager()
    out = delete_service.delete_draft(
        draft_id="row-1",
        confirm_delete=True,
        delete_github_file=True,
        repo=repo,
        github_mgr=gh,
    )
    assert out["success"] is True
    assert gh.deleted == [row.github_path]
    assert out["github_file_deleted"] is True


def test_delete_refuses_non_draft():
    row = _draft_row(status="active")
    out = delete_service.delete_draft(
        draft_id="row-1",
        confirm_delete=True,
        repo=_FakeRepo([row]),
        github_mgr=_FakeGithubManager(),
    )
    assert out["success"] is False
    assert "draft" in out["error"]


def test_delete_missing_row():
    out = delete_service.delete_draft(
        draft_id="nope",
        confirm_delete=True,
        repo=_FakeRepo([]),
        github_mgr=_FakeGithubManager(),
    )
    assert out["success"] is False


# ---------------------------------------------------------------------------
# publish_service
# ---------------------------------------------------------------------------


def test_publish_requires_confirmation():
    out = publish_service.publish_draft(
        draft_id="row-1",
        confirm_publish=False,
        repo=_FakeRepo([_draft_row()]),
        github_repo=_FakeGithubRepo({}),
    )
    assert out["success"] is False
    assert "confirm_publish" in out["error"]


def test_publish_flips_status_when_content_is_valid():
    row = _draft_row()
    repo = _FakeRepo([row])
    github = _FakeGithubRepo({row.github_path: fixtures.VALID_CE_PAPER})

    out = publish_service.publish_draft(
        draft_id="row-1",
        confirm_publish=True,
        repo=repo,
        github_repo=github,
    )
    assert out["success"] is True
    assert out["status"] == "active"
    assert row.status == "active"
    assert out["student_url"].endswith("/A2/tout-public-a2/CE")


def test_publish_falls_back_to_contents_api_when_raw_fetch_fails():
    row = _draft_row()
    repo = _FakeRepo([row])
    raw_github = _FakeGithubRepo({row.github_path: fixtures.VALID_CE_PAPER})
    raw_github.fail = True
    api_github = _FakeGithubManager({
        row.github_path: json.dumps(fixtures.VALID_CE_PAPER).encode("utf-8")
    })

    out = publish_service.publish_draft(
        draft_id="row-1",
        confirm_publish=True,
        repo=repo,
        github_repo=raw_github,
        github_mgr=api_github,
    )
    assert out["success"] is True
    assert out["status"] == "active"
    assert row.status == "active"


def test_publish_refuses_when_persisted_content_is_invalid():
    row = _draft_row()
    bad = fixtures.paper_correct_answer_out_of_range_flat()
    bad["test_id"] = row.test_id
    github = _FakeGithubRepo({row.github_path: bad})

    out = publish_service.publish_draft(
        draft_id="row-1",
        confirm_publish=True,
        repo=_FakeRepo([row]),
        github_repo=github,
    )
    assert out["success"] is False
    assert out["valid"] is False
    assert row.status == "draft", "row should not have been flipped"


def test_publish_refuses_non_draft_status():
    row = _draft_row(status="active")
    out = publish_service.publish_draft(
        draft_id="row-1",
        confirm_publish=True,
        repo=_FakeRepo([row]),
        github_repo=_FakeGithubRepo({}),
    )
    assert out["success"] is False
    assert "active" in out["error"]


def test_publish_resolves_by_scope_when_no_draft_id():
    row = _draft_row(test_id="tp-07", level="A2", variant="v", section="CE",
                     github_path="delf/a2/v/CE/tp/tp-07.json")
    github = _FakeGithubRepo({
        row.github_path: {
            **fixtures.VALID_CE_PAPER,
            "test_id": "tp-07",
        }
    })
    out = publish_service.publish_draft(
        test_id="tp-07",
        level="A2",
        variant="v",
        section="CE",
        confirm_publish=True,
        repo=_FakeRepo([row]),
        github_repo=github,
    )
    assert out["success"] is True
    assert out["test_id"] == "tp-07"


def test_publish_complains_when_target_args_incomplete():
    out = publish_service.publish_draft(
        confirm_publish=True,
        test_id="tp-01",  # missing level/variant/section
        repo=_FakeRepo([]),
        github_repo=_FakeGithubRepo({}),
    )
    assert out["success"] is False
    assert "Missing" in out["error"]
