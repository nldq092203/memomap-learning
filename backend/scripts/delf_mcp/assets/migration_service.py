"""Migrate DELF image assets to structured per-paper WebP paths."""

from __future__ import annotations

import io
from typing import Any

from src.shared.delf_practice.asset_paths import (
    nested_image_relative_path,
    image_reference_github_path,
    scope_prefix,
)
from src.shared.delf_practice.content_service import invalidate_delf_content_cache
from src.extensions import logger
from src.shared.delf_practice.github_manager import GitHubDelfManager
from src.shared.delf_practice.github_repository import GitHubDelfRepository
from src.shared.delf_practice.schemas import DelfTestPaper
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository

from scripts.delf_mcp.assets.verify_service import verify_delf_asset_references
from scripts.delf_mcp.validation import validate_content

_IMAGE_EXTENSIONS = (".webp", ".png", ".jpg", ".jpeg")


def _is_image_ref(value: str) -> bool:
    return value.strip().lower().endswith(_IMAGE_EXTENSIONS)


def _is_standard_image_ref(
    *, value: str, test_id: str, question_number: int, label: str
) -> bool:
    return value.strip().lstrip("/") == nested_image_relative_path(
        test_id=test_id,
        question_number=question_number,
        label=label,
        extension=".webp",
    )


def _filename_from_ref(value: str) -> str:
    stripped = value.strip().lstrip("/")
    if stripped.startswith("assets/"):
        return stripped[len("assets/") :]
    return stripped


def _replace_image_extension(value: str, extension: str) -> str:
    stripped = value.strip().lstrip("/")
    prefix = "assets/" if stripped.startswith("assets/") else ""
    rest = stripped[len("assets/") :] if prefix else stripped
    lowered = rest.lower()
    for ext in _IMAGE_EXTENSIONS:
        if lowered.endswith(ext):
            return f"{prefix}{rest[: -len(ext)]}{extension}"
    return f"{prefix}{rest}{extension}"


def _source_ref_candidates(value: str) -> list[str]:
    candidates = [value.strip().lstrip("/")]
    for ext in _IMAGE_EXTENSIONS:
        candidate = _replace_image_extension(value, ext)
        if candidate not in candidates:
            candidates.append(candidate)
    return candidates


def _resolve_existing_source(
    *,
    github: GitHubDelfManager,
    level: str,
    variant: str,
    section: str,
    value: str,
) -> tuple[str | None, str | None, bool, list[str]]:
    """Resolve an image ref, falling back across image extensions.

    Returns `(github_path, ref_value, used_extension_fallback, checked_paths)`.
    """
    checked_paths: list[str] = []
    original_path: str | None = None
    for candidate in _source_ref_candidates(value):
        path = image_reference_github_path(
            level=level,
            variant=variant,
            section=section,
            img_url=candidate,
        )
        if original_path is None:
            original_path = path
        checked_paths.append(path)
        if github.file_exists(path):
            return path, candidate, path != original_path, checked_paths
    return None, None, False, checked_paths


def _convert_to_webp(raw: bytes, *, quality: int) -> bytes:
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - depends on local env
        raise RuntimeError(
            "Pillow is required to convert PNG/JPG assets to WebP. "
            "Install backend/requirements-delf-local.txt."
        ) from exc

    with Image.open(io.BytesIO(raw)) as image:
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        output = io.BytesIO()
        image.save(output, format="WEBP", quality=quality, method=6)
        return output.getvalue()


def _asset_bytes_for_standard_target(
    *, source_bytes: bytes, source_ref: str, quality: int
) -> tuple[bytes, str]:
    if source_ref.lower().endswith(".webp"):
        return source_bytes, "copied"
    return _convert_to_webp(source_bytes, quality=quality), "converted_to_webp"


def _iter_image_refs(content: dict[str, Any]) -> list[dict[str, Any]]:
    """Collect mutable image refs from a DelfTestPaper dict."""
    refs: list[dict[str, Any]] = []
    exercises = content.get("exercises") or []
    for ex_idx, exercise in enumerate(exercises):
        if not isinstance(exercise, dict):
            continue

        # Flat image-option exercise.
        for opt_idx, option in enumerate(exercise.get("options") or []):
            if not isinstance(option, dict) or not option.get("img_url"):
                continue
            refs.append(
                {
                    "field": f"exercises[{ex_idx}].options[{opt_idx}].img_url",
                    "container": option,
                    "question_number": ex_idx + 1,
                    "label": str(option.get("label") or chr(ord("a") + opt_idx)),
                    "value": str(option["img_url"]),
                }
            )

        # Nested image-option questions.
        for q_idx, question in enumerate(exercise.get("questions") or []):
            if not isinstance(question, dict):
                continue
            qnum = question.get("number")
            question_number = qnum if isinstance(qnum, int) and qnum > 0 else q_idx + 1
            for opt_idx, option in enumerate(question.get("options") or []):
                if not isinstance(option, dict) or not option.get("img_url"):
                    continue
                refs.append(
                    {
                        "field": (
                            f"exercises[{ex_idx}].questions[{q_idx}]"
                            f".options[{opt_idx}].img_url"
                        ),
                        "container": option,
                        "question_number": question_number,
                        "label": str(option.get("label") or chr(ord("a") + opt_idx)),
                        "value": str(option["img_url"]),
                    }
                )
    return refs


