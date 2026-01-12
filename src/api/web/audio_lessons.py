"""Audio Lessons API endpoints (Drive-backed).

These endpoints keep the original Drive-based flow for audio lessons:
- Files are stored in Google Drive under: MemoMap/LearningTracker/AudioLessons/<lesson_id>/*
- Metadata is stored in `transcript.json` inside that folder

Auth:
- JWT (Authorization: Bearer <jwt>)
- Google Drive access token for Drive ops (X-Google-Access-Token)
"""

from __future__ import annotations

import json
from flask import Response, request

from src.api.decorators import require_auth
from src.api.errors import BadRequestError, NotFoundError
from src.shared.drive_services import (
    get_drive_services_from_request,
    parse_optional_json,
)
from src.utils.response_builder import ResponseBuilder


@require_auth
def audio_lessons_list(user_id: str):
    """GET /web/audio-lessons"""
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    page_size = int(request.args.get("pageSize", 20))
    page_token = request.args.get("pageToken") or None
    language = (request.args.get("language") or "").strip() or None

    data = drive.list_audio_lessons(
        page_size=page_size, page_token=page_token, language=language
    )
    return ResponseBuilder().success(data=data).build()


@require_auth
def audio_lesson_transcript(lesson_id: str, user_id: str):
    """GET /web/audio-lessons/<lesson_id>/transcript"""
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    transcript = drive.get_audio_lesson_transcript(lesson_id)
    if not transcript:
        raise NotFoundError("Audio lesson not found")

    return ResponseBuilder().success(data=transcript).build()


@require_auth
def audio_lesson_stream(lesson_id: str, user_id: str):
    """GET /web/audio-lessons/<lesson_id>/audio"""
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    audio_meta = drive.get_audio_lesson_audio_file(lesson_id)
    if not audio_meta or not audio_meta.get("id"):
        raise NotFoundError("Audio file not found")

    data = drive.stream_drive_file(audio_meta["id"])
    mime_type = audio_meta.get("mimeType") or "application/octet-stream"
    return Response(data, mimetype=mime_type)


@require_auth
def audio_lesson_create(user_id: str):
    """POST /web/audio-lessons

    multipart/form-data:
    - audio: file (required)
    - transcript: text (required)  (or 'text')
    - id: optional lesson id
    - language: optional
    - duration: optional seconds
    - timestamps: optional JSON string
    - name: optional
    """
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    audio_file = request.files.get("audio")
    transcript = request.form.get("transcript") or request.form.get("text")
    if not audio_file or not transcript:
        raise BadRequestError("audio file and transcript are required")

    lesson_id = request.form.get("id") or None
    language = (request.form.get("language") or "").strip() or None
    name = (request.form.get("name") or "").strip() or None

    duration_raw = request.form.get("duration")
    duration: float | None = None
    if duration_raw not in (None, ""):
        try:
            duration = float(duration_raw)
        except ValueError:
            raise BadRequestError("duration must be numeric (seconds)")

    timestamps_raw = request.form.get("timestamps")
    try:
        timestamps = parse_optional_json(timestamps_raw)
    except json.JSONDecodeError:
        raise BadRequestError("timestamps must be valid JSON")

    payload = drive.save_audio_lesson(
        lesson_id=lesson_id,
        audio_bytes=audio_file.read(),
        audio_filename=audio_file.filename or "audio.bin",
        transcript_text=transcript,
        language=language,
        duration_seconds=duration,
        timestamps=timestamps,
        name=name,
    )

    return ResponseBuilder().success(data=payload, status_code=201).build()


__all__ = [
    "audio_lessons_list",
    "audio_lesson_transcript",
    "audio_lesson_stream",
    "audio_lesson_create",
]
