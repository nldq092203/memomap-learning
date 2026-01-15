"""
CO/CE Practice API endpoints - Database + GitHub-backed.

User APIs: List and retrieve exercises
Admin APIs: Create/update exercises and manage QCM/transcript files on GitHub

Layout (example):

<BASE_URL>/co-ce-practice/B2/<exercise_id>/audio.mp3
<BASE_URL>/co-ce-practice/B2/<exercise_id>/transcript.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/questions_co.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/questions_ce.json
"""

from __future__ import annotations

import json

from flask import request

from src.api.decorators import require_auth
from src.api.errors import BadRequestError, NotFoundError
from src.shared.coce_practice.exercise_repository import CoCeExerciseRepository
from src.shared.coce_practice.github_manager import GitHubCoCeManager
from src.shared.coce_practice.repository import GitHubCoCePracticeRepository
from src.shared.coce_practice.schemas import (
    CreateExerciseRequest,
    SaveQcmRequest,
    SaveTranscriptRequest,
    UpdateExerciseRequest,
)
from src.shared.coce_practice.youtube_transcript_service import YouTubeTranscriptService
from src.utils.response_builder import ResponseBuilder


def _get_level() -> str:
    level = (request.args.get("level") or "").strip().upper()
    return level or "B2"


# ============================================================================
# USER APIs - Exercise Listing & Retrieval
# ============================================================================


@require_auth
def coce_list_exercises(user_id: str):
    """
    GET /web/coce/exercises?level=B2

    Returns list of available CO/CE practice exercises for a given level (from database).
    """
    level = _get_level()

    # Get exercises from DATABASE
    exercise_repo = CoCeExerciseRepository()
    exercises = exercise_repo.get_by_level(level)

    github_repo = GitHubCoCePracticeRepository(level=level)

    items = []
    for ex in exercises:
        item = {
            "id": ex.id,
            "name": ex.name,
            "level": ex.level,
            "duration_seconds": ex.duration_seconds,
            "media_type": ex.media_type,
            "media_id": ex.media_id,
            "created_at": ex.created_at.isoformat(),
        }

        # Add media URL
        if ex.media_type == "video":
            item["video_url"] = f"https://www.youtube.com/embed/{ex.media_id}"
        else:
            item["audio_url"] = github_repo.audio_url(ex.media_id)

        items.append(item)

    return ResponseBuilder().success(data={"items": items, "level": level}).build()


@require_auth
def coce_get_exercise(user_id: str, exercise_id: str):
    """
    GET /web/coce/exercises/<exercise_id>

    Returns complete exercise details including GitHub URLs for QCM and transcript.
    """
    exercise_repo = CoCeExerciseRepository()
    ex = exercise_repo.get_by_id(exercise_id)

    if not ex:
        raise NotFoundError("Exercise not found")

    github_repo = GitHubCoCePracticeRepository(level=ex.level)
    base_url = github_repo._root_prefix()

    result = {
        "id": ex.id,
        "name": ex.name,
        "level": ex.level,
        "duration_seconds": ex.duration_seconds,
        "media_type": ex.media_type,
        "media_id": ex.media_id,
        "created_at": ex.created_at.isoformat(),
        "updated_at": ex.updated_at.isoformat(),
    }

    # Add media URL
    if ex.media_type == "video":
        result["video_url"] = f"https://www.youtube.com/embed/{ex.media_id}"
    else:
        result["audio_url"] = github_repo.audio_url(ex.media_id)

    # Add GitHub URLs for QCM and transcript if paths exist
    if ex.co_path:
        result["co_github_url"] = f"{base_url}/{ex.media_id}/questions_co.json"
    if ex.ce_path:
        result["ce_github_url"] = f"{base_url}/{ex.media_id}/questions_ce.json"
    if ex.transcript_path:
        result["transcript_github_url"] = f"{base_url}/{ex.media_id}/transcript.json"

    return ResponseBuilder().success(data=result).build()


@require_auth
def coce_get_transcript(user_id: str, exercise_id: str):
    """
    GET /web/coce/exercises/<exercise_id>/transcript

    Returns transcript.json content for an exercise (fetched from GitHub).
    """
    exercise_repo = CoCeExerciseRepository()
    ex = exercise_repo.get_by_id(exercise_id)

    if not ex:
        raise NotFoundError("Exercise not found")

    github_repo = GitHubCoCePracticeRepository(level=ex.level)

    try:
        transcript = github_repo.fetch_transcript(ex.media_id)
    except Exception as e:
        raise NotFoundError(f"Transcript not found: {e}")

    return ResponseBuilder().success(data=transcript.model_dump(mode="json")).build()


