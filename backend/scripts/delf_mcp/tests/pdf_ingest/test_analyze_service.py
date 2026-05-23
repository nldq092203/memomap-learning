"""End-to-end tests for analyze_delf_book_pdf.

Builds tiny synthetic PDFs with pymupdf at runtime and runs the full
pipeline. Skipped entirely when pymupdf isn't installed.
"""

from __future__ import annotations

import json
import os
import sys

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import pytest

fitz = pytest.importorskip("fitz")  # pymupdf

from scripts.delf_mcp.pdf_ingest import warnings as warning_codes
from scripts.delf_mcp.pdf_ingest.analyze_service import analyze_delf_book_pdf


def _write_pdf(path: str, pages: list[str]) -> None:
    doc = fitz.open()
    try:
        for body in pages:
            page = doc.new_page()
            # Use Latin-1-safe fallback for non-ASCII text.
            page.insert_text((50, 50), body, fontsize=11, fontname="helv")
        doc.save(path)
    finally:
        doc.close()


class _FakeGithub:
    def __init__(self, existing_paths: set[str]):
        self.existing_paths = existing_paths

    def file_exists(self, path: str) -> bool:
        return path in self.existing_paths


def test_analyze_ce_book_end_to_end(tmp_path):
    exercise_pdf = str(tmp_path / "book.pdf")
    answer_pdf = str(tmp_path / "answers.pdf")

    _write_pdf(exercise_pdf, [
        (
            "Chapitre 1\n"
            "Activite 1\n"
            "Comprehension ecrite\n"
            "Lisez le texte.\n\n"
            "Paris est la capitale.\n\n"
            "1. Quelle est la capitale ?\n"
            "a) Lyon\nb) Paris\nc) Marseille"
        ),
    ])
    _write_pdf(answer_pdf, ["Activite 1\n1. b"])

    out = analyze_delf_book_pdf(
        exercise_pdf_path=exercise_pdf,
        answer_pdf_path=answer_pdf,
        level="A2",
        variant="tout-public-a2",
        workspace_root=str(tmp_path / "work"),
    )
    assert out["success"] is True, out
    assert out["activity_count"] == 1
    summary = out["activities_summary"][0]
    assert summary["activity_number"] == 1
    # The classifier uses accent-tolerant matching; "Comprehension ecrite"
    # without accents should still resolve to CE.
    assert summary["section"] == "CE"
    assert summary["has_answer_key"] is True

    # Manifest persisted at the documented location.
    assert os.path.exists(out["manifest_path"])
    with open(out["manifest_path"], "r", encoding="utf-8") as fh:
        manifest_data = json.load(fh)
    assert manifest_data["activities"][0]["activity_number"] == 1


def test_analyze_co_book_resolves_audio(tmp_path):
    exercise_pdf = str(tmp_path / "book.pdf")
    _write_pdf(exercise_pdf, [
        (
            "Activite 1\n"
            "Comprehension orale\n"
            "Ecoutez la Piste 5.\n\n"
            "1. Question ?\n"
            "a) Oui\nb) Non"
        ),
    ])

    github = _FakeGithub({
        "delf/a2/tout-public-a2/CO/audio/DELF_TP_A2_Piste05.mp3",
    })
    out = analyze_delf_book_pdf(
        exercise_pdf_path=exercise_pdf,
        answer_pdf_path=None,
        level="A2",
        variant="tout-public-a2",
        workspace_root=str(tmp_path / "work"),
        github=github,
    )
    assert out["success"] is True
    summary = out["activities_summary"][0]
    assert summary["section"] == "CO"
    assert summary["track_numbers"] == [5]
    assert summary["audio_filename"] == "DELF_TP_A2_Piste05.mp3"
    assert summary["audio_exists"] is True


def test_analyze_co_warns_when_audio_missing(tmp_path):
    exercise_pdf = str(tmp_path / "book.pdf")
    _write_pdf(exercise_pdf, [
        (
            "Activite 1\n"
            "Comprehension orale\n"
            "Ecoutez la Piste 99.\n\n"
            "1. Question ?\n"
            "a) Oui\nb) Non"
        ),
    ])

    github = _FakeGithub(set())  # nothing exists
    out = analyze_delf_book_pdf(
        exercise_pdf_path=exercise_pdf,
        answer_pdf_path=None,
        level="A2",
        variant="tout-public-a2",
        workspace_root=str(tmp_path / "work"),
        github=github,
    )
    assert out["success"] is True
    # Per-activity warning includes missing_audio code.
    activities = out["activities_summary"]
    assert activities[0]["audio_exists"] is False
    # The detailed warnings live in the manifest, but we also surface a
    # global warning for the missing answer PDF.
    global_codes = {w["code"] for w in out["warnings"]}
    assert warning_codes.MISSING_ANSWER_KEY in global_codes


