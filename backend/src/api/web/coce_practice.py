"""
CO/CE Practice API endpoints (GitHub-backed).

Uses static assets hosted in a Git repo (similar to Numbers Dictation).

Layout (example):

<BASE_URL>/co-ce-practice/B2/manifest.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/audio.mp3
<BASE_URL>/co-ce-practice/B2/<exercise_id>/transcript.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/questions_co.json
<BASE_URL>/co-ce-practice/B2/<exercise_id>/questions_ce.json
"""

from __future__ import annotations

from flask import request

from src.api.decorators import require_auth
from src.api.errors import BadRequestError, NotFoundError
from src.shared.coce_practice.repository import GitHubCoCePracticeRepository
from src.utils.response_builder import ResponseBuilder


def _get_level() -> str:
    level = (request.args.get("level") or "").strip().upper()
    return level or "B2"


@require_auth
def coce_list_exercises(user_id: str):
    """
    GET /web/coce/exercises?level=B2

    Returns list of available CO/CE practice exercises for a given level.
    """
    level = _get_level()

    repo = GitHubCoCePracticeRepository(level=level)
    items = [
        {
            "id": ex.id,
            "name": ex.name,
            "duration_seconds": ex.duration_seconds,
        }
        for ex in repo.list_exercises()
    ]

    return ResponseBuilder().success(data={"items": items, "level": level}).build()


@require_auth
def coce_get_exercise(user_id: str, exercise_id: str):
    """
    GET /web/coce/exercises/<exercise_id>?level=B2

    Returns exercise metadata and audio URL.
    """
    level = _get_level()
    repo = GitHubCoCePracticeRepository(level=level)
    ex = repo.get_exercise(exercise_id)
    if not ex:
        raise NotFoundError("Exercise not found")

    audio_url = repo.audio_url(exercise_id)

    return ResponseBuilder().success(
        data={
            "id": ex.id,
            "name": ex.name,
            "duration_seconds": ex.duration_seconds,
            "audio_url": audio_url,
            "level": level,
        }
    ).build()


@require_auth
def coce_get_transcript(user_id: str, exercise_id: str):
    """
    GET /web/coce/exercises/<exercise_id>/transcript?level=B2

    Returns transcript.json content for an exercise.
    """
    level = _get_level()
    repo = GitHubCoCePracticeRepository(level=level)
    if not repo.get_exercise(exercise_id):
        raise NotFoundError("Exercise not found")

    try:
        transcript = repo.fetch_transcript(exercise_id)
    except Exception as e:
        raise NotFoundError(f"Transcript not found: {e}")

    return ResponseBuilder().success(data=transcript.model_dump(mode="json")).build()


@require_auth
def coce_get_questions(user_id: str, exercise_id: str):
    """
    GET /web/coce/exercises/<exercise_id>/questions?level=B2&type=co|ce

    Returns questions_co.json or questions_ce.json content.
    """
    level = _get_level()
    variant = (request.args.get("type") or request.args.get("variant") or "").strip().lower()
    if variant not in ("co", "ce"):
        raise BadRequestError("type must be 'co' or 'ce'")

    repo = GitHubCoCePracticeRepository(level=level)
    if not repo.get_exercise(exercise_id):
        raise NotFoundError("Exercise not found")

    try:
        questions = repo.fetch_questions(exercise_id, variant=variant)
    except Exception as e:
        raise NotFoundError(f"Questions file not found: {e}")

    return ResponseBuilder().success(
        data=questions.model_dump(mode="json")
    ).build()


__all__ = [
    "coce_list_exercises",
    "coce_get_exercise",
    "coce_get_transcript",
    "coce_get_questions",
]
