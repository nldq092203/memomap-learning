"""Local-only DELF screenshot cropping and asset upload helpers."""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Any

from src.api.errors import BadRequestError


try:  # pragma: no cover - import availability depends on local setup
    import cv2
    import numpy as np
    from PIL import Image
except ImportError:  # pragma: no cover - handled at runtime by ensure_local_asset_deps
    cv2 = None
    np = None
    Image = None


@dataclass(slots=True)
class CropBox:
    left: int
    top: int
    right: int
    bottom: int


def ensure_local_asset_deps() -> None:
    """Fail with a clear message when local image dependencies are missing."""
    if cv2 is None or np is None or Image is None:
        raise BadRequestError(
            "Local DELF asset tool dependencies are missing. "
            "Install backend/requirements-delf-local.txt in your local environment."
        )


def parse_crop_box(payload: dict[str, Any]) -> CropBox:
    """Parse one crop box from request JSON."""
    try:
        return CropBox(
            left=int(payload["left"]),
            top=int(payload["top"]),
            right=int(payload["right"]),
            bottom=int(payload["bottom"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise BadRequestError(f"Invalid crop box payload: {exc}") from exc


def decode_image_bytes(content: bytes) -> Any:
    """Decode an uploaded image into an OpenCV BGR image."""
    ensure_local_asset_deps()

    if not content:
        raise BadRequestError("exercise_image is required")

    image_array = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise BadRequestError("Could not decode the uploaded screenshot")
    return image


def clamp_crop_box(box: CropBox, width: int, height: int, padding: int = 0) -> CropBox:
    """Clamp a crop box to image boundaries."""
    return CropBox(
        left=max(0, box.left - padding),
        top=max(0, box.top - padding),
        right=min(width, box.right + padding),
        bottom=min(height, box.bottom + padding),
    )


def detect_option_boxes(
    *,
    image_bgr: Any,
    region: CropBox,
    expected_count: int,
    min_area: int = 1500,
    padding: int = 10,
) -> list[CropBox]:
    """Detect answer-image boxes inside a region from left to right."""
    ensure_local_asset_deps()

    roi = image_bgr[region.top:region.bottom, region.left:region.right]
    if roi.size == 0:
        raise BadRequestError("auto_detect region is outside the screenshot")

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 245, 255, cv2.THRESH_BINARY_INV)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes: list[CropBox] = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w * h < min_area:
            continue
        boxes.append(
            CropBox(
                left=region.left + x,
                top=region.top + y,
                right=region.left + x + w,
                bottom=region.top + y + h,
            )
        )

    boxes.sort(key=lambda box: (box.left, box.top))
    if len(boxes) != expected_count:
        raise BadRequestError(
            f"Expected {expected_count} detected option boxes, found {len(boxes)}. "
            "Adjust auto_detect.region or provide explicit crop values."
        )

    image_height, image_width = image_bgr.shape[:2]
    return [
        clamp_crop_box(box, image_width, image_height, padding=padding)
        for box in boxes
    ]


def export_crop_to_webp(
    *,
    image_bgr: Any,
    crop: CropBox,
    quality: int = 92,
) -> bytes:
    """Crop one image region and encode it as WEBP bytes."""
    ensure_local_asset_deps()

    crop_image = image_bgr[crop.top:crop.bottom, crop.left:crop.right]
    if crop_image.size == 0:
        raise BadRequestError("Crop box produced an empty image")

    rgb_image = cv2.cvtColor(crop_image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_image)
    output = io.BytesIO()
    pil_image.save(output, format="WEBP", quality=quality, method=6)
    return output.getvalue()


def build_asset_filename(*, test_id: str, question_number: int, label: str) -> str:
    """Build one DELF asset filename."""
    normalized_test = "".join(ch for ch in test_id.lower() if ch.isalnum() or ch == "-")
    return f"{normalized_test}-{question_number}-{label.lower()}.webp"


__all__ = [
    "CropBox",
    "build_asset_filename",
    "clamp_crop_box",
    "decode_image_bytes",
    "detect_option_boxes",
    "ensure_local_asset_deps",
    "export_crop_to_webp",
    "parse_crop_box",
]
