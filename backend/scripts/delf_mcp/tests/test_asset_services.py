"""Tests for the asset upload / list / verify services (fakes — no network)."""

from __future__ import annotations

import base64
import io
import json
import os
import sys
from types import SimpleNamespace

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.assets.listing_service import list_delf_assets  # noqa: E402
from scripts.delf_mcp.assets.migration_service import (  # noqa: E402
    migrate_legacy_image_assets,
)
from scripts.delf_mcp.assets.upload_service import upload_delf_asset  # noqa: E402
from scripts.delf_mcp.assets.verify_service import (  # noqa: E402
    verify_delf_asset_references,
)
from scripts.delf_mcp.tests import fixtures  # noqa: E402


# ---------------------------------------------------------------------------
# Fake GitHub manager
# ---------------------------------------------------------------------------


class _FakeGithub:
    def __init__(self, files: dict[str, bytes] | None = None):
        # paths → bytes
        self.files: dict[str, bytes] = dict(files or {})
        self.created: list[str] = []
        self.updated: list[str] = []

    def file_exists(self, path: str) -> bool:
        return path in self.files

    def create_file(self, file_path, content, commit_message):
        if file_path in self.files:
            raise FileExistsError(file_path)
        self.files[file_path] = content if isinstance(content, bytes) else content.encode()
        self.created.append(file_path)
        return {"path": file_path}

    def create_or_update_file(self, file_path, content, commit_message):
        self.files[file_path] = content if isinstance(content, bytes) else content.encode()
        self.updated.append(file_path)
        return {"path": file_path}

    def read_file(self, file_path):
        return self.files[file_path]

    def list_files(self, directory_path: str, *, extensions=None):
        prefix = directory_path.rstrip("/") + "/"
        names = []
        for path in self.files:
            if not path.startswith(prefix):
                continue
            name = path[len(prefix):]
            if "/" in name:
                continue
            if extensions and not name.lower().endswith(
                tuple(e.lower() for e in extensions)
            ):
                continue
            names.append(name)
        return sorted(names)

    def list_files_recursive(self, directory_path: str, *, extensions=None):
        prefix = directory_path.rstrip("/") + "/"
        names = []
        for path in self.files:
            if not path.startswith(prefix):
                continue
            name = path[len(prefix):]
            if extensions and not name.lower().endswith(
                tuple(e.lower() for e in extensions)
            ):
                continue
            names.append(name)
        return sorted(names)


def _b64(content: bytes) -> str:
    return base64.b64encode(content).decode("ascii")


def _png_bytes() -> bytes:
    from PIL import Image

    img = Image.new("RGB", (4, 4), color=(255, 0, 0))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


class _FakeRepo:
    def __init__(self, row):
        self.row = row

    def get_by_test_id(self, test_id, level, variant, section):
        if (
            self.row.test_id == test_id
            and self.row.level == level.upper()
            and self.row.variant == variant
            and self.row.section == section
        ):
            return self.row
        return None


class _FakeGithubRepo:
    def __init__(self, content):
        self.content = content

    def fetch_test_paper(self, github_path):
        from src.shared.delf_practice.schemas import DelfTestPaper

        return DelfTestPaper.model_validate(self.content)


# ---------------------------------------------------------------------------
# upload_delf_asset
# ---------------------------------------------------------------------------


def test_upload_image_writes_to_assets_directory():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2",
        variant="tout-public-a2",
        section="CE",
        test_id="tp-04",
        filename="tp-04-q1-a.webp",
        content_base64=_b64(b"webpbytes"),
        kind="image",
        github=gh,
    )
    assert result["success"] is True
    assert result["github_path"] == (
        "delf/a2/tout-public-a2/CE/assets/tp-04-q1-a.webp"
    )
    assert result["relative_path"] == "assets/tp-04-q1-a.webp"
    assert gh.files[result["github_path"]] == b"webpbytes"


