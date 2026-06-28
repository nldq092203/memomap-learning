"""Persist approved DelfTestPaper drafts from a PDF analysis.

Per plan decisions D2, D6, D7:
- Re-runs `validate_content` on every paper at save time (never trust the
  agent's preview-time validation; the content may have been hand-edited).
- Re-runs `verify_delf_asset_references` to confirm audio (and image)
  assets exist before any DB write.
- Picks `save_delf_draft` for new test_ids and `update_delf_draft` when
  the test_id already has a draft. Active/archived or GitHub-only existing
  papers are skipped before any crop upload. Routing decision is reported
  per paper.
- Refuses to run unless `confirm_save=true`.
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any

from src.shared.delf_practice.asset_paths import nested_image_relative_path

from scripts.delf_mcp.assets.upload_service import upload_delf_asset
from scripts.delf_mcp.assets.verify_service import verify_delf_asset_references
from scripts.delf_mcp.naming_service import build_github_directory
from scripts.delf_mcp.draft_service import save_draft
from scripts.delf_mcp.update_service import update_draft
from scripts.delf_mcp.validation import validate_content

from . import warnings as warning_codes
from .manifest import Manifest, read_manifest


def _skip_record(
    *,
    test_id: str | None,
    reason: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    record = {"test_id": test_id, "reason": reason, "saved": False}
    if details:
        record["details"] = details
    return record


def _build_github_path(level: str, variant: str, section: str, test_id: str) -> str:
    return f"{build_github_directory(level, variant, section)}/{test_id}.json"


def _find_existing_paper(
    *,
    test_id: str,
    level: str,
    variant: str,
    section: str,
    repo: Any | None,
) -> Any | None:
    """Return the existing DB row for this test_id, or None.

    `repo` is the test-paper repository. Tests pass in a fake; production
    callers leave it None and we instantiate the real one.
    """
    if repo is None:
        from src.shared.delf_practice.test_paper_repository import (
            DelfTestPaperRepository,
        )

        repo = DelfTestPaperRepository()
    getter = getattr(repo, "get_by_test_id", None)
    if getter is None:
        return None
    return getter(test_id, level, variant, section)


def _github_json_exists(
    *,
    test_id: str,
    level: str,
    variant: str,
    section: str,
    github_mgr: Any | None,
) -> tuple[bool, str | None]:
    """Check whether the target JSON already exists in GitHub."""
    if github_mgr is None:
        from src.shared.delf_practice.github_manager import GitHubDelfManager

        github_mgr = GitHubDelfManager()
    github_path = _build_github_path(level, variant, section, test_id)
    checker = getattr(github_mgr, "file_exists", None)
    if checker is None:
        return False, github_path
    return bool(checker(github_path)), github_path


def _collect_source_activity_ids(content: dict[str, Any]) -> set[str]:
    """Collect durable PDF activity ids from a paper dict."""
    ids: set[str] = set()

    def _add_from_ref(ref: Any) -> None:
        if not isinstance(ref, dict):
            return
        activity_id = ref.get("activity_id")
        if isinstance(activity_id, str) and ":activity-" in activity_id:
            ids.add(activity_id)

    _add_from_ref(content.get("source_ref"))
    for exercise in content.get("exercises") or []:
        if isinstance(exercise, dict):
            _add_from_ref(exercise.get("source_ref"))
    return ids


def _find_existing_source_duplicate(
    *,
    paper_content: dict[str, Any],
    level: str,
    variant: str,
    section: str,
    github_mgr: Any | None,
) -> dict[str, Any] | None:
    """Return duplicate details if an existing JSON has the same source activity."""
    source_ids = _collect_source_activity_ids(paper_content)
    if not source_ids:
        return None

    if github_mgr is None:
        from src.shared.delf_practice.github_manager import GitHubDelfManager

        github_mgr = GitHubDelfManager()

    directory = build_github_directory(level, variant, section)
    stems = github_mgr.list_json_stems(directory)
    current_test_id = str(paper_content.get("test_id") or "")

    for stem in stems:
        if stem == current_test_id:
            continue
        path = f"{directory}/{stem}.json"
        raw = github_mgr.read_file(path)
        try:
            existing = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
        if not isinstance(existing, dict):
            continue
        overlap = sorted(source_ids & _collect_source_activity_ids(existing))
        if overlap:
            return {
                "source": "GitHub",
                "existing_test_id": stem,
                "github_path": path,
                "source_activity_ids": overlap,
                "message": (
                    "An existing DELF JSON already references the same PDF "
                    "book activity; refusing to save a duplicate."
                ),
            }
    return None


def _collect_image_uploads_for_paper(
    manifest: Manifest,
    paper_content: dict[str, Any],
) -> list[dict[str, Any]]:
    """Match manifest crops to img_urls inside one paper's content.

    Preview assigns img_urls deterministically from
    `nested_image_relative_path(test_id, question_number, label)`, so we
    reverse-engineer the match instead of asking the agent to pass crop
    metadata back through `selected_papers`.
    """
    test_id = paper_content.get("test_id")
    if not test_id:
        return []

    referenced: set[str] = set()

    def _scan_options(options: Any) -> None:
        if not isinstance(options, list):
            return
        for opt in options:
            if isinstance(opt, dict):
                url = opt.get("img_url")
                if isinstance(url, str) and url:
                    referenced.add(url)

    for exercise in paper_content.get("exercises") or []:
        if not isinstance(exercise, dict):
            continue
        _scan_options(exercise.get("options"))
        for question in exercise.get("questions") or []:
            if isinstance(question, dict):
                _scan_options(question.get("options"))

    if not referenced:
        return []

    uploads: list[dict[str, Any]] = []
    for activity in manifest.activities:
        for crop in activity.image_option_crops:
            expected = nested_image_relative_path(
                test_id=str(test_id),
                question_number=crop.question_number,
                label=crop.label,
            )
            if expected in referenced:
                uploads.append(
                    {
                        "question_number": crop.question_number,
                        "label": crop.label,
                        "local_path": crop.local_path,
                    }
                )
    return uploads


def _upload_image_crops(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
    image_uploads: list[dict[str, Any]],
    github_mgr: Any | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Upload each local WebP crop to GitHub. Returns (uploaded, failures).

    Each upload uses `upload_delf_asset(question_number, label)` so the path
    matches the JSON `img_url` already baked in at preview time.
    """
    uploaded: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    for upload in image_uploads:
        local_path = upload.get("local_path")
        question_number = upload.get("question_number")
        label = upload.get("label")
        if not local_path or question_number is None or not label:
            failures.append(
                {**upload, "error": "missing local_path/question_number/label"}
            )
            continue
        if not os.path.exists(local_path):
            failures.append({**upload, "error": f"local file not found: {local_path}"})
            continue
        with open(local_path, "rb") as fh:
            raw = fh.read()
        content_b64 = base64.b64encode(raw).decode("ascii")
        filename = os.path.basename(local_path)
        result = upload_delf_asset(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
            filename=filename,
            content_base64=content_b64,
            kind="image",
            overwrite=True,  # re-runs are common; agent reviews preview before save
            question_number=int(question_number),
            label=str(label),
            github=github_mgr,
        )
        if not result.get("success"):
            failures.append({**upload, "error": result.get("error")})
            continue
        uploaded.append(
            {
                "question_number": question_number,
                "label": label,
                "github_path": result.get("github_path"),
                "relative_path": result.get("relative_path"),
            }
        )
    return uploaded, failures


