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

# OCR-scanned PDFs often contain one full-page background image, not one
# embedded image per visual answer option. For those files, fall back to
# rendering the page and detecting visual option rows with OpenCV.
SCAN_RENDER_DPI = 200
SCAN_MIN_COMPONENT_AREA = 2500
SCAN_ROW_GROUPING_Y_TOLERANCE_PX = 90
SCAN_COLUMN_GAP_PX = 25
SCAN_NARROW_COLUMN_WIDTH_PX = 120


def _load_fitz() -> Any:
    try:
        import fitz  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ImportError(
            "pymupdf is required for image-option extraction. "
            "Install with: pip install -r backend/requirements-delf-pdf.txt"
        ) from exc
    return fitz


def _load_cv2() -> tuple[Any, Any]:
    try:
        import cv2  # type: ignore[import-not-found]
        import numpy as np  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ImportError(
            "opencv-python-headless and numpy are required for scanned-PDF "
            "image-option extraction. Install backend/requirements-delf-local.txt."
        ) from exc
    return cv2, np


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


def _is_full_page_bbox(
    page: Any, bbox: tuple[float, float, float, float]
) -> bool:
    x0, y0, x1, y1 = bbox
    width = max(1.0, float(page.rect.width))
    height = max(1.0, float(page.rect.height))
    area_ratio = ((x1 - x0) * (y1 - y0)) / (width * height)
    width_ratio = (x1 - x0) / width
    height_ratio = (y1 - y0) / height
    return area_ratio > 0.65 and width_ratio > 0.75 and height_ratio > 0.75


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


def _render_page_bgr(*, page: Any, dpi: int) -> tuple[Any, float, float]:
    """Render a page to an OpenCV BGR array plus PDF-point scale factors."""
    cv2, np = _load_cv2()
    pixmap = page.get_pixmap(dpi=dpi, alpha=False)
    channels = pixmap.n
    image = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(
        pixmap.height, pixmap.width, channels
    )
    if channels == 1:
        image_bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    else:
        image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    scale_x = float(page.rect.width) / float(pixmap.width)
    scale_y = float(page.rect.height) / float(pixmap.height)
    return image_bgr, scale_x, scale_y


def _component_boxes_from_page_image(image_bgr: Any) -> list[tuple[int, int, int, int]]:
    """Detect large visual components on a rendered scanned page.

    Text produces many small contours; the size/aspect filters below keep the
    large photos/icons/clocks that represent image answer choices.
    """
    cv2, np = _load_cv2()
    height, width = image_bgr.shape[:2]
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    colorful = ((saturation > 35) & (value < 253)).astype(np.uint8) * 255
    dark = (gray < 120).astype(np.uint8) * 255
    mask = cv2.bitwise_or(colorful, dark)

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)),
        iterations=1,
    )
    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11)),
        iterations=2,
    )

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes: list[tuple[int, int, int, int]] = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < SCAN_MIN_COMPONENT_AREA:
            continue
        if w < 45 or h < 45:
            continue
        if w > width * 0.55 or h > height * 0.35:
            continue
        # Skip very thin text rules or merged text lines.
        aspect = w / max(1, h)
        if aspect > 8 or aspect < 0.12:
            continue
        boxes.append((x, y, x + w, y + h))
    return boxes


def _group_pixel_boxes_into_rows(
    boxes: list[tuple[int, int, int, int]]
) -> list[list[tuple[int, int, int, int]]]:
    if not boxes:
        return []
    sorted_boxes = sorted(boxes, key=lambda b: ((b[1] + b[3]) / 2, b[0]))
    rows: list[list[tuple[int, int, int, int]]] = []
    current: list[tuple[int, int, int, int]] = []
    current_y: float | None = None
    for box in sorted_boxes:
        y_center = (box[1] + box[3]) / 2.0
        if (
            current_y is None
            or abs(y_center - current_y) > SCAN_ROW_GROUPING_Y_TOLERANCE_PX
        ):
            if current:
                rows.append(sorted(current, key=lambda b: b[0]))
            current = [box]
            current_y = y_center
        else:
            current.append(box)
            current_y = (current_y * (len(current) - 1) + y_center) / len(current)
    if current:
        rows.append(sorted(current, key=lambda b: b[0]))
    return rows


def _merge_row_components(
    row: list[tuple[int, int, int, int]]
) -> list[tuple[int, int, int, int]]:
    """Merge nearby contours in one visual option row into option columns."""
    if not row:
        return []
    columns: list[list[int]] = []
    current = [row[0][0], row[0][1], row[0][2], row[0][3]]
    for x0, y0, x1, y1 in row[1:]:
        gap = x0 - current[2]
        horizontal_overlap = x0 <= current[2] and x1 >= current[0]
        if horizontal_overlap or gap <= SCAN_COLUMN_GAP_PX:
            current = [
                min(current[0], x0),
                min(current[1], y0),
                max(current[2], x1),
                max(current[3], y1),
            ]
        else:
            columns.append(current)
            current = [x0, y0, x1, y1]
    columns.append(current)

    # Some photos contain a separated dark object near the left edge, which
    # contour detection may split into a narrow extra "column". When a row is
    # otherwise a standard three-option row, merge the narrow fragment into
    # its nearest neighbor.
    while len(columns) == 4:
        widths = [c[2] - c[0] for c in columns]
        narrow_idx = next(
            (idx for idx, width in enumerate(widths) if width <= SCAN_NARROW_COLUMN_WIDTH_PX),
            None,
        )
        if narrow_idx is None:
            break
        if narrow_idx == 0:
            neighbor_idx = 1
        elif narrow_idx == len(columns) - 1:
            neighbor_idx = narrow_idx - 1
        else:
            left_gap = columns[narrow_idx][0] - columns[narrow_idx - 1][2]
            right_gap = columns[narrow_idx + 1][0] - columns[narrow_idx][2]
            neighbor_idx = narrow_idx - 1 if left_gap <= right_gap else narrow_idx + 1
        lo = min(narrow_idx, neighbor_idx)
        hi = max(narrow_idx, neighbor_idx)
        merged = [
            min(columns[lo][0], columns[hi][0]),
            min(columns[lo][1], columns[hi][1]),
            max(columns[lo][2], columns[hi][2]),
            max(columns[lo][3], columns[hi][3]),
        ]
        columns[lo : hi + 1] = [merged]

    return [(c[0], c[1], c[2], c[3]) for c in columns]