def test_upload_image_with_question_metadata_writes_structured_path():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2",
        variant="tout-public-a2",
        section="CE",
        test_id="tp-04",
        filename="a.webp",
        content_base64=_b64(b"webpbytes"),
        kind="image",
        question_number=1,
        label="a",
        github=gh,
    )
    assert result["success"] is True
    assert result["github_path"] == (
        "delf/a2/tout-public-a2/CE/assets/tp-04/q01/a.webp"
    )
    assert result["relative_path"] == "assets/tp-04/q01/a.webp"


def test_upload_audio_returns_bare_relative_path():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2",
        variant="tout-public-a2",
        section="CO",
        test_id="tp-04",
        filename="DELF_TP_A2_Piste28.mp3",
        content_base64=_b64(b"mp3bytes"),
        kind="audio",
        github=gh,
    )
    assert result["success"] is True
    assert result["relative_path"] == "DELF_TP_A2_Piste28.mp3"
    assert result["github_path"].endswith(
        "/audio/DELF_TP_A2_Piste28.mp3"
    )


def test_upload_refuses_overwrite_by_default():
    path = "delf/a2/v/CE/assets/x.webp"
    gh = _FakeGithub({path: b"old"})
    result = upload_delf_asset(
        level="A2", variant="v", section="CE", test_id="t",
        filename="x.webp", content_base64=_b64(b"new"),
        kind="image", github=gh,
    )
    assert result["success"] is False
    assert "already exists" in result["error"]
    assert gh.files[path] == b"old"


def test_upload_allows_overwrite_when_flag_set():
    path = "delf/a2/v/CE/assets/x.webp"
    gh = _FakeGithub({path: b"old"})
    result = upload_delf_asset(
        level="A2", variant="v", section="CE", test_id="t",
        filename="x.webp", content_base64=_b64(b"new"),
        kind="image", overwrite=True, github=gh,
    )
    assert result["success"] is True
    assert result["overwritten"] is True
    assert gh.files[path] == b"new"


def test_upload_rejects_extension_mismatch():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2", variant="v", section="CE", test_id="t",
        filename="x.txt", content_base64=_b64(b"x"),
        kind="image", github=gh,
    )
    assert result["success"] is False
    assert ".webp" in result["error"]


def test_upload_rejects_audio_extension_in_image_kind():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2", variant="v", section="CO", test_id="t",
        filename="track.mp3", content_base64=_b64(b"x"),
        kind="image", github=gh,
    )
    assert result["success"] is False


def test_upload_rejects_invalid_base64():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2", variant="v", section="CE", test_id="t",
        filename="x.webp", content_base64="not!!base64",
        kind="image", github=gh,
    )
    assert result["success"] is False
    assert "base64" in result["error"]


def test_upload_rejects_path_traversal_filename():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2", variant="v", section="CE", test_id="t",
        filename="../etc/passwd.webp",
        content_base64=_b64(b"x"), kind="image", github=gh,
    )
    assert result["success"] is False


def test_upload_rejects_bad_kind():
    gh = _FakeGithub()
    result = upload_delf_asset(
        level="A2", variant="v", section="CE", test_id="t",
        filename="x.webp", content_base64=_b64(b"x"),
        kind="movie", github=gh,
    )
    assert result["success"] is False


# ---------------------------------------------------------------------------
# list_delf_assets
# ---------------------------------------------------------------------------


def test_list_image_assets_filters_extension_and_directory():
    gh = _FakeGithub({
        "delf/a2/v/CE/assets/a.webp": b"",
        "delf/a2/v/CE/assets/tp-04/q01/a.webp": b"",
        "delf/a2/v/CE/assets/b.png": b"",
        "delf/a2/v/CE/assets/c.txt": b"",  # filtered out
        "delf/a2/v/CO/audio/x.mp3": b"",   # different dir
    })
    result = list_delf_assets(
        level="A2", variant="v", section="CE", kind="image", github=gh,
    )
    assert result["success"] is True
    assert result["files"] == ["a.webp", "b.png", "tp-04/q01/a.webp"]
    assert result["github_directory"] == "delf/a2/v/CE/assets"