def _save_one_paper(
    *,
    paper_content: dict[str, Any],
    level: str,
    variant: str,
    image_uploads: list[dict[str, Any]],
    repo: Any | None,
    github_mgr: Any | None,
    github_repo: Any | None,
) -> dict[str, Any]:
    """Process one paper end-to-end. Returns the per-paper outcome dict."""
    test_id = paper_content.get("test_id") if isinstance(paper_content, dict) else None
    section = paper_content.get("section") if isinstance(paper_content, dict) else None

    if not test_id or not section:
        return _skip_record(
            test_id=test_id,
            reason=warning_codes.VALIDATION_FAILED,
            details={"error": "paper content is missing test_id or section"},
        )

    # 1. Re-validate
    validation = validate_content(paper_content)
    if not validation["valid"]:
        return _skip_record(
            test_id=test_id,
            reason=warning_codes.VALIDATION_FAILED,
            details={
                "errors": validation["errors"],
                "error_count": validation["error_count"],
            },
        )

    # 2. Existing-paper preflight before any crop upload or JSON write.
    existing = _find_existing_paper(
        test_id=test_id,
        level=level,
        variant=variant,
        section=section,
        repo=repo,
    )
    if existing is not None:
        status = getattr(existing, "status", None)
        if status != "draft":
            return _skip_record(
                test_id=test_id,
                reason="exercise_exists",
                details={
                    "source": "DB",
                    "status": status,
                    "draft_id": getattr(existing, "id", None),
                    "message": (
                        "This test_id already exists and is not a draft; "
                        "PDF ingestion will not update active or archived papers."
                    ),
                },
            )
    else:
        try:
            exists_in_github, github_path = _github_json_exists(
                test_id=test_id,
                level=level,
                variant=variant,
                section=section,
                github_mgr=github_mgr,
            )
        except Exception as exc:
            return _skip_record(
                test_id=test_id,
                reason="existing_check_failed",
                details={"error": str(exc)},
            )
        if exists_in_github:
            return _skip_record(
                test_id=test_id,
                reason="exercise_exists",
                details={
                    "source": "GitHub",
                    "github_path": github_path,
                    "message": (
                        "This test_id already has a GitHub JSON file but no "
                        "draft DB row; refusing to save or upload assets."
                    ),
                },
            )

    try:
        duplicate_source = _find_existing_source_duplicate(
            paper_content=paper_content,
            level=level,
            variant=variant,
            section=section,
            github_mgr=github_mgr,
        )
    except Exception as exc:
        return _skip_record(
            test_id=test_id,
            reason="existing_source_check_failed",
            details={"error": str(exc)},
        )
    if duplicate_source is not None:
        return _skip_record(
            test_id=test_id,
            reason="source_activity_exists",
            details=duplicate_source,
        )

    # 3. v2 — upload image-option crops before asset verification runs.
    uploaded_crops: list[dict[str, Any]] = []
    if image_uploads:
        uploaded_crops, upload_failures = _upload_image_crops(
            level=level,
            variant=variant,
            section=section,
            test_id=test_id,
            image_uploads=image_uploads,
            github_mgr=github_mgr,
        )
        if upload_failures:
            return _skip_record(
                test_id=test_id,
                reason=warning_codes.MISSING_ASSET,
                details={"upload_failures": upload_failures},
            )

    # 4. Asset verification (audio + images now present after crop upload)
    verification = verify_delf_asset_references(
        level=level,
        variant=variant,
        section=section,
        content=paper_content,
        github=github_repo,
    )
    if not verification.get("success"):
        return _skip_record(
            test_id=test_id,
            reason=warning_codes.MISSING_ASSET,
            details={"error": verification.get("error")},
        )
    if not verification.get("all_present", False):
        return _skip_record(
            test_id=test_id,
            reason=warning_codes.MISSING_ASSET,
            details={"missing": verification.get("missing", [])},
        )

    # 5. Save-vs-update routing
    if existing is not None:
        update_result = update_draft(
            draft_id=existing.id,
            content=paper_content,
            repo=repo,
            github_mgr=github_mgr,
        )
        if not update_result.get("success"):
            return _skip_record(
                test_id=test_id,
                reason="update_failed",
                details=update_result,
            )
        return {
            "test_id": test_id,
            "saved": True,
            "route": "update",
            "draft_id": update_result.get("draft_id"),
            "github_path": update_result.get("github_path"),
            "preview_url": update_result.get("preview_url"),
            "uploaded_crops": uploaded_crops,
        }

    save_result = save_draft(
        level=level,
        variant=variant,
        section=section,
        content=paper_content,
        repo=repo,
        github_mgr=github_mgr,
    )
    if not save_result.get("success"):
        return _skip_record(
            test_id=test_id,
            reason="save_failed",
            details=save_result,
        )
    return {
        "test_id": test_id,
        "saved": True,
        "route": "save",
        "draft_id": save_result.get("draft_id"),
        "github_path": save_result.get("github_path"),
        "preview_url": save_result.get("preview_url"),
        "uploaded_crops": uploaded_crops,
    }