def migrate_legacy_image_assets(
    *,
    level: str,
    variant: str,
    section: str,
    test_id: str,
    dry_run: bool = True,
    confirm_write: bool = False,
    overwrite: bool = False,
    convert_to_webp: bool = True,
    webp_quality: int = 92,
    repo: DelfTestPaperRepository | None = None,
    github_repo: GitHubDelfRepository | None = None,
    github: GitHubDelfManager | None = None,
) -> dict[str, Any]:
    """Move image refs to `assets/{test_id}/qNN/{label}.webp`.

    Legacy source files are never deleted. Writes require both `dry_run=false`
    and `confirm_write=true`. PNG/JPG/JPEG sources are converted to WebP by
    default.
    """
    if not isinstance(webp_quality, int) or not (1 <= webp_quality <= 100):
        return {"success": False, "error": "webp_quality must be 1-100"}
    if not convert_to_webp:
        return {
            "success": False,
            "error": "convert_to_webp=false is not supported for standard migration.",
            "message": "The standard asset format is structured WebP.",
        }
    repo = repo or DelfTestPaperRepository()
    row = repo.get_by_test_id(test_id, level, variant, section)
    if row is None:
        return {
            "success": False,
            "error": (f"No DELF paper found for {level}/{variant}/{section}/{test_id}"),
        }

    try:
        github_repo = github_repo or GitHubDelfRepository()
        paper_model: DelfTestPaper = github_repo.fetch_test_paper(row.github_path)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not load paper JSON from GitHub: {exc}",
        }

    content = paper_model.model_dump(mode="json", by_alias=True)
    validation = validate_content(content)
    if not validation["valid"]:
        return {
            "success": False,
            "error": "Persisted content is invalid; migration aborted.",
            "errors": validation.get("errors", []),
            "error_count": validation.get("error_count", 0),
        }

    github = github or GitHubDelfManager()
    planned: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    if not dry_run and not confirm_write:
        return {
            "success": False,
            "error": "Writing requires confirm_write=true.",
        }

    for ref in _iter_image_refs(content):
        value = ref["value"]
        if not _is_image_ref(value):
            skipped.append(
                {
                    "field": ref["field"],
                    "value": value,
                    "reason": "not_supported_image_extension",
                }
            )
            continue
        if _is_standard_image_ref(
            value=value,
            test_id=test_id,
            question_number=ref["question_number"],
            label=ref["label"],
        ):
            skipped.append(
                {
                    "field": ref["field"],
                    "value": value,
                    "reason": "already_standard",
                }
            )
            continue

        filename = _filename_from_ref(value)
        target_relative = nested_image_relative_path(
            test_id=test_id,
            question_number=ref["question_number"],
            label=ref["label"],
            extension=".webp",
        )
        target_github_path = (
            f"{scope_prefix(level, variant, section)}/{target_relative}"
        )
        initial_source_path = image_reference_github_path(
            level=level, variant=variant, section=section, img_url=value
        )
        action = (
            "copy_webp" if filename.lower().endswith(".webp") else "convert_to_webp"
        )
        plan = {
            "field": ref["field"],
            "from": value,
            "to": target_relative,
            "action": action,
            "source_github_path": initial_source_path,
            "target_github_path": target_github_path,
        }

        try:
            (
                resolved_source_path,
                resolved_source_ref,
                used_extension_fallback,
                checked_source_paths,
            ) = _resolve_existing_source(
                github=github,
                level=level,
                variant=variant,
                section=section,
                value=value,
            )
            plan["checked_source_paths"] = checked_source_paths
            if resolved_source_path is not None and resolved_source_ref is not None:
                plan["source_github_path"] = resolved_source_path
                plan["resolved_source_ref"] = resolved_source_ref
                if used_extension_fallback:
                    plan["source_resolution"] = "extension_fallback"
                plan["action"] = (
                    "copy_webp"
                    if resolved_source_ref.lower().endswith(".webp")
                    else "convert_to_webp"
                )
            else:
                plan["source_resolution"] = "missing"
        except Exception as exc:
            plan["source_resolution"] = "check_failed"
            plan["source_check_error"] = str(exc)

        planned.append(plan)

        if dry_run:
            continue

        try:
            source_path = plan.get("source_github_path")
            source_ref = plan.get("resolved_source_ref")
            if plan.get("source_resolution") in ("missing", "check_failed") or not (
                isinstance(source_path, str) and isinstance(source_ref, str)
            ):
                failures.append(
                    {
                        **plan,
                        "error": "Source asset is missing for all checked extensions",
                    }
                )
                continue

            target_exists = github.file_exists(target_github_path)
            if target_exists and not overwrite:
                failures.append(
                    {
                        **plan,
                        "error": (
                            "Target structured asset already exists. "
                            "Pass overwrite=true to replace it."
                        ),
                    }
                )
                continue

            asset_bytes = github.read_file(source_path)
            asset_bytes, performed_action = _asset_bytes_for_standard_target(
                source_bytes=asset_bytes,
                source_ref=source_ref,
                quality=webp_quality,
            )
            if target_exists:
                github.create_or_update_file(
                    file_path=target_github_path,
                    content=asset_bytes,
                    commit_message=(
                        f"chore(delf): replace structured asset for {test_id}"
                    ),
                )
            else:
                github.create_file(
                    file_path=target_github_path,
                    content=asset_bytes,
                    commit_message=(f"chore(delf): migrate asset for {test_id}"),
                )
            plan["action"] = performed_action
            ref["container"]["img_url"] = target_relative
        except Exception as exc:
            failures.append({**plan, "error": str(exc)})

    if dry_run:
        return {
            "success": True,
            "dry_run": True,
            "test_id": test_id,
            "github_path": row.github_path,
            "planned_count": len(planned),
            "planned": planned,
            "skipped_count": len(skipped),
            "skipped": skipped,
            "message": (
                "Dry run only. Re-run with dry_run=false and "
                "confirm_write=true to copy assets and update JSON."
            ),
        }

    if failures:
        return {
            "success": False,
            "test_id": test_id,
            "github_path": row.github_path,
            "migrated_count": len(planned) - len(failures),
            "failure_count": len(failures),
            "failures": failures,
            "message": (
                "Migration copied some assets but did not update JSON because "
                "one or more assets failed."
            ),
        }

    if not planned:
        return {
            "success": True,
            "dry_run": False,
            "test_id": test_id,
            "status": row.status,
            "github_path": row.github_path,
            "migrated_count": 0,
            "updated_refs": [],
            "skipped_count": len(skipped),
            "skipped": skipped,
            "message": "No legacy flat image refs found; nothing was changed.",
        }

    # Re-validate the updated JSON before committing it.
    updated_validation = validate_content(content)
    if not updated_validation["valid"]:
        return {
            "success": False,
            "error": "Updated content failed validation; JSON was not updated.",
            "errors": updated_validation.get("errors", []),
            "error_count": updated_validation.get("error_count", 0),
        }

    asset_check = verify_delf_asset_references(
        level=level, variant=variant, section=section, content=content, github=github
    )
    if not asset_check.get("success") or not asset_check.get("all_present"):
        return {
            "success": False,
            "error": "Updated content failed asset verification; JSON was not updated.",
            "asset_check": asset_check,
        }

    try:
        updated_model = DelfTestPaper.model_validate(content)
        github.create_or_update_file(
            file_path=row.github_path,
            content=updated_model.model_dump_json(indent=2, by_alias=True).encode(
                "utf-8"
            ),
            commit_message=f"chore(delf): migrate asset refs for {test_id}",
        )
        try:
            invalidate_delf_content_cache(
                level=row.level,
                variant=row.variant,
                section=row.section,
                test_id=row.test_id,
            )
        except Exception as exc:
            logger.warning(
                "[DELF-MCP] Cache invalidation failed for {}: {}", row.test_id, exc
            )
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not update paper JSON: {exc}",
        }

    return {
        "success": True,
        "dry_run": False,
        "test_id": test_id,
        "status": row.status,
        "github_path": row.github_path,
        "migrated_count": len(planned),
        "updated_refs": planned,
        "skipped_count": len(skipped),
        "skipped": skipped,
        "message": (
            "Legacy image refs migrated to structured paths. Legacy source "
            "files were preserved."
        ),
    }


__all__ = ["migrate_legacy_image_assets"]
