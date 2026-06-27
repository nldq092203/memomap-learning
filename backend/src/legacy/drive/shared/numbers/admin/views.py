from __future__ import annotations

import json
from datetime import datetime, timezone
from flask import request
import requests
from typing import Any, Literal

from src.shared.numbers.admin.audio_storage import AdminAudioStorage
from src.shared.numbers.admin.dataset_writer import (
    AdminDatasetWriter,
    MANIFEST_FILENAME,
    ROOT_FOLDER as NUMBERS_ROOT,
)
from src.shared.numbers.admin.weekly_dataset_generator import (
    WeeklyNumbersDatasetGenerator,
    current_week_tag,
)
from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.repository.google_drive_repo import (
    GoogleDriveNumbersExerciseRepository,
)
from src.shared.drive_services import get_drive_services_for_user
from src.shared.github_manager import GitHubContentManager
from src.infra.tts.tts_service import TTSService
from src.config import Config
from src.infra.drive.repository import FOLDER_MIME
from src.infra.drive.client import GoogleDriveError
from src.utils.response_builder import ResponseBuilder
from src.extensions import logger


# ============================================================
# Helpers
# ============================================================


def _parse_counts(raw: dict) -> dict[NumberType, int]:
    """
    Parse and validate per-type counts.
    """
    if not isinstance(raw, dict):
        raise ValueError("counts must be an object")

    counts: dict[NumberType, int] = {}

    for key, value in raw.items():
        try:
            number_type = NumberType(key)
        except ValueError:
            raise ValueError(f"Invalid number type: {key}")

        try:
            count = int(value)
        except (TypeError, ValueError):
            raise ValueError(f"Invalid count for {key}")

        if count <= 0 or count > 1000:
            raise ValueError(f"Count for {key} must be between 1 and 1000")

        counts[number_type] = count

    if not counts:
        raise ValueError("At least one number type is required")

    return counts


def _is_numbers_github_backed() -> bool:
    base_url = (Config.NUMBERS_AUDIO_BASE_URL or "").strip()
    return base_url.startswith("https://raw.githubusercontent.com/")


def _numbers_github_manifest_path(version: str) -> str:
    return f"number-dictation/{version}/manifest.json"


def _load_numbers_github_manifest(version: str) -> dict | None:
    base_url = (Config.NUMBERS_AUDIO_BASE_URL or "").rstrip("/")
    if not base_url:
        return None

    url = f"{base_url}/number-dictation/{version}/manifest.json"
    resp = requests.get(url, timeout=10)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def _load_numbers_drive_manifest(
    user_id: str, version: str
) -> tuple[Any, str, dict[str, Any]]:
    drive = get_drive_services_for_user(user_id).repo
    version_folder_id = _find_numbers_version_folder(drive, version)
    if not version_folder_id:
        raise FileNotFoundError(f"Dataset version folder '{version}' not found")

    manifest = drive.get_json(version_folder_id, MANIFEST_FILENAME)
    if manifest is None:
        raise FileNotFoundError(f"manifest.json not found for version '{version}'")

    return drive, version_folder_id, manifest


def _load_numbers_manifest(
    user_id: str, version: str
) -> tuple[Literal["github", "drive"], Any, Any, dict[str, Any]]:
    using_github = _is_numbers_github_backed()
    if using_github:
        manifest = _load_numbers_github_manifest(version)
        if manifest is None:
            raise FileNotFoundError(
                f"GitHub manifest for version '{version}' not found"
            )
        return "github", None, None, manifest

    drive, version_folder_id, manifest = _load_numbers_drive_manifest(user_id, version)
    return "drive", drive, version_folder_id, manifest


def _save_numbers_manifest(
    storage: str,
    *,
    drive: Any,
    version_folder_id: str | None,
    version: str,
    manifest: dict,
) -> None:
    if storage == "github":
        GitHubContentManager(log_prefix="NUMBERS-GITHUB-MANAGER").create_or_update_file(
            file_path=_numbers_github_manifest_path(version),
            content=json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            commit_message=f"chore: update numbers dataset manifest {version}",
        )
        return

    drive.upsert_json(
        parent_id=version_folder_id,
        name=MANIFEST_FILENAME,
        obj=manifest,
        app_properties={
            "type": "numbers_dictation_manifest",
            "version": manifest.get("version") or version,
        },
    )