def _question_y_positions(page: Any) -> list[tuple[int, float]]:
    """Return question numbers and their top Y positions in PDF points."""
    import re

    # OCR sometimes confuses numeric question labels with similar glyphs.
    ocr_number_aliases = {
        "À": 1,
        "A": 1,
        "D": 5,
        "G": 6,
    }
    positions: list[tuple[int, float]] = []
    seen: set[tuple[int, int]] = set()
    for word in page.get_text("words") or []:
        if len(word) < 5:
            continue
        text = str(word[4]).strip()
        stripped = text.rstrip(".:,;")
        x0 = float(word[0])
        y = float(word[1])
        # Real question numbers sit in the left question-number gutter.
        # This avoids treating values inside question text ("20 %", "90 euros")
        # as question anchors for the following visual row.
        if not (85.0 <= x0 <= 135.0):
            continue
        if y < 125.0:
            continue
        number: int | None = None
        if re.fullmatch(r"\d{1,2}", stripped):
            number = int(stripped)
        elif stripped in ocr_number_aliases:
            number = ocr_number_aliases[stripped]
        if number is None or number < 1 or number > 20:
            continue
        key = (number, round(y))
        if key in seen:
            continue
        seen.add(key)
        positions.append((number, y))
    positions.sort(key=lambda item: item[1])
    return positions


def _question_number_for_row(
    *,
    row_bbox_pdf: tuple[float, float, float, float],
    question_positions: list[tuple[int, float]],
    fallback: int,
) -> int:
    row_top = row_bbox_pdf[1]
    before = [item for item in question_positions if item[1] < row_top - 2]
    if before:
        return before[-1][0]
    return fallback


def _extract_scanned_page_image_options(
    *,
    fitz_module: Any,
    pdf: Any,
    page_number: int,
    activity_number: int,
    workspace_dir: str,
    dpi: int,
) -> list[ImageOptionCrop]:
    page = pdf.load_page(page_number - 1)
    image_bgr, scale_x, scale_y = _render_page_bgr(page=page, dpi=SCAN_RENDER_DPI)
    raw_boxes = _component_boxes_from_page_image(image_bgr)
    rows = _group_pixel_boxes_into_rows(raw_boxes)
    question_positions = _question_y_positions(page)

    crops: list[ImageOptionCrop] = []
    activity_crops_root = os.path.join(
        crops_dir(workspace_dir),
        f"activity-{activity_number:02d}",
    )

    visual_row_idx = 0
    for row in rows:
        columns = _merge_row_components(row)
        if len(columns) != 3:
            continue
        row_bbox_px = (
            min(c[0] for c in columns),
            min(c[1] for c in columns),
            max(c[2] for c in columns),
            max(c[3] for c in columns),
        )
        row_bbox_pdf = (
            row_bbox_px[0] * scale_x,
            row_bbox_px[1] * scale_y,
            row_bbox_px[2] * scale_x,
            row_bbox_px[3] * scale_y,
        )
        visual_row_idx += 1
        question_number = _question_number_for_row(
            row_bbox_pdf=row_bbox_pdf,
            question_positions=question_positions,
            fallback=visual_row_idx,
        )

        for opt_idx, column in enumerate(sorted(columns, key=lambda c: c[0])):
            if opt_idx >= 6:
                break
            label = chr(ord("a") + opt_idx)
            # Pad in pixels before converting so crops don't cut off edges.
            pad = 14
            height, width = image_bgr.shape[:2]
            x0 = max(0, column[0] - pad)
            y0 = max(0, column[1] - pad)
            x1 = min(width, column[2] + pad)
            y1 = min(height, column[3] + pad)
            bbox = (x0 * scale_x, y0 * scale_y, x1 * scale_x, y1 * scale_y)
            output_path = os.path.join(
                activity_crops_root,
                f"q{question_number:02d}",
                f"{label}.webp",
            )
            _crop_to_webp(
                fitz_module=fitz_module,
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
                if _is_full_page_bbox(page, bbox):
                    continue
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
        if not crops:
            for page_number in range(page_start, page_end + 1):
                crops.extend(
                    _extract_scanned_page_image_options(
                        fitz_module=fitz,
                        pdf=pdf,
                        page_number=page_number,
                        activity_number=activity_number,
                        workspace_dir=workspace_dir,
                        dpi=dpi,
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
