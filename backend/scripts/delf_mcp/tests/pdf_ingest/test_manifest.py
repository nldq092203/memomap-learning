"""Round-trip tests for the manifest read/write API."""

from __future__ import annotations

import os
import sys

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import pytest

from scripts.delf_mcp.pdf_ingest.manifest import (
    ActivityRecord,
    Manifest,
    init_workspace,
    read_manifest,
    write_manifest,
)


def test_init_workspace_creates_dir(tmp_path):
    analysis_id, workspace = init_workspace(workspace_root=str(tmp_path))
    assert os.path.isdir(workspace)
    assert os.path.isdir(os.path.join(workspace, "pages"))
    assert workspace.endswith(analysis_id)


def test_manifest_round_trip(tmp_path):
    analysis_id, workspace = init_workspace(workspace_root=str(tmp_path))
    manifest = Manifest(
        analysis_id=analysis_id,
        level="A2",
        variant="tout-public-a2",
        exercise_pdf_path="/abs/path/to/book.pdf",
        answer_pdf_path="/abs/path/to/answers.pdf",
        workspace_dir=workspace,
        activities=[
            ActivityRecord(
                activity_number=1,
                section="CE",
                chapter_number=2,
                title="Activité 1",
                page_start=10,
                page_end=11,
                text="Some activity text.",
                answer_key={1: 0, 2: 1},
            ),
            ActivityRecord(
                activity_number=2,
                section="CO",
                chapter_number=2,
                title="Activité 2",
                page_start=12,
                page_end=13,
                text="Listening activity.",
                track_numbers=[5],
                audio_filename="DELF_TP_A2_Piste05.mp3",
                audio_exists=True,
            ),
        ],
    )
    path = write_manifest(manifest)
    assert os.path.exists(path)

    loaded = read_manifest(analysis_id, workspace_root=str(tmp_path))
    assert loaded.analysis_id == analysis_id
    assert loaded.level == "A2"
    assert loaded.exercise_pdf_path == "/abs/path/to/book.pdf"
    assert len(loaded.activities) == 2
    assert loaded.activities[0].section == "CE"
    assert loaded.activities[1].track_numbers == [5]
    assert loaded.activities[1].audio_exists is True


def test_read_manifest_missing_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        read_manifest("does-not-exist", workspace_root=str(tmp_path))


def test_manifest_schema_version_mismatch(tmp_path):
    analysis_id, workspace = init_workspace(workspace_root=str(tmp_path))
    bad_path = os.path.join(workspace, "manifest.json")
    with open(bad_path, "w", encoding="utf-8") as fh:
        fh.write('{"schema_version": 99, "analysis_id": "x", "level": "A2",'
                 ' "variant": "v", "exercise_pdf_path": "p", "workspace_dir": "w"}')
    with pytest.raises(ValueError):
        read_manifest(analysis_id, workspace_root=str(tmp_path))
