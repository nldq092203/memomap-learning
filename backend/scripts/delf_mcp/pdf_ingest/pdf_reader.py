"""Render a PDF to per-page PNG images and extract per-page text via pymupdf.

`pymupdf` is imported lazily so importing this module costs nothing when the
optional dep isn't installed. The render+extract step is the only place we
touch pymupdf — every downstream module operates on the plain `PageContent`
records produced here.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


# Default rendering DPI. 200 is plenty for text-only born-digital PDFs and
# keeps PNGs under 1MB per page on typical book layouts. v2 image-option
# crops may want to bump this for sharper option boxes.
DEFAULT_RENDER_DPI = 200

# A page is considered "has embedded text" if its extracted text contains
# at least this many characters. A PDF where zero pages clear this bar is
# treated as scanned (v1 has no OCR fallback).
MIN_TEXT_CHARS_PER_PAGE = 5


@dataclass(frozen=True)
class TextBlock:
    """One contiguous text region on a page (pymupdf block)."""

    text: str
    bbox: tuple[float, float, float, float]  # x0, y0, x1, y1 in PDF points


@dataclass(frozen=True)
class PageContent:
    """All extracted content for one PDF page."""

    page_number: int  # 1-indexed
    width: float  # PDF points
    height: float
    text: str  # concatenation of block texts, blocks separated by "\n\n"
    blocks: list[TextBlock] = field(default_factory=list)
    image_path: str | None = None  # path to rendered PNG, None if render skipped


@dataclass(frozen=True)
class PdfDocument:
    """A parsed PDF's pages plus document-level metadata."""

    source_path: str
    page_count: int
    pages: list[PageContent]


def _load_fitz() -> Any:
    """Import pymupdf (alias `fitz`) lazily with a clear error message."""
    try:
        import fitz  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ImportError(
            "pymupdf is required for PDF ingestion. "
            "Install with: pip install -r backend/requirements-delf-pdf.txt"
        ) from exc
    return fitz


def _ensure_dir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def _block_text(block: tuple[Any, ...]) -> str:
    """Extract the text payload from a pymupdf block tuple.

    pymupdf returns each block as `(x0, y0, x1, y1, text, block_no, block_type)`
    where block_type=0 means text. Non-text blocks (images) come through with
    block_type=1; we skip those.
    """
    if len(block) < 7:
        return ""
    if block[6] != 0:  # not a text block
        return ""
    text = block[4]
    return text.strip() if isinstance(text, str) else ""


def read_pdf(
    pdf_path: str,
    *,
    render_to_dir: str | None = None,
    dpi: int = DEFAULT_RENDER_DPI,
) -> PdfDocument:
    """Open a PDF, extract per-page text, and optionally render PNGs.

    Args:
        pdf_path: Absolute path to the PDF file.
        render_to_dir: If set, writes `page-{NNN}.png` files under this
            directory and populates `PageContent.image_path`. The directory
            is created if missing. If None, no images are written.
        dpi: Rendering resolution in DPI. Ignored when `render_to_dir` is None.

    Returns:
        PdfDocument with one PageContent per page.

    Raises:
        FileNotFoundError: `pdf_path` does not exist.
        ImportError: pymupdf is not installed.
        ValueError: PDF appears to be entirely scanned (no embedded text on
            any page). v1 does not OCR; the caller should surface this to the
            user as a `scanned_pdf` warning.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    fitz = _load_fitz()

    if render_to_dir is not None:
        _ensure_dir(render_to_dir)

    pages: list[PageContent] = []
    pages_with_text = 0

    with fitz.open(pdf_path) as doc:  # type: ignore[attr-defined]
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)
            page_number = page_index + 1

            raw_blocks = page.get_text("blocks") or []
            blocks: list[TextBlock] = []
            for block in raw_blocks:
                text = _block_text(block)
                if not text:
                    continue
                bbox = (
                    float(block[0]),
                    float(block[1]),
                    float(block[2]),
                    float(block[3]),
                )
                blocks.append(TextBlock(text=text, bbox=bbox))

            full_text = "\n\n".join(b.text for b in blocks)
            if len(full_text) >= MIN_TEXT_CHARS_PER_PAGE:
                pages_with_text += 1

            image_path: str | None = None
            if render_to_dir is not None:
                image_path = os.path.join(
                    render_to_dir, f"page-{page_number:03d}.png"
                )
                pixmap = page.get_pixmap(dpi=dpi)
                pixmap.save(image_path)

            pages.append(
                PageContent(
                    page_number=page_number,
                    width=float(page.rect.width),
                    height=float(page.rect.height),
                    text=full_text,
                    blocks=blocks,
                    image_path=image_path,
                )
            )

    if pages and pages_with_text == 0:
        raise ValueError(
            "PDF appears to be scanned (no embedded text). "
            "OCR fallback is not implemented in v1 — see milestone v4."
        )

    return PdfDocument(
        source_path=pdf_path,
        page_count=len(pages),
        pages=pages,
    )


__all__ = [
    "DEFAULT_RENDER_DPI",
    "MIN_TEXT_CHARS_PER_PAGE",
    "PageContent",
    "PdfDocument",
    "TextBlock",
    "read_pdf",
]