@require_auth
def coce_get_questions(user_id: str, exercise_id: str):
    """
    GET /web/coce/exercises/<exercise_id>/questions?type=co|ce

    Returns questions_co.json or questions_ce.json content (fetched from GitHub).
    """
    variant = (
        (request.args.get("type") or request.args.get("variant") or "").strip().lower()
    )
    if variant not in ("co", "ce"):
        raise BadRequestError("type must be 'co' or 'ce'")

    exercise_repo = CoCeExerciseRepository()
    ex = exercise_repo.get_by_id(exercise_id)

    if not ex:
        raise NotFoundError("Exercise not found")

    github_repo = GitHubCoCePracticeRepository(level=ex.level)

    try:
        questions = github_repo.fetch_questions(ex.media_id, variant=variant)
    except Exception as e:
        raise NotFoundError(f"Questions file not found: {e}")

    return ResponseBuilder().success(data=questions.model_dump(mode="json")).build()


# ============================================================================
# ADMIN APIs - Exercise Management
# ============================================================================


@require_auth  # TODO: Change to @require_admin when ready
def admin_create_exercise(user_id: str):
    """
    POST /web/coce/admin/exercises

    Create a new exercise (metadata only, no files yet).

    Body:
    {
        "name": "Exercise name",
        "level": "B2",
        "duration_seconds": 300,
        "media_id": "youtube_video_id",
        "media_type": "video"
    }
    """
    body = request.get_json() or {}

    try:
        req = CreateExerciseRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    exercise_repo = CoCeExerciseRepository()
    github_mgr = GitHubCoCeManager()

    # Generate file paths
    paths = github_mgr.generate_paths(req.level, req.media_id)

    # Create exercise in database
    exercise = exercise_repo.create_exercise(
        name=req.name,
        level=req.level,
        duration_seconds=req.duration_seconds,
        media_id=req.media_id,
        media_type=req.media_type,
        co_path=paths["co_path"],
        ce_path=paths["ce_path"],
        transcript_path=paths["transcript_path"],
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "id": exercise.id,
                "message": "Exercise created. Now upload QCM and transcript files.",
                "paths": paths,
            },
            status_code=201,
        )
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def admin_update_exercise(user_id: str, exercise_id: str):
    """
    PATCH /web/coce/admin/exercises/<exercise_id>

    Update exercise metadata.
    """
    body = request.get_json() or {}

    try:
        req = UpdateExerciseRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    exercise_repo = CoCeExerciseRepository()
    
    # Only update fields that were provided
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    exercise = exercise_repo.update_exercise(exercise_id, **updates)

    if not exercise:
        raise NotFoundError("Exercise not found")

    return (
        ResponseBuilder()
        .success(data={"id": exercise.id, "message": "Exercise updated"})
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def admin_delete_exercise(user_id: str, exercise_id: str):
    """
    DELETE /web/coce/admin/exercises/<exercise_id>

    Delete exercise metadata (does NOT delete GitHub files).
    """
    exercise_repo = CoCeExerciseRepository()
    success = exercise_repo.delete_exercise(exercise_id)

    if not success:
        raise NotFoundError("Exercise not found")

    return (
        ResponseBuilder()
        .success(data={"message": "Exercise deleted from database"})
        .build()
    )


# ============================================================================
# ADMIN APIs - Content Management (QCM & Transcript)
# ============================================================================


@require_auth  # TODO: Change to @require_admin when ready
def admin_save_qcm(user_id: str):
    """
    POST /web/coce/admin/qcm

    Save QCM data to GitHub (creates/updates questions_co.json or questions_ce.json).

    Body:
    {
        "exercise_id": "uuid",
        "variant": "co",  // or "ce"
        "qcm_data": { ... }  // CoCeQuestionsFile schema
    }
    """
    body = request.get_json() or {}

    try:
        req = SaveQcmRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    exercise_repo = CoCeExerciseRepository()
    exercise = exercise_repo.get_by_id(req.exercise_id)

    if not exercise:
        raise NotFoundError("Exercise not found")

    # Get file path
    file_path = exercise.co_path if req.variant == "co" else exercise.ce_path

    if not file_path:
        raise BadRequestError(
            f"No {req.variant.upper()} path configured for this exercise"
        )

    # Save to GitHub
    github_mgr = GitHubCoCeManager()
    content = req.qcm_data.model_dump_json(indent=2)

    result = github_mgr.create_or_update_file(
        file_path=file_path,
        content=content,
        commit_message=f"chore: update {req.variant.upper()} questions for exercise {exercise.name}",
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "message": f"QCM ({req.variant.upper()}) saved to GitHub",
                "file_path": file_path,
                "github_url": result.get("content", {}).get("html_url"),
            }
        )
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def admin_save_transcript(user_id: str):
    """
    POST /web/coce/admin/transcript

    Save transcript data to GitHub (creates/updates transcript.json).

    Body:
    {
        "exercise_id": "uuid",
        "transcript_data": { ... }  // CoCeTranscript schema
    }
    """
    body = request.get_json() or {}

    try:
        req = SaveTranscriptRequest(**body)
    except Exception as e:
        raise BadRequestError(str(e))

    exercise_repo = CoCeExerciseRepository()
    exercise = exercise_repo.get_by_id(req.exercise_id)

    if not exercise:
        raise NotFoundError("Exercise not found")

    if not exercise.transcript_path:
        raise BadRequestError("No transcript path configured for this exercise")

    # Save to GitHub
    github_mgr = GitHubCoCeManager()
    content = req.transcript_data.model_dump_json(indent=2)

    result = github_mgr.create_or_update_file(
        file_path=exercise.transcript_path,
        content=content,
        commit_message=f"chore: update transcript for exercise {exercise.name}",
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "message": "Transcript saved to GitHub",
                "file_path": exercise.transcript_path,
                "github_url": result.get("content", {}).get("html_url"),
            }
        )
        .build()
    )