def test_list_audio_assets_uses_audio_directory():
    gh = _FakeGithub({
        "delf/a2/v/CO/audio/DELF_TP_A2_Piste01.mp3": b"",
        "delf/a2/v/CO/audio/DELF_TP_A2_Piste02.mp3": b"",
    })
    result = list_delf_assets(
        level="A2", variant="v", section="CO", kind="audio", github=gh,
    )
    assert result["success"] is True
    assert len(result["files"]) == 2


def test_list_empty_directory_returns_empty_list():
    gh = _FakeGithub()
    result = list_delf_assets(
        level="A2", variant="v", section="CE", kind="image", github=gh,
    )
    assert result["success"] is True
    assert result["files"] == []
    assert result["total"] == 0


def test_list_rejects_bad_kind():
    result = list_delf_assets(
        level="A2", variant="v", section="CE", kind="bogus",
        github=_FakeGithub(),
    )
    assert result["success"] is False


# ---------------------------------------------------------------------------
# verify_delf_asset_references
# ---------------------------------------------------------------------------


def test_verify_returns_all_present_when_assets_match():
    import copy
    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    # Inject an image option referencing assets/foo.webp
    paper["exercises"][0]["options"] = [
        {"label": "a", "img_url": "assets/foo.webp", "desc": "x"},
        {"label": "b", "img_url": "assets/bar.webp", "desc": "y"},
    ]
    paper["exercises"][0]["correct_answer"] = 0
    gh = _FakeGithub({
        "delf/a2/v/CE/assets/foo.webp": b"",
        "delf/a2/v/CE/assets/bar.webp": b"",
    })
    result = verify_delf_asset_references(
        level="A2", variant="v", section="CE", content=paper, github=gh,
    )
    assert result["success"] is True
    assert result["all_present"] is True
    assert result["checked"] == 2
    assert result["missing"] == []


def test_verify_returns_all_present_for_nested_assets():
    import copy
    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["exercises"][0]["options"] = [
        {"label": "a", "img_url": "assets/tp-04/q01/a.webp", "desc": "x"},
        {"label": "b", "img_url": "assets/tp-04/q01/b.webp", "desc": "y"},
    ]
    paper["exercises"][0]["correct_answer"] = 0
    gh = _FakeGithub({
        "delf/a2/v/CE/assets/tp-04/q01/a.webp": b"",
        "delf/a2/v/CE/assets/tp-04/q01/b.webp": b"",
    })
    result = verify_delf_asset_references(
        level="A2", variant="v", section="CE", content=paper, github=gh,
    )
    assert result["success"] is True
    assert result["all_present"] is True
    assert result["checked"] == 2


def test_verify_flags_missing_image_with_field_path():
    import copy
    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["exercises"][1]["questions"][0]["options"] = [
        {"label": "a", "img_url": "assets/q1-a.webp", "desc": "x"},
        {"label": "b", "img_url": "assets/MISSING.webp", "desc": "y"},
    ]
    paper["exercises"][1]["questions"][0]["correct_answer"] = 0
    # Nested + flat conflict — need to clear flat fields for the
    # exercise to pass schema validation
    gh = _FakeGithub({"delf/a2/v/CE/assets/q1-a.webp": b""})
    result = verify_delf_asset_references(
        level="A2", variant="v", section="CE", content=paper, github=gh,
    )
    assert result["success"] is True
    assert result["all_present"] is False
    assert any(
        m["value"] == "assets/MISSING.webp"
        and "questions[0].options[1]" in m["field"]
        for m in result["missing"]
    )


def test_verify_checks_audio_filename_for_co_papers():
    import copy
    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["section"] = "CO"
    paper["audio_filename"] = "DELF_TP_A2_Piste28.mp3"
    gh = _FakeGithub({
        "delf/a2/v/CO/audio/DELF_TP_A2_Piste28.mp3": b"",
    })
    result = verify_delf_asset_references(
        level="A2", variant="v", section="CO", content=paper, github=gh,
    )
    assert result["success"] is True
    assert result["all_present"] is True


