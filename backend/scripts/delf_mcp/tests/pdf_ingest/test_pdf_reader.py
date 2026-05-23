"""Tests for pdf_reader (rendering + text extraction).

These tests build a synthetic PDF with pymupdf at runtime, so they need
pymupdf installed (skipped otherwise via pytest.importorskip).
"""

from __future__ import annotations

import os
import sys

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import pytest

fitz = pytest.importorskip("fitz")  # pymupdf

from scripts.delf_mcp.pdf_ingest.pdf_reader import read_pdf


def _build_pdf(path: str, pages: list[str]) -> None:
    """Build a tiny PDF with the given text on each page."""
    doc = fitz.open()
    try:
        for body in pages:
            page = doc.new_page()
            page.insert_text((72, 72), body, fontsize=14)
        doc.save(path)
    finally:
        doc.close()


def test_read_pdf_extracts_text(tmp_path):
    pdf_path = str(tmp_path / "sample.pdf")
    _build_pdf(pdf_path, ["Hello World", "Page Two"])

    result = read_pdf(pdf_path)
    assert result.page_count == 2
    assert "Hello World" in result.pages[0].text
    assert "Page Two" in result.pages[1].text
    assert result.pages[0].image_path is None


def test_read_pdf_renders_pages_when_requested(tmp_path):
    pdf_path = str(tmp_path / "sample.pdf")
    out_dir = str(tmp_path / "out")
    _build_pdf(pdf_path, ["Page One Text"])

    result = read_pdf(pdf_path, render_to_dir=out_dir)
    assert result.pages[0].image_path is not None
    assert os.path.exists(result.pages[0].image_path)
    assert result.pages[0].image_path.endswith("page-001.png")


def test_read_pdf_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        read_pdf(str(tmp_path / "nonexistent.pdf"))


def test_read_pdf_scanned_raises_value_error(tmp_path):
    """An empty PDF (no text) should raise ValueError per v1's no-OCR rule."""
    pdf_path = str(tmp_path / "empty.pdf")
    doc = fitz.open()
    try:
        doc.new_page()
        doc.save(pdf_path)
    finally:
        doc.close()

    with pytest.raises(ValueError, match="scanned"):
        read_pdf(pdf_path)


def test_read_pdf_block_extraction_preserves_bbox(tmp_path):
    pdf_path = str(tmp_path / "sample.pdf")
    _build_pdf(pdf_path, ["Block A"])

    result = read_pdf(pdf_path)
    assert result.pages[0].blocks, "expected at least one block"
    block = result.pages[0].blocks[0]
    assert "Block A" in block.text
    assert len(block.bbox) == 4
    assert block.bbox[0] >= 0
