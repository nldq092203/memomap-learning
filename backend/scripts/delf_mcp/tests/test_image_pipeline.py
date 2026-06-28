"""Tests for the image pipeline + orchestration services.

Requires OpenCV/Pillow (backend/requirements-delf-local.txt). When those
modules are not installed, the tests are skipped — the deps gate inside
the service itself is exercised separately.
"""

from __future__ import annotations

import base64
import io
import os
import sys

import pytest

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

try:
    from PIL import Image  # type: ignore
    import cv2  # type: ignore  # noqa: F401

    _DEPS_AVAILABLE = True
except ImportError:
    _DEPS_AVAILABLE = False

pytestmark = pytest.mark.skipif(
    not _DEPS_AVAILABLE,
    reason="Requires opencv-python-headless and Pillow",
)

from scripts.delf_mcp.assets.image_pipeline import (  # noqa: E402
    crop_screenshot_to_webp,
)
from scripts.delf_mcp.assets.orchestration import (  # noqa: E402
    process_screenshot_options,
)


def _make_screenshot(width: int = 200, height: int = 100) -> str:
    """Generate a tiny solid-color PNG as base64 for use as input."""
    img = Image.new("RGB", (width, height), color=(120, 200, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


# ---------------------------------------------------------------------------
# Fake GitHub manager (for orchestration)
# ---------------------------------------------------------------------------


class _FakeGithub:
    def __init__(self):
        self.files: dict[str, bytes] = {}

    def file_exists(self, path):
        return path in self.files

    def create_file(self, file_path, content, commit_message):
        if file_path in self.files:
            raise FileExistsError(file_path)
        self.files[file_path] = (
            content if isinstance(content, bytes) else content.encode()
        )
        return {"path": file_path}

    def create_or_update_file(self, file_path, content, commit_message):
        self.files[file_path] = (
            content if isinstance(content, bytes) else content.encode()
        )
        return {"path": file_path}


# ---------------------------------------------------------------------------
# crop_screenshot_to_webp
# ---------------------------------------------------------------------------


def test_explicit_crops_return_webp_bytes():
    result = crop_screenshot_to_webp(
        screenshot_base64=_make_screenshot(),
        crops=[
            {"label": "a", "left": 0, "top": 0, "right": 100, "bottom": 50},
            {"label": "b", "left": 100, "top": 0, "right": 200, "bottom": 50},
        ],
    )
    assert result["success"] is True
    assert result["mode"] == "explicit"
    assert len(result["crops"]) == 2
    for crop in result["crops"]:
        assert crop["byte_size"] > 0
        assert base64.b64decode(crop["content_base64"])
    assert result["crops"][0]["label"] == "a"
    assert result["crops"][1]["label"] == "b"


def test_crop_out_of_bounds_returns_structured_error():
    result = crop_screenshot_to_webp(
        screenshot_base64=_make_screenshot(width=100, height=100),
        crops=[{"label": "x", "left": 0, "top": 0, "right": 500, "bottom": 500}],
    )
    assert result["success"] is False
    assert result["error_count"] == 1
    assert "outside the screenshot" in result["errors"][0]["message"]


def test_invalid_base64_returns_error():
    result = crop_screenshot_to_webp(screenshot_base64="not!!base64", crops=[])
    assert result["success"] is False


def test_webp_quality_out_of_range_rejected():
    result = crop_screenshot_to_webp(
        screenshot_base64=_make_screenshot(), crops=[], webp_quality=999
    )
    assert result["success"] is False


def test_requires_either_crops_or_auto_detect():
    result = crop_screenshot_to_webp(screenshot_base64=_make_screenshot())
    assert result["success"] is False


# ---------------------------------------------------------------------------
# process_screenshot_options
# ---------------------------------------------------------------------------


def test_process_screenshot_uploads_canonical_filenames():
    gh = _FakeGithub()
    result = process_screenshot_options(
        level="A2",
        variant="tout-public-a2",
        section="CE",
        test_id="tp-04",
        screenshot_base64=_make_screenshot(width=300, height=100),
        questions=[
            {
                "question_number": 1,
                "options": [
                    {
                        "label": "a",
                        "crop": {"left": 0, "top": 0, "right": 100, "bottom": 100},
                    },
                    {
                        "label": "b",
                        "crop": {"left": 100, "top": 0, "right": 200, "bottom": 100},
                    },
                    {
                        "label": "c",
                        "crop": {"left": 200, "top": 0, "right": 300, "bottom": 100},
                    },
                ],
            }
        ],
        github=gh,
    )
    assert result["success"] is True
    assert result["failures"] == []
    options = result["results"][0]["options"]
    assert [o["img_url"] for o in options] == [
        "assets/tp-04/q01/a.webp",
        "assets/tp-04/q01/b.webp",
        "assets/tp-04/q01/c.webp",
    ]
    # All three files landed in the fake GitHub
    assert len(gh.files) == 3


def test_process_screenshot_records_partial_failures():
    gh = _FakeGithub()
    # Pre-populate one collision so the second upload fails
    collision = "delf/a2/tout-public-a2/CE/assets/tp-04/q01/b.webp"
    gh.files[collision] = b"existing"

    result = process_screenshot_options(
        level="A2",
        variant="tout-public-a2",
        section="CE",
        test_id="tp-04",
        screenshot_base64=_make_screenshot(width=300, height=100),
        questions=[
            {
                "question_number": 1,
                "options": [
                    {
                        "label": "a",
                        "crop": {"left": 0, "top": 0, "right": 100, "bottom": 100},
                    },
                    {
                        "label": "b",
                        "crop": {"left": 100, "top": 0, "right": 200, "bottom": 100},
                    },
                ],
            }
        ],
        github=gh,
    )
    assert result["success"] is False
    assert result["failure_count"] == 1
    assert result["failures"][0]["label"] == "b"
    # The successful upload still appears in results
    successful_labels = [o["label"] for o in result["results"][0]["options"]]
    assert successful_labels == ["a"]


def test_process_screenshot_rejects_missing_crop():
    gh = _FakeGithub()
    result = process_screenshot_options(
        level="A2",
        variant="v",
        section="CE",
        test_id="tp-04",
        screenshot_base64=_make_screenshot(),
        questions=[
            {
                "question_number": 1,
                "options": [{"label": "a"}],  # missing crop
            }
        ],
        github=gh,
    )
    assert result["success"] is False
    assert result["failure_count"] == 1