def test_analyze_returns_error_for_scanned_pdf(tmp_path):
    pdf_path = str(tmp_path / "empty.pdf")
    doc = fitz.open()
    try:
        doc.new_page()
        doc.save(pdf_path)
    finally:
        doc.close()

    out = analyze_delf_book_pdf(
        exercise_pdf_path=pdf_path,
        answer_pdf_path=None,
        level="A2",
        variant="tout-public-a2",
        workspace_root=str(tmp_path / "work"),
    )
    assert out["success"] is False
    assert out["warning_code"] == warning_codes.SCANNED_PDF


def test_analyze_returns_error_for_missing_pdf(tmp_path):
    out = analyze_delf_book_pdf(
        exercise_pdf_path=str(tmp_path / "nope.pdf"),
        answer_pdf_path=None,
        level="A2",
        variant="tout-public-a2",
        workspace_root=str(tmp_path / "work"),
    )
    assert out["success"] is False
    assert "not found" in out["error"]


# ---------------------------------------------------------------------------
# v3 — CO with transcript end-to-end
# ---------------------------------------------------------------------------


def test_analyze_co_with_transcript_attaches_to_manifest(tmp_path):
    from scripts.delf_mcp.pdf_ingest.manifest import read_manifest

    exercise_pdf = str(tmp_path / "book.pdf")
    answer_pdf = str(tmp_path / "answers.pdf")

    _write_pdf(exercise_pdf, [
        (
            "Activite 1\n"
            "Comprehension orale\n"
            "Ecoutez la Piste 3.\n\n"
            "1. Question ?\n"
            "a) Oui\nb) Non"
        ),
    ])
    _write_pdf(answer_pdf, [
        (
            "Activite 1\n1. a\n\n"
            "Transcriptions\n\n"
            "Activite 1\n"
            "Bonjour a tous, voici l'enregistrement complet pour cette activite."
        ),
    ])

    github = _FakeGithub({
        "delf/a2/tout-public-a2/CO/audio/DELF_TP_A2_Piste03.mp3",
    })

    out = analyze_delf_book_pdf(
        exercise_pdf_path=exercise_pdf,
        answer_pdf_path=answer_pdf,
        level="A2",
        variant="tout-public-a2",
        workspace_root=str(tmp_path / "work"),
        github=github,
    )
    assert out["success"] is True
    summary = out["activities_summary"][0]
    assert summary["section"] == "CO"
    assert summary["has_transcript"] is True
    assert summary["has_answer_key"] is True

    manifest = read_manifest(out["analysis_id"], workspace_root=str(tmp_path / "work"))
    activity = manifest.activities[0]
    assert activity.transcript is not None
    assert "Bonjour" in activity.transcript


# ---------------------------------------------------------------------------
# v2 — CE with image options end-to-end
# ---------------------------------------------------------------------------


def _build_pdf_with_image_row(path: str) -> None:
    """Synthetic CE exercise with 3 option images in a row + answer prompt."""
    import struct
    import zlib

    def _png(*, width: int = 80, height: int = 80) -> bytes:
        def _chunk(tag, data):
            return (
                struct.pack(">I", len(data))
                + tag
                + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
            )

        sig = b"\x89PNG\r\n\x1a\n"
        ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        raw = b""
        for _ in range(height):
            raw += b"\x00" + bytes((180, 180, 180)) * width
        idat = _chunk(b"IDAT", zlib.compress(raw))
        iend = _chunk(b"IEND", b"")
        return sig + ihdr + idat + iend

    doc = fitz.open()
    try:
        page = doc.new_page(width=600, height=800)
        page.insert_text(
            (50, 50),
            (
                "Activite 1\n"
                "Comprehension ecrite\n"
                "Cochez la photo qui correspond.\n\n"
                "1. Quelle scene ?"
            ),
            fontsize=12,
        )
        png = _png()
        for idx in range(3):
            x_left = 60 + idx * 150
            rect = fitz.Rect(x_left, 300, x_left + 120, 420)
            page.insert_image(rect, stream=png)
        doc.save(path)
    finally:
        doc.close()


def test_analyze_ce_with_image_options_produces_crops(tmp_path):
    from scripts.delf_mcp.pdf_ingest.manifest import read_manifest

    exercise_pdf = str(tmp_path / "book.pdf")
    answer_pdf = str(tmp_path / "answers.pdf")
    _build_pdf_with_image_row(exercise_pdf)
    _write_pdf(answer_pdf, ["Activite 1\n1. b"])

    out = analyze_delf_book_pdf(
        exercise_pdf_path=exercise_pdf,
        answer_pdf_path=answer_pdf,
        level="A2",
        variant="tout-public-a2",
        workspace_root=str(tmp_path / "work"),
    )
    assert out["success"] is True
    summary = out["activities_summary"][0]
    assert summary["has_image_options"] is True
    # image_option_crops were extracted, so the activity is in-scope.
    assert summary.get("has_image_option_crops") is True

    manifest = read_manifest(out["analysis_id"], workspace_root=str(tmp_path / "work"))
    crops = manifest.activities[0].image_option_crops
    assert len(crops) == 3
    assert [c.label for c in crops] == ["a", "b", "c"]
    for crop in crops:
        assert os.path.exists(crop.local_path)
