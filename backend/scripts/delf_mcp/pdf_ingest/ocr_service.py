"""Local OCR support for scanned DELF PDFs using ocrmypdf."""

from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class OcrResult:
    """Result of creating an OCR-backed PDF."""

    output_pdf_path: str
    command: list[str]


def ensure_ocr_available() -> None:
    """Raise a clear error when local OCR tooling is missing."""
    if shutil.which("ocrmypdf") is None:
        raise RuntimeError(
            "Scanned PDF detected, but ocrmypdf is not installed. "
            "Install it with: brew install ocrmypdf tesseract tesseract-lang"
        )


def ocr_pdf(
    *,
    input_pdf_path: str,
    output_pdf_path: str,
    language: str = "fra",
    force_ocr: bool = False,
) -> OcrResult:
    """Run ocrmypdf and return the generated OCR-backed PDF path."""
    if not os.path.exists(input_pdf_path):
        raise FileNotFoundError(f"PDF not found: {input_pdf_path}")

    ensure_ocr_available()
    Path(output_pdf_path).parent.mkdir(parents=True, exist_ok=True)

    command = [
        "ocrmypdf",
        "-l",
        language,
        "--tagged-pdf-mode",
        "ignore",
        "--deskew",
        "--clean",
    ]
    if force_ocr:
        command.append("--force-ocr")
    command.extend([input_pdf_path, output_pdf_path])

    try:
        subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        stdout = (exc.stdout or "").strip()
        detail = stderr or stdout or str(exc)
        raise RuntimeError(f"ocrmypdf failed for {input_pdf_path}: {detail}") from exc

    if not os.path.exists(output_pdf_path):
        raise RuntimeError(f"ocrmypdf did not create output PDF: {output_pdf_path}")

    return OcrResult(output_pdf_path=output_pdf_path, command=command)


__all__ = ["OcrResult", "ensure_ocr_available", "ocr_pdf"]