def _error_not_found(message: str):
    return (
        ResponseBuilder()
        .error(
            error="Not found",
            message=message,
            status_code=404,
        )
        .build()
    )


def _error_invalid_manifest(message: str, status_code: int = 500):
    return (
        ResponseBuilder()
        .error(
            error="Invalid manifest",
            message=message,
            status_code=status_code,
        )
        .build()
    )


# ============================================================
# Admin endpoints
# ============================================================


def admin_generate_numbers_dataset(user_id: str):
    """
    Generate a new Numbers Dictation dataset.
    Body:
    {
      "version": "2025-W37",
      "counts": {
        "PHONE": 10,
        "YEAR": 10,
        "PRICE": 10,
        "TIME": 10,
        "ADDRESS": 10,
        "STATISTICS": 10,
        "MEDICAL": 10,
        "BANKING": 10,
        "WEATHER": 10,
        "TRANSPORT": 10,
        "SHOPPING": 10,
      }
    }
    """

    payload = request.get_json(silent=True) or {}

    # ------------------------------
    # Version
    # ------------------------------
    version = payload.get("version")
    if version is not None and not isinstance(version, str):
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="version must be a string",
                status_code=400,
            )
            .build()
        )

    version = version or current_week_tag()

    # ------------------------------
    # Counts
    # ------------------------------
    try:
        counts = _parse_counts(payload.get("counts", {}))
    except ValueError as e:
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message=str(e),
                status_code=400,
            )
            .build()
        )

    # ------------------------------
    # Generator wiring (admin-only)
    # ------------------------------
    drive = get_drive_services_for_user(user_id).repo

    audio_storage = AdminAudioStorage(drive)
    dataset_writer = AdminDatasetWriter(drive)
    generator = WeeklyNumbersDatasetGenerator(
        audio_storage=audio_storage,
        dataset_writer=dataset_writer,
        tts=TTSService(),
    )

    try:
        stats = generator.generate(
            version_tag=version,
            per_type_counts=counts,
        )
    except Exception as e:
        return (
            ResponseBuilder()
            .error(
                error="Dataset generation failed",
                message=str(e),
                status_code=500,
            )
            .build()
        )

    return (
        ResponseBuilder()
        .success(
            data={
                "version": version,
                "generated": stats,
            },
            status_code=201,
        )
        .build()
    )


def admin_list_numbers_datasets(user_id: str):
    """
    List all available Numbers Dictation datasets.
    """
    if _is_numbers_github_backed():
        version = (Config.NUMBERS_DATA_VERSION or "").strip()
        if not version:
            return (
                ResponseBuilder()
                .error(
                    error="Bad configuration",
                    message="NUMBERS_DATA_VERSION is not configured",
                    status_code=500,
                )
                .build()
            )

        try:
            exists = _load_numbers_github_manifest(version) is not None
        except Exception as e:
            return (
                ResponseBuilder()
                .error(
                    error="Failed to list datasets",
                    message=str(e),
                    status_code=500,
                )
                .build()
            )

        return (
            ResponseBuilder()
            .success(
                data={
                    "versions": [version] if exists else [],
                    "storage": "github",
                    "configured_version": version,
                    "base_url": Config.NUMBERS_AUDIO_BASE_URL,
                }
            )
            .build()
        )

    repo = GoogleDriveNumbersExerciseRepository(
        get_drive_services_for_user(user_id).repo
    )

    try:
        versions = repo.list_versions()
    except Exception as e:
        return (
            ResponseBuilder()
            .error(
                error="Failed to list datasets",
                message=str(e),
                status_code=500,
            )
            .build()
        )

    return ResponseBuilder().success(data={"versions": versions}).build()


