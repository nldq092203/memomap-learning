"""Extract image-option crops from a DELF book PDF (v2).

For each activity whose text triggers an image-option cue, this module
finds embedded images on the relevant pages, groups them into rows
(= questions), labels each one a/b/c/d in reading order, and saves a
WebP crop of the rendered page region for each option.

The cropping uses pymupdf to render just the bbox of the embedded image
at a higher DPI — this preserves the look of the page (including any
label text overlaying the image) better than dumping the raw bitmap.

Outputs `ImageOptionCrop` records that the rest of the pipeline consumes:
- analyze_service stores them in `ActivityRecord.image_option_crops`
- preview_service assigns `img_url` once the test_id is chosen
- save_service uploads each local WebP via `upload_delf_asset`
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .manifest import ImageOptionCrop, crops_dir
from .pdf_reader import PdfDocument


# Default render DPI for the cropped option image. Higher than the page-
# level render DPI because options often occupy a small fraction of the page.
DEFAULT_CROP_DPI = 220

# Minimum bbox area (in PDF points squared) for an embedded image to be
# considered an option. Filters out tiny logos, bullet icons, etc.
MIN_IMAGE_AREA = 2500

# Y-coordinate tolerance (in PDF points) for grouping images into one row.
# Two images whose centers differ by less than this Y delta are treated
# as the same "question row." Tuned for typical DELF prep book layouts.
ROW_GROUPING_Y_TOLERANCE = 30.0


def _load_fitz() -> Any:
    try:
        import fitz  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ImportError(
            "pymupdf is required for image-option extraction. "
            "Install with: pip install -r backend/requirements-delf-pdf.txt"
        ) from exc
    return fitz


def _list_embedded_images_on_page(
    page: Any,
) -> list[tuple[float, float, float, float]]:
    """Return bboxes of embedded raster images on `page` (PDF points)."""
    bboxes: list[tuple[float, float, float, float]] = []
    try:
        info = page.get_image_info(xrefs=False)
    except TypeError:
        info = page.get_image_info()
    for entry in info or []:
        bbox = entry.get("bbox") if isinstance(entry, dict) else None
        if not bbox or len(bbox) != 4:
            continue
        x0, y0, x1, y1 = (float(v) for v in bbox)
        if x1 <= x0 or y1 <= y0:
            continue
        if (x1 - x0) * (y1 - y0) < MIN_IMAGE_AREA:
            continue
        bboxes.append((x0, y0, x1, y1))
    return bboxes


def _group_into_rows(
    bboxes: list[tuple[int, tuple[float, float, float, float]]],
    *,
    tolerance: float = ROW_GROUPING_Y_TOLERANCE,
) -> list[list[tuple[int, tuple[float, float, float, float]]]]:
    """Group `[(page_number, bbox)]` entries by vertical (Y) proximity.

    Returns one list per row, top-to-bottom. Within each row the entries
    are sorted left-to-right.
    """
    if not bboxes:
        return []

    # Sort by Y (top of bbox) then X (left of bbox).
    sorted_entries = sorted(
        bboxes,
        key=lambda entry: (entry[0], entry[1][1], entry[1][0]),
    )

    rows: list[list[tuple[int, tuple[float, float, float, float]]]] = []
    current_row: list[tuple[int, tuple[float, float, float, float]]] = []
    current_y_center: float | None = None
    current_page: int | None = None

    for entry in sorted_entries:
        page_number, bbox = entry
        y_center = (bbox[1] + bbox[3]) / 2.0
        if (
            current_y_center is None
            or current_page != page_number
            or abs(y_center - current_y_center) > tolerance
        ):
            if current_row:
                current_row.sort(key=lambda e: e[1][0])  # left-to-right
                rows.append(current_row)
            current_row = [entry]
            current_y_center = y_center
            current_page = page_number
        else:
            current_row.append(entry)
            # Update the running center as a running average.
            current_y_center = (
                current_y_center * (len(current_row) - 1) + y_center
            ) / len(current_row)

    if current_row:
        current_row.sort(key=lambda e: e[1][0])
        rows.append(current_row)
    return rows


def _crop_to_webp(
    *,
    fitz_module: Any,
    pdf: Any,
    page_number: int,
    bbox: tuple[float, float, float, float],
    output_path: str,
    dpi: int = DEFAULT_CROP_DPI,
) -> None:
    """Render `bbox` of `page_number` to a WebP at `output_path`."""
    page = pdf.load_page(page_number - 1)  # 0-indexed
    clip = fitz_module.Rect(*bbox)
    pixmap = page.get_pixmap(clip=clip, dpi=dpi)

    # Try pymupdf's native WebP writer first (newer versions).
    if hasattr(pixmap, "tobytes"):
        try:
            webp_bytes = pixmap.tobytes("webp")
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as fh:
                fh.write(webp_bytes)
            return
        except Exception:
            pass

    # Fallback: render to PNG, convert via Pillow.
    try:
        from PIL import Image  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ImportError(
            "Pillow is required for image-option cropping when pymupdf "
            "lacks native WebP support. Install backend/requirements-delf-local.txt."
        ) from exc

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    mode = "RGB" if pixmap.n == 3 else "RGBA"
    img = Image.frombytes(mode, [pixmap.width, pixmap.height], pixmap.samples)
    if mode == "RGBA":
        img = img.convert("RGB")
    img.save(output_path, "WEBP", quality=92)


def extract_image_options_for_activity(
    *,
    pdf_path: str,
    page_start: int,
    page_end: int,
    activity_number: int,
    workspace_dir: str,
    dpi: int = DEFAULT_CROP_DPI,
) -> list[ImageOptionCrop]:
    """Find embedded images across an activity's pages, group into rows,
    crop each to a WebP, and return one ImageOptionCrop per option.

    Multiple rows of images → multiple questions (numbered top-to-bottom).
    Within each row, options are labeled a, b, c, d, ... left-to-right.

    Returns an empty list when no embedded images meet the size threshold.
    """
    fitz = _load_fitz()

    all_bboxes: list[tuple[int, tuple[float, float, float, float]]] = []
    with fitz.open(pdf_path) as pdf:
        for page_index in range(pdf.page_count):
            page_number = page_index + 1
            if page_number < page_start or page_number > page_end:
                continue
            page = pdf.load_page(page_index)
            for bbox in _list_embedded_images_on_page(page):
                all_bboxes.append((page_number, bbox))

        rows = _group_into_rows(all_bboxes)
        crops: list[ImageOptionCrop] = []
        activity_crops_root = os.path.join(
            crops_dir(workspace_dir),
            f"activity-{activity_number:02d}",
        )

        for row_idx, row in enumerate(rows):
            question_number = row_idx + 1
            for opt_idx, (page_number, bbox) in enumerate(row):
                label = chr(ord("a") + opt_idx)
                if opt_idx >= 6:  # cap at f to match label regex elsewhere
                    break
                output_path = os.path.join(
                    activity_crops_root,
                    f"q{question_number:02d}",
                    f"{label}.webp",
                )
                _crop_to_webp(
                    fitz_module=fitz,
                    pdf=pdf,
                    page_number=page_number,
                    bbox=bbox,
                    output_path=output_path,
                    dpi=dpi,
                )
                crops.append(
                    ImageOptionCrop(
                        question_number=question_number,
                        label=label,
                        local_path=output_path,
                        page_number=page_number,
                        bbox=bbox,
                    )
                )
    return crops


def extract_image_options_for_activities(
    *,
    exercise_pdf_path: str,
    exercise_pdf: PdfDocument,
    workspace_dir: str,
) -> dict[int, list[ImageOptionCrop]]:
    """Helper used by analyze_service: scan every detected activity and
    return `{activity_number: [crops]}` for the ones that yielded crops.

    Activities are not pre-classified here; analyze_service's image-option
    detection decides whether to USE the crops. Extracting unconditionally
    is fine because empty rows return empty lists.

    Imports `detect_activities` lazily to keep the dependency graph small.
    """
    from .activity_detector import detect_activities

    activities = detect_activities(exercise_pdf.pages)
    out: dict[int, list[ImageOptionCrop]] = {}
    for activity in activities:
        crops = extract_image_options_for_activity(
            pdf_path=exercise_pdf_path,
            page_start=activity.page_start,
            page_end=activity.page_end,
            activity_number=activity.activity_number,
            workspace_dir=workspace_dir,
        )
        if crops:
            out[activity.activity_number] = crops
    return out


__all__ = [
    "DEFAULT_CROP_DPI",
    "MIN_IMAGE_AREA",
    "ROW_GROUPING_Y_TOLERANCE",
    "extract_image_options_for_activity",
    "extract_image_options_for_activities",
]