def test_verify_flags_missing_audio_filename():
    import copy
    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["section"] = "CO"
    paper["audio_filename"] = "DELF_TP_A2_Piste99.mp3"
    gh = _FakeGithub()
    result = verify_delf_asset_references(
        level="A2", variant="v", section="CO", content=paper, github=gh,
    )
    assert result["success"] is True
    assert result["all_present"] is False
    assert any(
        m["field"] == "audio_filename"
        and m["value"] == "DELF_TP_A2_Piste99.mp3"
        for m in result["missing"]
    )


def test_verify_rejects_malformed_content():
    result = verify_delf_asset_references(
        level="A2", variant="v", section="CE",
        content="{not json", github=_FakeGithub(),
    )
    assert result["success"] is False


# ---------------------------------------------------------------------------
# migrate_legacy_image_assets
# ---------------------------------------------------------------------------


def test_migrate_legacy_assets_dry_run_plans_without_writes():
    import copy

    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["test_id"] = "tp-04"
    paper["exercises"][1]["questions"][0]["options"] = [
        {"label": "a", "img_url": "assets/tp04-q1-a.webp", "desc": "x"},
        {"label": "b", "img_url": "assets/tp-04/q01/b.webp", "desc": "y"},
    ]
    paper["exercises"][1]["questions"][0]["correct_answer"] = 0
    row = SimpleNamespace(
        id="row-1",
        test_id="tp-04",
        level="A2",
        variant="v",
        section="CE",
        status="active",
        github_path="delf/a2/v/CE/tp/tp-04.json",
    )
    gh = _FakeGithub({
        "delf/a2/v/CE/assets/tp04-q1-a.webp": b"legacy",
    })

    result = migrate_legacy_image_assets(
        level="A2",
        variant="v",
        section="CE",
        test_id="tp-04",
        dry_run=True,
        repo=_FakeRepo(row),
        github_repo=_FakeGithubRepo(paper),
        github=gh,
    )

    assert result["success"] is True
    assert result["dry_run"] is True
    assert result["planned_count"] == 1
    assert result["planned"][0]["to"] == "assets/tp-04/q01/a.webp"
    assert gh.created == []
    assert gh.updated == []


def test_migrate_legacy_assets_copies_and_updates_json():
    import copy

    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["test_id"] = "tp-04"
    paper["exercises"][1]["questions"][0]["options"] = [
        {"label": "a", "img_url": "assets/tp04-q1-a.webp", "desc": "x"},
        {"label": "b", "img_url": "assets/tp04-q1-b.webp", "desc": "y"},
    ]
    paper["exercises"][1]["questions"][0]["correct_answer"] = 0
    row = SimpleNamespace(
        id="row-1",
        test_id="tp-04",
        level="A2",
        variant="v",
        section="CE",
        status="active",
        github_path="delf/a2/v/CE/tp/tp-04.json",
    )
    gh = _FakeGithub({
        "delf/a2/v/CE/assets/tp04-q1-a.webp": b"a",
        "delf/a2/v/CE/assets/tp04-q1-b.webp": b"b",
    })

    result = migrate_legacy_image_assets(
        level="A2",
        variant="v",
        section="CE",
        test_id="tp-04",
        dry_run=False,
        confirm_write=True,
        repo=_FakeRepo(row),
        github_repo=_FakeGithubRepo(paper),
        github=gh,
    )

    assert result["success"] is True
    assert result["migrated_count"] == 2
    assert gh.files["delf/a2/v/CE/assets/tp-04/q01/a.webp"] == b"a"
    assert gh.files["delf/a2/v/CE/assets/tp-04/q01/b.webp"] == b"b"
    assert "delf/a2/v/CE/tp/tp-04.json" in gh.updated

    updated_json = json.loads(gh.files["delf/a2/v/CE/tp/tp-04.json"])
    options = updated_json["exercises"][1]["questions"][0]["options"]
    assert [o["img_url"] for o in options] == [
        "assets/tp-04/q01/a.webp",
        "assets/tp-04/q01/b.webp",
    ]


