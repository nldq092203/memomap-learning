"""Tests for track-number extraction and audio resolution."""

from __future__ import annotations

import os
import sys

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.pdf_ingest import warnings as warning_codes
from scripts.delf_mcp.pdf_ingest.track_resolver import (
    find_track_numbers,
    resolve_tracks_for_activity,
)


class _FakeGithub:
    def __init__(self, existing_paths: set[str]):
        self.existing_paths = existing_paths

    def file_exists(self, path: str) -> bool:
        return path in self.existing_paths


def test_find_track_numbers_piste_form():
    text = "Écoutez la Piste 12 et répondez."
    assert find_track_numbers(text) == [12]


def test_find_track_numbers_track_form():
    assert find_track_numbers("Track 5 covers this exercise.") == [5]


def test_find_track_numbers_cd_form():
    assert find_track_numbers("CD 1 - 7 — écoutez le dialogue.") == [7]


def test_find_track_numbers_deduplicates_in_order():
    text = "Piste 3 ... plus tard, Piste 3 encore. Track 8 ensuite."
    assert find_track_numbers(text) == [3, 8]


def test_find_track_numbers_ignores_invalid():
    assert find_track_numbers("Piste 0 invalide. Piste 1234 hors plage.") == []


def test_resolve_tracks_warns_when_missing():
    _, exists, warnings_out = resolve_tracks_for_activity(
        activity_number=1,
        level="A2",
        variant="tout-public-a2",
        section="CO",
        track_numbers=[],
    )
    assert exists is None
    codes = {w["code"] for w in warnings_out}
    assert warning_codes.MISSING_AUDIO in codes


def test_resolve_tracks_returns_filename_when_audio_exists():
    github = _FakeGithub({
        "delf/a2/tout-public-a2/CO/audio/DELF_TP_A2_Piste05.mp3",
    })
    filename, exists, warnings_out = resolve_tracks_for_activity(
        activity_number=1,
        level="A2",
        variant="tout-public-a2",
        section="CO",
        track_numbers=[5],
        github=github,
    )
    assert filename == "DELF_TP_A2_Piste05.mp3"
    assert exists is True
    assert warnings_out == []


def test_resolve_tracks_warns_when_audio_missing_on_github():
    github = _FakeGithub(set())
    filename, exists, warnings_out = resolve_tracks_for_activity(
        activity_number=2,
        level="A2",
        variant="tout-public-a2",
        section="CO",
        track_numbers=[7],
        github=github,
    )
    assert filename == "DELF_TP_A2_Piste07.mp3"
    assert exists is False
    codes = {w["code"] for w in warnings_out}
    assert warning_codes.MISSING_AUDIO in codes


def test_resolve_tracks_multiple_tracks_uses_first_and_warns():
    github = _FakeGithub({
        "delf/a2/tout-public-a2/CO/audio/DELF_TP_A2_Piste05.mp3",
    })
    filename, exists, warnings_out = resolve_tracks_for_activity(
        activity_number=3,
        level="A2",
        variant="tout-public-a2",
        section="CO",
        track_numbers=[5, 6],
        github=github,
    )
    assert filename == "DELF_TP_A2_Piste05.mp3"
    assert exists is True
    # Multi-track warning still emitted, even when the first track exists.
    assert any(
        w["code"] == warning_codes.MISSING_AUDIO and "multiple tracks" in w["message"]
        for w in warnings_out
    )