@require_auth  # TODO: Change to @require_admin when ready
def admin_generate_youtube_transcript(user_id: str):
    """
    POST /web/coce/admin/youtube-transcript

    Auto-generate transcript from YouTube video and save to GitHub.

    Body:
    {
        "exercise_id": "uuid",
        "languages": ["fr", "en"]  // Optional, default: ["fr", "en"]
    }
    """
    body = request.get_json() or {}
    exercise_id = body.get("exercise_id")
    languages = body.get("languages", ["fr", "en"])

    if not exercise_id:
        raise BadRequestError("exercise_id is required")

    # Get exercise
    exercise_repo = CoCeExerciseRepository()
    exercise = exercise_repo.get_by_id(exercise_id)

    if not exercise:
        raise NotFoundError("Exercise not found")

    # Verify it's a video exercise
    if exercise.media_type != "video":
        raise BadRequestError(
            "This endpoint is only for video exercises. "
            f"Exercise has media_type='{exercise.media_type}'"
        )

    if not exercise.transcript_path:
        raise BadRequestError("No transcript path configured for this exercise")

    youtube_service = YouTubeTranscriptService()

    # Fetch transcript from YouTube
    try:
        yt_data = youtube_service.fetch_transcript(exercise.media_id, languages)
    except ValueError as e:
        raise BadRequestError(f"Failed to fetch YouTube transcript: {str(e)}")

    # Format for CO/CE transcript.json
    transcript_data = youtube_service.format_for_coce(
        video_id=exercise.media_id,
        name=exercise.name,
        transcript_text=yt_data["transcript"],
        language=yt_data["language"],
        duration_seconds=yt_data["duration_seconds"],
    )

    # Update exercise duration if different
    if exercise.duration_seconds != yt_data["duration_seconds"]:
        exercise_repo.update_exercise(
            exercise_id, duration_seconds=yt_data["duration_seconds"]
        )


    github_mgr = GitHubCoCeManager()
    content = json.dumps(transcript_data, indent=2, ensure_ascii=False)

    result = github_mgr.create_or_update_file(
        file_path=exercise.transcript_path,
        content=content,
        commit_message=f"chore: add auto-generated transcript from YouTube for {exercise.name}",
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "message": "YouTube transcript auto-generated and saved to GitHub",
                "file_path": exercise.transcript_path,
                "github_url": result.get("content", {}).get("html_url"),
                "transcript_info": {
                    "language": yt_data["language"],
                    "is_generated": yt_data["is_generated"],
                    "duration_seconds": yt_data["duration_seconds"],
                    "character_count": len(yt_data["transcript"]),
                },
            }
        )
        .build()
    )


# Export all endpoints
__all__ = [
    # User endpoints
    "coce_list_exercises",
    "coce_get_exercise",
    "coce_get_transcript",
    "coce_get_questions",
    # Admin endpoints
    "admin_create_exercise",
    "admin_update_exercise",
    "admin_delete_exercise",
    "admin_save_qcm",
    "admin_save_transcript",
    "admin_generate_youtube_transcript",
]