def test_migrate_legacy_assets_converts_png_to_webp_and_updates_json():
    import copy

    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["test_id"] = "tp-04"
    paper["exercises"][1]["questions"][0]["options"] = [
        {"label": "a", "img_url": "assets/tp04-q1-a.png", "desc": "x"},
        {"label": "b", "img_url": "assets/tp-04/q01/b.png", "desc": "y"},
    ]
    paper["exercises"][1]["questions"][0]["correct_answer"] = 0
    row = SimpleNamespace(
        id="row-1",
        test_id="tp-04",
        level="A2",
        variant="v",
        section="CE",
        status="active",
        github_path="delf/a2/v/CE/tp/tp-04.json",
    )
    gh = _FakeGithub({
        "delf/a2/v/CE/assets/tp04-q1-a.png": _png_bytes(),
        "delf/a2/v/CE/assets/tp-04/q01/b.png": _png_bytes(),
    })

    result = migrate_legacy_image_assets(
        level="A2",
        variant="v",
        section="CE",
        test_id="tp-04",
        dry_run=False,
        confirm_write=True,
        repo=_FakeRepo(row),
        github_repo=_FakeGithubRepo(paper),
        github=gh,
    )

    assert result["success"] is True
    assert result["migrated_count"] == 2
    assert gh.files["delf/a2/v/CE/assets/tp-04/q01/a.webp"].startswith(b"RIFF")
    assert gh.files["delf/a2/v/CE/assets/tp-04/q01/b.webp"].startswith(b"RIFF")

    updated_json = json.loads(gh.files["delf/a2/v/CE/tp/tp-04.json"])
    options = updated_json["exercises"][1]["questions"][0]["options"]
    assert [o["img_url"] for o in options] == [
        "assets/tp-04/q01/a.webp",
        "assets/tp-04/q01/b.webp",
    ]
    assert all(ref["action"] == "converted_to_webp" for ref in result["updated_refs"])


def test_migrate_legacy_assets_falls_back_when_json_webp_source_is_png():
    import copy

    paper = copy.deepcopy(fixtures.VALID_CE_PAPER)
    paper["test_id"] = "tp-06"
    paper["exercises"][1]["questions"][0]["options"] = [
        {"label": "a", "img_url": "assets/tp06-q4-a.webp", "desc": "x"},
    ]
    paper["exercises"][1]["questions"][0]["correct_answer"] = 0
    row = SimpleNamespace(
        id="row-1",
        test_id="tp-06",
        level="A2",
        variant="tout-public-a2",
        section="CE",
        status="active",
        github_path="delf/a2/tout-public-a2/CE/tp/tp-06.json",
    )
    gh = _FakeGithub({
        "delf/a2/tout-public-a2/CE/assets/tp06-q4-a.png": _png_bytes(),
    })

    result = migrate_legacy_image_assets(
        level="A2",
        variant="tout-public-a2",
        section="CE",
        test_id="tp-06",
        dry_run=False,
        confirm_write=True,
        repo=_FakeRepo(row),
        github_repo=_FakeGithubRepo(paper),
        github=gh,
    )

    assert result["success"] is True
    assert result["migrated_count"] == 1
    updated_ref = result["updated_refs"][0]
    assert updated_ref["source_resolution"] == "extension_fallback"
    assert updated_ref["resolved_source_ref"] == "assets/tp06-q4-a.png"
    assert updated_ref["action"] == "converted_to_webp"
    assert gh.files[
        "delf/a2/tout-public-a2/CE/assets/tp-06/q01/a.webp"
    ].startswith(b"RIFF")

    updated_json = json.loads(gh.files["delf/a2/tout-public-a2/CE/tp/tp-06.json"])
    option = updated_json["exercises"][1]["questions"][0]["options"][0]
    assert option["img_url"] == "assets/tp-06/q01/a.webp"
