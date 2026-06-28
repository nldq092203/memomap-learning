"""Tests for assets/audio_naming.py — pure logic + fake GitHub."""

from __future__ import annotations

import os
import sys

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.assets.audio_naming import (  # noqa: E402
    build_audio_directory,
    build_audio_filename,
    resolve_delf_audio_filename,
)


class _FakeGithub:
    def __init__(self, existing: set[str]):
        self.existing = existing
        self.calls: list[str] = []

    def file_exists(self, path: str) -> bool:
        self.calls.append(path)
        return path in self.existing


# ---------------------------------------------------------------------------
# Filename building
# ---------------------------------------------------------------------------


def test_a2_uses_uppercase_DELF_prefix():
    assert build_audio_filename("A2", 28) == "DELF_TP_A2_Piste28.mp3"


def test_b1_uses_titlecase_Delf_prefix():
    assert build_audio_filename("B1", 28) == "Delf_TP_B1_Piste28.mp3"


def test_lowercase_level_input_still_works():
    assert build_audio_filename("a2", 1) == "DELF_TP_A2_Piste01.mp3"


def test_zero_padding_for_single_digit_track():
    assert build_audio_filename("A2", 7) == "DELF_TP_A2_Piste07.mp3"


def test_three_digit_track_is_not_truncated():
    assert build_audio_filename("A2", 123) == "DELF_TP_A2_Piste123.mp3"


def test_unknown_level_falls_back_to_default_template():
    assert build_audio_filename("C1", 5) == "DELF_TP_C1_Piste05.mp3"


def test_directory_lowercases_level():
    assert (
        build_audio_directory("A2", "tout-public-a2", "CO")
        == "delf/a2/tout-public-a2/CO/audio"
    )


# ---------------------------------------------------------------------------
# resolve_delf_audio_filename
# ---------------------------------------------------------------------------


def test_resolve_returns_exists_true_when_file_present():
    fake = _FakeGithub({"delf/a2/tout-public-a2/CO/audio/DELF_TP_A2_Piste28.mp3"})
    result = resolve_delf_audio_filename(
        level="A2",
        variant="tout-public-a2",
        section="CO",
        track_number=28,
        github=fake,
    )
    assert result["success"] is True
    assert result["exists"] is True
    assert result["filename"] == "DELF_TP_A2_Piste28.mp3"
    assert result["audio_filename_value"] == "DELF_TP_A2_Piste28.mp3"
    assert result["github_path"] == (
        "delf/a2/tout-public-a2/CO/audio/DELF_TP_A2_Piste28.mp3"
    )


def test_resolve_returns_exists_false_with_helpful_message():
    fake = _FakeGithub(set())
    result = resolve_delf_audio_filename(
        level="B1",
        variant="tout-public-b1",
        section="CO",
        track_number=99,
        github=fake,
    )
    assert result["success"] is True
    assert result["exists"] is False
    assert result["filename"] == "Delf_TP_B1_Piste99.mp3"
    assert "no such file exists" in result["message"]


def test_resolve_rejects_zero_or_negative_track():
    fake = _FakeGithub(set())
    bad = resolve_delf_audio_filename(
        level="A2", variant="v", section="CO", track_number=0, github=fake
    )
    assert bad["success"] is False
    assert "track_number" in bad["error"]


def test_resolve_handles_github_failure_gracefully():
    class _Broken:
        def file_exists(self, path):
            raise RuntimeError("rate limited")

    result = resolve_delf_audio_filename(
        level="A2",
        variant="v",
        section="CO",
        track_number=1,
        github=_Broken(),
    )
    assert result["success"] is False
    assert "rate limited" in result["error"]
    # We still return the candidate filename so the agent has context
    assert "filename" in result