def save_delf_book_drafts(
    *,
    analysis_id: str,
    selected_papers: list[dict[str, Any]],
    confirm_save: bool,
    workspace_root: str | None = None,
    repo: Any | None = None,
    github_mgr: Any | None = None,
    github_repo: Any | None = None,
) -> dict[str, Any]:
    """Save selected DelfTestPaper drafts from a PDF analysis.

    Args:
        analysis_id: ID returned by `analyze_delf_book_pdf`. Used to load
            level/variant from the manifest.
        selected_papers: List of `{content: DelfTestPaper-shape dict}`.
            The content may have been edited by the agent post-preview.
        confirm_save: Must be True. Mirrors `publish_delf_draft`'s ceremony.
        workspace_root: Override `.local/delf-extracts` (tests).
        repo / github_mgr / github_repo: Optional injectable dependencies
            for testing.

    Returns:
        {success, saved: [...], skipped: [...]} where each list contains
        per-paper outcome dicts.
    """
    if not confirm_save:
        return {
            "success": False,
            "error": "confirm_save must be True to save drafts.",
            "message": "Re-run with confirm_save=True after reviewing the preview.",
        }

    try:
        manifest = read_manifest(analysis_id, workspace_root=workspace_root)
    except FileNotFoundError as exc:
        return {"success": False, "error": str(exc)}

    if not isinstance(selected_papers, list) or not selected_papers:
        return {
            "success": False,
            "error": "selected_papers must be a non-empty list",
        }

    saved: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []

    for entry in selected_papers:
        content = entry.get("content") if isinstance(entry, dict) else None
        if not isinstance(content, dict):
            skipped.append(
                _skip_record(
                    test_id=None,
                    reason=warning_codes.VALIDATION_FAILED,
                    details={"error": "selected_papers entry missing dict 'content'"},
                )
            )
            continue

        image_uploads_raw = (
            entry.get("image_uploads") if isinstance(entry, dict) else None
        )
        if isinstance(image_uploads_raw, list):
            # Explicit override from the agent (e.g. after hand-editing).
            image_uploads: list[dict[str, Any]] = [
                u for u in image_uploads_raw if isinstance(u, dict)
            ]
        else:
            # Default: auto-discover from manifest by matching img_urls.
            image_uploads = _collect_image_uploads_for_paper(manifest, content)

        outcome = _save_one_paper(
            paper_content=content,
            level=manifest.level,
            variant=manifest.variant,
            image_uploads=image_uploads,
            repo=repo,
            github_mgr=github_mgr,
            github_repo=github_repo,
        )
        if outcome.get("saved"):
            saved.append(outcome)
        else:
            skipped.append(outcome)

    return {
        "success": True,
        "analysis_id": analysis_id,
        "saved": saved,
        "skipped": skipped,
        "saved_count": len(saved),
        "skipped_count": len(skipped),
    }


__all__ = ["save_delf_book_drafts"]
