from __future__ import annotations

from flask import request

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
from src.infra.tts.tts_service import TTSService
from src.config import Config
from src.infra.drive import DriveRepository, GoogleDriveClient
from src.infra.drive.repository import FOLDER_MIME
from src.infra.drive.client import GoogleDriveError
from src.utils.response_builder import ResponseBuilder
from src.extensions import logger


def _get_drive_repo(access_token: str) -> DriveRepository:
    """
    Create a DriveRepository from an OAuth access token.

    This replaces the old `get_web_store()` dependency.
    """
    client = GoogleDriveClient(access_token)
    return DriveRepository(client)


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


# ============================================================
# Admin endpoints
# ============================================================


def admin_generate_numbers_dataset():
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
    access_token = (request.headers.get("X-Google-Access-Token") or "").strip()
    if not access_token:
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="X-Google-Access-Token header is required for Drive operations",
                status_code=400,
            )
            .build()
        )

    drive = _get_drive_repo(access_token)

    audio_storage = AdminAudioStorage(drive)
    dataset_writer = AdminDatasetWriter(drive)
    repo = GoogleDriveNumbersExerciseRepository(drive)

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


def admin_list_numbers_datasets():
    """
    List all available Numbers Dictation datasets.
    """

    access_token = (request.headers.get("X-Google-Access-Token") or "").strip()
    if not access_token:
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="X-Google-Access-Token header is required for Drive operations",
                status_code=400,
            )
            .build()
        )

    repo = GoogleDriveNumbersExerciseRepository(_get_drive_repo(access_token))

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
]


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


def admin_cleanup_numbers_manifest():
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

    access_token = (request.headers.get("X-Google-Access-Token") or "").strip()
    if not access_token:
        return (
            ResponseBuilder()
            .error(
                error="Bad request",
                message="X-Google-Access-Token header is required for Drive operations",
                status_code=400,
            )
            .build()
        )

    drive = _get_drive_repo(access_token)

    version_folder_id = _find_numbers_version_folder(drive, version)
    if not version_folder_id:
        return (
            ResponseBuilder()
            .error(
                error="Not found",
                message=f"Dataset version folder '{version}' not found",
                status_code=404,
            )
            .build()
        )

    manifest = drive.get_json(version_folder_id, MANIFEST_FILENAME)
    if not manifest:
        return (
            ResponseBuilder()
            .error(
                error="Not found",
                message=f"manifest.json not found for version '{version}'",
                status_code=404,
            )
            .build()
        )

    exercises = manifest.get("exercises", [])
    if not isinstance(exercises, list):
        return (
            ResponseBuilder()
            .error(
                error="Invalid manifest",
                message="Manifest exercises must be a list",
                status_code=500,
            )
            .build()
        )

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

        # For non-Drive storage (e.g. Git-backed paths like "fr/2025-W50/..."),
        # we skip Drive existence checks and trust the manifest.
        if "/" in audio_ref:
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

    from datetime import datetime, timezone

    manifest["cleaned_at"] = datetime.now(timezone.utc).isoformat()

    drive.upsert_json(
        parent_id=version_folder_id,
        name=MANIFEST_FILENAME,
        obj=manifest,
        app_properties={
            "type": "numbers_dictation_manifest",
            "version": manifest.get("version") or version,
        },
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
                "updated": True,
            },
            status_code=200,
        )
        .build()
    )
