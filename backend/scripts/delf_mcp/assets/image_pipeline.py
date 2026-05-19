"""Image-cropping pipeline for the DELF MCP server.

Thin orchestration layer over `src.shared.delf_practice.local_asset_service`.
- Decodes base64 → OpenCV BGR image
- Crops one or more regions (explicit `crops` OR `auto_detect`)
- Encodes each crop to WebP
- Returns base64 bytes + dimensions per crop

OpenCV / Pillow availability is checked lazily; tools fall back to a
structured error pointing at `requirements-delf-local.txt` when missing.
"""

from __future__ import annotations

import base64
import binascii
import os
from typing import Any

from src.shared.delf_practice import local_asset_service as las


_DEFAULT_MAX_MB = 20


def _max_asset_bytes() -> int:
    raw = os.getenv("DELF_MCP_MAX_ASSET_MB")
    try:
        value = int(raw) if raw else _DEFAULT_MAX_MB
    except ValueError:
        value = _DEFAULT_MAX_MB
    return max(1, value) * 1024 * 1024


def _decode_base64(data: str) -> tuple[bytes | None, dict[str, str] | None]:
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError) as exc:
        return None, {
            "field": "screenshot_base64",
            "message": f"Invalid base64: {exc}",
            "type": "value_error",
        }
    return raw, None


def _check_payload_size(raw: bytes) -> dict[str, str] | None:
    limit = _max_asset_bytes()
    if len(raw) > limit:
        return {
            "field": "screenshot_base64",
            "message": (
                f"Payload too large: {len(raw)} bytes > "
                f"{limit} bytes (DELF_MCP_MAX_ASSET_MB={limit // (1024 * 1024)})"
            ),
            "type": "value_error",
        }
    return None


def _parse_crop_dict(crop: dict[str, Any]) -> tuple[las.CropBox | None, str | None]:
    if not isinstance(crop, dict):
        return None, "crop must be an object with left/top/right/bottom"
    try:
        box = las.CropBox(
            left=int(crop["left"]),
            top=int(crop["top"]),
            right=int(crop["right"]),
            bottom=int(crop["bottom"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        return None, f"Invalid crop box: {exc}"
    if box.left >= box.right or box.top >= box.bottom:
        return None, (
            f"Crop box is empty/inverted: left={box.left} top={box.top} "
            f"right={box.right} bottom={box.bottom}"
        )
    return box, None


def _box_in_bounds(box: las.CropBox, width: int, height: int) -> bool:
    return (
        0 <= box.left < box.right <= width
        and 0 <= box.top < box.bottom <= height
    )


def _encode_crop(
    image_bgr: Any,
    box: las.CropBox,
    label: str,
    quality: int,
) -> dict[str, Any]:
    webp_bytes = las.export_crop_to_webp(
        image_bgr=image_bgr, crop=box, quality=quality
    )
    return {
        "label": label,
        "content_base64": base64.b64encode(webp_bytes).decode("ascii"),
        "width_px": box.right - box.left,
        "height_px": box.bottom - box.top,
        "byte_size": len(webp_bytes),
    }


def crop_screenshot_to_webp(
    *,
    screenshot_base64: str,
    crops: list[dict[str, Any]] | None = None,
    auto_detect: dict[str, Any] | None = None,
    webp_quality: int = 92,
) -> dict[str, Any]:
    """Crop screenshot → WebP. Pure-local, no DB / GitHub / network.

    Either pass `crops=[{label, left, top, right, bottom}, ...]` or
    `auto_detect={region, expected_count, min_area?, padding?}`. When both
    are present `auto_detect` wins.
    """
    if not isinstance(webp_quality, int) or not (1 <= webp_quality <= 100):
        return {
            "success": False,
            "error": "webp_quality must be an integer between 1 and 100",
        }

    # Deps check first — keep the failure clean and actionable
    try:
        las.ensure_local_asset_deps()
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "message": (
                "Install backend/requirements-delf-local.txt to enable image "
                "cropping (opencv-python-headless + Pillow)."
            ),
        }

    raw, err = _decode_base64(screenshot_base64)
    if err is not None:
        return {"success": False, "errors": [err], "error_count": 1}

    size_err = _check_payload_size(raw)
    if size_err is not None:
        return {"success": False, "errors": [size_err], "error_count": 1}

    try:
        image_bgr = las.decode_image_bytes(raw)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not decode screenshot: {exc}",
        }
    height, width = image_bgr.shape[:2]

    # Auto-detect path
    if auto_detect:
        try:
            region_box, region_err = _parse_crop_dict(
                auto_detect.get("region", {})
            )
            if region_err is not None:
                return {
                    "success": False,
                    "error": f"auto_detect.region invalid: {region_err}",
                }
            if not _box_in_bounds(region_box, width, height):
                return {
                    "success": False,
                    "error": (
                        f"auto_detect.region is outside the screenshot "
                        f"({width}x{height})"
                    ),
                }
            expected = int(auto_detect.get("expected_count", 0))
            if expected < 1:
                return {
                    "success": False,
                    "error": "auto_detect.expected_count must be >= 1",
                }
            min_area = int(auto_detect.get("min_area", 1500))
            padding = int(auto_detect.get("padding", 10))
            detected = las.detect_option_boxes(
                image_bgr=image_bgr,
                region=region_box,
                expected_count=expected,
                min_area=min_area,
                padding=padding,
            )
        except Exception as exc:
            return {
                "success": False,
                "error": f"Auto-detect failed: {exc}",
                "message": (
                    "Adjust auto_detect.region or fall back to explicit crops."
                ),
            }

        # Label auto-detected boxes a/b/c/… in left-to-right order
        crops_out: list[dict[str, Any]] = []
        for idx, box in enumerate(detected):
            label = chr(ord("a") + idx)
            crops_out.append(_encode_crop(image_bgr, box, label, webp_quality))
        return {
            "success": True,
            "mode": "auto_detect",
            "image_size": {"width": width, "height": height},
            "crops": crops_out,
        }

    # Explicit crops path
    if not crops:
        return {
            "success": False,
            "error": "Provide either `crops` or `auto_detect`",
        }

    crops_out = []
    errors: list[dict[str, Any]] = []
    for idx, crop in enumerate(crops):
        if not isinstance(crop, dict):
            errors.append({
                "field": f"crops[{idx}]",
                "message": "crop must be an object",
                "type": "type_error",
            })
            continue
        label = str(crop.get("label", chr(ord("a") + idx)))
        box, parse_err = _parse_crop_dict(crop)
        if parse_err is not None:
            errors.append({
                "field": f"crops[{idx}]",
                "message": parse_err,
                "type": "value_error",
            })
            continue
        if not _box_in_bounds(box, width, height):
            errors.append({
                "field": f"crops[{idx}]",
                "message": (
                    f"Crop box is outside the screenshot ({width}x{height}): "
                    f"left={box.left} top={box.top} right={box.right} "
                    f"bottom={box.bottom}"
                ),
                "type": "value_error",
            })
            continue
        crops_out.append(_encode_crop(image_bgr, box, label, webp_quality))

    if errors:
        return {
            "success": False,
            "error_count": len(errors),
            "errors": errors,
            "partial_crops": crops_out,
        }

    return {
        "success": True,
        "mode": "explicit",
        "image_size": {"width": width, "height": height},
        "crops": crops_out,
    }


__all__ = ["crop_screenshot_to_webp", "_max_asset_bytes"]