__all__ = [
    "admin_generate_numbers_dataset",
    "admin_list_numbers_datasets",
    "admin_cleanup_numbers_manifest",
    "admin_mark_guest_preview_numbers_manifest",
]


def admin_mark_guest_preview_numbers_manifest(user_id: str):
    """
    Mark a guest-preview subset in a Numbers Dictation manifest.

    Body:
    {
      "version": "2025-W50",
      "count_per_type": 2
    }
    """

    payload = request.get_json(silent=True) or {}
    version = payload.get("version")
    count_per_type = payload.get("count_per_type", 2)

    if not version or not isinstance(version, str):
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="version must be a non-empty string",
                status_code=400,
            )
            .build()
        )

    try:
        count_per_type = int(count_per_type)
    except (TypeError, ValueError):
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="count_per_type must be an integer",
                status_code=400,
            )
            .build()
        )

    if count_per_type < 0:
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="count_per_type must be zero or greater",
                status_code=400,
            )
            .build()
        )

    try:
        storage, drive, version_folder_id, manifest = _load_numbers_manifest(
            user_id, version
        )
    except FileNotFoundError as e:
        return _error_not_found(str(e))
    except Exception as e:
        return (
            ResponseBuilder()
            .error(
                error="Failed to load manifest",
                message=str(e),
                status_code=500,
            )
            .build()
        )

    exercises = manifest.get("exercises", [])
    if not isinstance(exercises, list):
        return _error_invalid_manifest("Manifest exercises must be a list")

    updated: list[dict] = []
    marked_by_type: dict[str, int] = {}

    for number_type in NumberType:
        matched = [
            dict(ex)
            for ex in exercises
            if isinstance(ex, dict) and ex.get("number_type") == number_type.value
        ]
        matched.sort(
            key=lambda ex: (str(ex.get("created_at") or ""), str(ex.get("id") or ""))
        )
        preview_ids = {str(ex.get("id")) for ex in matched[:count_per_type]}
        marked_by_type[number_type.value] = len(preview_ids)

        for raw in exercises:
            if not isinstance(raw, dict) or raw.get("number_type") != number_type.value:
                continue
            candidate = dict(raw)
            candidate["guest_preview"] = str(candidate.get("id")) in preview_ids
            updated.append(candidate)

    # Preserve manifest order while applying the flags
    updated_map = {
        str(ex.get("id")): ex for ex in updated if isinstance(ex, dict) and ex.get("id")
    }
    manifest["exercises"] = [
        updated_map.get(str(ex.get("id")), ex) if isinstance(ex, dict) else ex
        for ex in exercises
    ]
    manifest["guest_preview_updated_at"] = datetime.now(timezone.utc).isoformat()

    _save_numbers_manifest(
        storage,
        drive=drive,
        version_folder_id=version_folder_id,
        version=version,
        manifest=manifest,
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "version": manifest.get("version") or version,
                "count_per_type": count_per_type,
                "marked_by_type": marked_by_type,
                "storage": storage,
                "updated": True,
            },
            status_code=200,
        )
        .build()
    )


def _find_numbers_version_folder(drive, version: str) -> str | None:
    """
    Locate the Drive folder for a given Numbers Dictation dataset version.

    If NUMBERS_STORE_ROOT is configured, treat it as the shared root folder ID.
    Otherwise, use the per-user LearningTracker/NumbersDictation tree.
    """
    if not version or not isinstance(version, str):
        return None

    # Resolve dataset root
    if Config.NUMBERS_STORE_ROOT:
        root_id = Config.NUMBERS_STORE_ROOT
    else:
        # This ensures the root structure exists but does NOT create the version folder.
        root_id = drive.ensure_path(["LearningTracker", NUMBERS_ROOT])

    # Find the specific version folder by name under the root
    safe_version = version.replace("'", "\\'")
    q = (
        f"name = '{safe_version}' and '{root_id}' in parents "
        f"and trashed = false and mimeType = '{FOLDER_MIME}'"
    )
    res = drive.g.drive_list(q=q, pageSize=1, fields="files(id,name)")
    files = res.get("files", [])
    if not files:
        return None
    return files[0]["id"]


