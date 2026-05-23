"""Tests for the v2 image-option extractor.

Builds synthetic PDFs that embed small PNG images with pymupdf at runtime,
then runs the extractor and confirms crops land in the workspace under
the expected `q{NN}/{label}.webp` structure.
"""

from __future__ import annotations

import os
import struct
import sys
import zlib

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import pytest

fitz = pytest.importorskip("fitz")  # pymupdf

from scripts.delf_mcp.pdf_ingest.image_option_extractor import (
    extract_image_options_for_activity,
)


def _solid_png_bytes(*, width: int = 80, height: int = 80, color: tuple[int, int, int] = (200, 200, 200)) -> bytes:
    """Return raw PNG bytes for a solid-color rectangle.

    Keeps the test self-contained (no Pillow dep at PDF-build time — pymupdf
    insert_image will re-encode the image as needed).
    """
    def _chunk(tag: bytes, data: bytes) -> bytes:
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
        raw += b"\x00" + bytes(color) * width
    idat = _chunk(b"IDAT", zlib.compress(raw))
    iend = _chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


def _build_pdf_with_option_images(path: str, *, count: int = 3) -> None:
    """Render a synthetic page with `count` option images arranged in a row."""
    doc = fitz.open()
    try:
        page = doc.new_page(width=600, height=800)
        page.insert_text(
            (50, 50),
            "Activite 1\nCochez la photo qui correspond.\n1. Quelle scene ?",
            fontsize=14,
        )
        png_bytes = _solid_png_bytes()
        y_top = 200
        slot_width = 120
        for idx in range(count):
            x_left = 60 + idx * (slot_width + 20)
            rect = fitz.Rect(x_left, y_top, x_left + slot_width, y_top + 120)
            page.insert_image(rect, stream=png_bytes)
        doc.save(path)
    finally:
        doc.close()


def test_extract_image_options_yields_crops_for_each_option(tmp_path):
    pdf_path = str(tmp_path / "book.pdf")
    workspace = str(tmp_path / "work")
    os.makedirs(workspace, exist_ok=True)
    _build_pdf_with_option_images(pdf_path, count=3)

    crops = extract_image_options_for_activity(
        pdf_path=pdf_path,
        page_start=1,
        page_end=1,
        activity_number=1,
        workspace_dir=workspace,
    )
    assert len(crops) == 3
    labels = [c.label for c in crops]
    assert labels == ["a", "b", "c"]
    # All from the same row → question_number = 1.
    assert {c.question_number for c in crops} == {1}
    for crop in crops:
        assert os.path.exists(crop.local_path), crop.local_path
        # Sanity: path under crops/activity-01/q01/.
        assert "/activity-01/q01/" in crop.local_path
        assert crop.local_path.endswith(f"{crop.label}.webp")


def test_multiple_rows_produce_multiple_questions(tmp_path):
    pdf_path = str(tmp_path / "book.pdf")
    workspace = str(tmp_path / "work")
    os.makedirs(workspace, exist_ok=True)

    # Build two rows of images on the same page.
    doc = fitz.open()
    try:
        page = doc.new_page(width=600, height=800)
        png = _solid_png_bytes()
        for row_idx, y_top in enumerate((200, 500)):
            for col_idx in range(2):
                x_left = 60 + col_idx * 140
                rect = fitz.Rect(x_left, y_top, x_left + 120, y_top + 120)
                page.insert_image(rect, stream=png)
        doc.save(pdf_path)
    finally:
        doc.close()

    crops = extract_image_options_for_activity(
        pdf_path=pdf_path,
        page_start=1,
        page_end=1,
        activity_number=2,
        workspace_dir=workspace,
    )
    questions = sorted({c.question_number for c in crops})
    assert questions == [1, 2]
    by_q = {q: [c for c in crops if c.question_number == q] for q in questions}
    assert [c.label for c in by_q[1]] == ["a", "b"]
    assert [c.label for c in by_q[2]] == ["a", "b"]


def test_no_images_yields_no_crops(tmp_path):
    pdf_path = str(tmp_path / "book.pdf")
    workspace = str(tmp_path / "work")
    os.makedirs(workspace, exist_ok=True)

    doc = fitz.open()
    try:
        page = doc.new_page()
        page.insert_text((50, 50), "Just text, no images.", fontsize=12)
        doc.save(pdf_path)
    finally:
        doc.close()

    crops = extract_image_options_for_activity(
        pdf_path=pdf_path,
        page_start=1,
        page_end=1,
        activity_number=1,
        workspace_dir=workspace,
    )
    assert crops == []
