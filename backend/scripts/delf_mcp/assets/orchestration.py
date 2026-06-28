"""One-shot screenshot → uploaded WebP options.

Composes `crop_screenshot_to_webp` and `upload_delf_asset` so the agent gets
back ready-to-paste `img_url` values for a DelfTestPaper. Partial failures
are reported per-option without aborting the whole call.
"""

from __future__ import annotations

import base64
from typing import Any

from src.shared.delf_practice import local_asset_service as las
from src.shared.delf_practice.github_manager import GitHubDelfManager

from scripts.delf_mcp.assets.image_pipeline import (
    _decode_base64,
    _max_asset_bytes,
    _parse_crop_dict,
    _box_in_bounds,
)
from scripts.delf_mcp.assets.upload_service import upload_delf_asset


def _canonical_filename(test_id: str, question_number: int, label: str) -> str:
    return f"{label.lower()}.webp"


def _upload_one(
    *,
    image_bgr: Any,
    crop: las.CropBox,
    label: str,
    question_number: int,
    level: str,
    variant: str,
    section: str,
    test_id: str,
    webp_quality: int,
    overwrite: bool,
    github: GitHubDelfManager,
) -> dict[str, Any]:
    webp_bytes = las.export_crop_to_webp(
        image_bgr=image_bgr, crop=crop, quality=webp_quality
    )
    filename = _canonical_filename(test_id, question_number, label)
    upload = upload_delf_asset(
        level=level,
        variant=variant,
        section=section,
        test_id=test_id,
        filename=filename,
        content_base64=base64.b64encode(webp_bytes).decode("ascii"),
        kind="image",
        overwrite=overwrite,
        question_number=question_number,
        label=label,
        github=github,
    )
    upload["question_number"] = question_number
    upload["label"] = label
    if upload.get("success"):
        upload["img_url"] = upload["relative_path"]
    return upload


def _resolve_question_boxes(
    image_bgr: Any,
    width: int,
    height: int,
    question: dict[str, Any],
) -> tuple[list[tuple[str, las.CropBox]] | None, dict[str, Any] | None]:
    """Return [(label, CropBox), ...] for one question, or an error dict."""
    auto = question.get("auto_detect")
    options = question.get("options") or []
    if auto:
        region_box, region_err = _parse_crop_dict(auto.get("region", {}))
        if region_err:
            return None, {"error": f"auto_detect.region: {region_err}"}
        if not _box_in_bounds(region_box, width, height):
            return None, {
                "error": (
                    f"auto_detect.region is outside the screenshot "
                    f"({width}x{height})"
                )
            }
        expected = int(auto.get("expected_count", len(options) or 0))
        if expected < 1:
            return None, {"error": "auto_detect.expected_count must be >= 1"}
        min_area = int(auto.get("min_area", 1500))
        padding = int(auto.get("padding", 10))
        try:
            detected = las.detect_option_boxes(
                image_bgr=image_bgr,
                region=region_box,
                expected_count=expected,
                min_area=min_area,
                padding=padding,
            )
        except Exception as exc:
            return None, {"error": f"Auto-detect failed: {exc}"}

        labels = [
            str(o.get("label", chr(ord("a") + idx)))
            for idx, o in enumerate(options or [{}] * len(detected))
        ]
        # Pad / trim labels to match detected count
        while len(labels) < len(detected):
            labels.append(chr(ord("a") + len(labels)))
        return list(zip(labels, detected)), None

    # Explicit per-option crops
    pairs: list[tuple[str, las.CropBox]] = []
    for idx, opt in enumerate(options):
        if not isinstance(opt, dict):
            return None, {"error": f"options[{idx}] must be an object"}
        label = str(opt.get("label", chr(ord("a") + idx)))
        crop = opt.get("crop")
        if not isinstance(crop, dict):
            return None, {"error": f"options[{idx}] missing required `crop` object"}
        box, parse_err = _parse_crop_dict(crop)
        if parse_err:
            return None, {"error": f"options[{idx}]: {parse_err}"}
        if not _box_in_bounds(box, width, height):
            return None, {
                "error": (
                    f"options[{idx}] crop is outside the screenshot "
                    f"({width}x{height})"
                )
            }
        pairs.append((label, box))
    return pairs, None


def process_screenshot_options(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
    screenshot_base64: str,
    questions: list[dict[str, Any]],
    webp_quality: int = 92,
    overwrite: bool = False,
    github: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Crop each option for each question, upload to GitHub, return img_urls.

    Image assets are written to the structured per-paper layout:
    `assets/{test_id}/qNN/{label}.webp`. Partial failures are surfaced
    per-option in `failures`; successful uploads always appear in `results`
    even when later options fail.
    """
    if not isinstance(webp_quality, int) or not (1 <= webp_quality <= 100):
        return {"success": False, "error": "webp_quality must be 1-100"}
    if not questions:
        return {"success": False, "error": "questions must not be empty"}

    try:
        las.ensure_local_asset_deps()
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "message": (
                "Install backend/requirements-delf-local.txt to enable image "
                "cropping."
            ),
        }

    raw, err = _decode_base64(screenshot_base64)
    if err is not None:
        return {"success": False, "errors": [err], "error_count": 1}
    limit = _max_asset_bytes()
    if len(raw) > limit:
        return {
            "success": False,
            "error": (f"Payload too large: {len(raw)} bytes > {limit} bytes"),
        }

    try:
        image_bgr = las.decode_image_bytes(raw)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not decode screenshot: {exc}",
        }
    height, width = image_bgr.shape[:2]

    github = github or GitHubDelfManager()
    results: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    for q in questions:
        qnum = q.get("question_number")
        if not isinstance(qnum, int) or qnum < 1:
            failures.append(
                {
                    "question_number": qnum,
                    "error": "question_number must be a positive integer",
                }
            )
            continue

        pairs, q_err = _resolve_question_boxes(image_bgr, width, height, q)
        if q_err is not None:
            failures.append({"question_number": qnum, **q_err})
            continue

        question_results: list[dict[str, Any]] = []
        for label, box in pairs:
            try:
                outcome = _upload_one(
                    image_bgr=image_bgr,
                    crop=box,
                    label=label,
                    question_number=qnum,
                    level=level,
                    variant=variant,
                    section=section,
                    test_id=test_id,
                    webp_quality=webp_quality,
                    overwrite=overwrite,
                    github=github,
                )
            except Exception as exc:
                failures.append(
                    {
                        "question_number": qnum,
                        "label": label,
                        "error": f"Unexpected failure: {exc}",
                    }
                )
                continue

            if outcome.get("success"):
                question_results.append(
                    {
                        "label": label,
                        "img_url": outcome["img_url"],
                        "github_path": outcome["github_path"],
                        "byte_size": outcome["byte_size"],
                        "overwritten": outcome.get("overwritten", False),
                    }
                )
            else:
                failures.append(
                    {
                        "question_number": qnum,
                        "label": label,
                        "error": outcome.get("error", "Unknown upload error"),
                        "github_path": outcome.get("github_path"),
                    }
                )

        results.append(
            {
                "question_number": qnum,
                "options": question_results,
            }
        )

    return {
        "success": not failures,
        "test_id": test_id,
        "image_size": {"width": width, "height": height},
        "results": results,
        "failures": failures,
        "failure_count": len(failures),
    }


__all__ = ["process_screenshot_options"]