def _is_gemini_error_sentence(sentence: str) -> bool:
    """
    Return True if the sentence clearly contains a Gemini API error payload.
    """
    if not sentence:
        return False

    markers = [
        "[Gemini error]",
        "Temporary service issue. Please try again.",
        "RESOURCE_EXHAUSTED",
        "generativelanguage.googleapis.com/generate_content_free_tier_requests",
        "ai.google.dev/gemini-api/docs/rate-limits",
    ]
    return any(marker in sentence for marker in markers)


def admin_cleanup_numbers_manifest(user_id: str):
    """
    Cleanup a Numbers Dictation dataset manifest for a specific version.

    Body:
    {
      "version": "2025-W50"
    }

    Rules:
    - Drop any exercise whose sentence contains a Gemini error payload.
    - Drop any exercise whose audio_ref is missing or refers to a deleted
      / inaccessible Drive file.
    """

    payload = request.get_json(silent=True) or {}
    version = payload.get("version")

    if not version or not isinstance(version, str):
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="version must be a non-empty string",
                status_code=400,
            )
            .build()
        )

    try:
        storage, drive, version_folder_id, manifest = _load_numbers_manifest(
            user_id, version
        )
    except FileNotFoundError as e:
        return _error_not_found(str(e))
    except Exception as e:
        return (
            ResponseBuilder()
            .error(
                error="Failed to load manifest",
                message=str(e),
                status_code=500,
            )
            .build()
        )

    exercises = manifest.get("exercises", [])
    if not isinstance(exercises, list):
        return _error_invalid_manifest("Manifest exercises must be a list")

    kept: list[dict] = []
    removed_gemini: list[str] = []
    removed_missing_audio: list[str] = []

    for raw in exercises:
        ex = dict(raw) if isinstance(raw, dict) else {}
        ex_id = ex.get("id") or ""
        sentence = str(ex.get("sentence") or "")
        audio_ref = ex.get("audio_ref")

        # 1) Drop obvious Gemini error payloads
        if _is_gemini_error_sentence(sentence):
            removed_gemini.append(ex_id)
            continue

        # 2) Drop missing / invalid audio references
        if not isinstance(audio_ref, str) or not audio_ref.strip():
            removed_missing_audio.append(ex_id)
            continue

        # For Git-backed storage, trust manifest paths and skip Drive checks.
        if storage == "github" or "/" in audio_ref:
            kept.append(ex)
            continue

        try:
            # Lightweight existence check; no media download.
            drive.g.drive_get(audio_ref, fields="id")
        except GoogleDriveError as e:
            # 404/403 -> treat as missing / deleted audio
            if e.status_code in (403, 404):
                removed_missing_audio.append(ex_id)
                continue
            logger.warning(
                f"[NUMBERS-MANIFEST-CLEANUP] drive_get failed for {audio_ref}: {e}"
            )
            # Keep the exercise if error is transient / unexpected

        kept.append(ex)

    # No changes -> no-op
    if len(kept) == len(exercises):
        return (
            ResponseBuilder()
            .success(
                data={
                    "version": manifest.get("version") or version,
                    "exerciseCount": len(exercises),
                    "removedGeminiError": [],
                    "removedMissingAudio": [],
                    "updated": False,
                },
                status_code=200,
            )
            .build()
        )

    # Persist cleaned manifest
    manifest["exercises"] = kept
    manifest["exercise_count"] = len(kept)

    manifest["cleaned_at"] = datetime.now(timezone.utc).isoformat()

    _save_numbers_manifest(
        storage,
        drive=drive,
        version_folder_id=version_folder_id,
        version=version,
        manifest=manifest,
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "version": manifest.get("version") or version,
                "before": len(exercises),
                "after": len(kept),
                "removedGeminiError": removed_gemini,
                "removedMissingAudio": removed_missing_audio,
                "storage": storage,
                "updated": True,
            },
            status_code=200,
        )
        .build()
    )
