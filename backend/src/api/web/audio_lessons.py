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
from src.infra.tts.tts_service import TTSService
from src.utils.response_builder import ResponseBuilder
from src.extensions import logger

tts_service = TTSService()


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


@require_auth
def audio_lesson_generate_tts(user_id: str):
    """
    POST /web/audio-lessons/tts

    Create an audio lesson directly from text using Azure Speech.
    Text is stored as transcript; audio is generated and stored in Drive.

    JSON body:
    {
      "text": "Full article or essay text",  // required
      "language": "fr",                      // optional
      "name": "Lesson title",                // optional
      "lesson_id": "custom-id",              // optional
      "voice": "fr-FR-DeniseNeural"          // optional Azure voice name
    }
    """
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    body = request.get_json(silent=True) or {}

    text = (body.get("text") or "").strip()
    if not text:
        raise BadRequestError("text is required")

    language = (body.get("language") or "").strip() or None
    name = (body.get("name") or "").strip() or None
    lesson_id = body.get("lesson_id") or body.get("id") or None
    voice = (body.get("voice") or "").strip() or None

    try:
        audio_bytes = tts_service.synthesize(text, voice=voice)
    except Exception as e:
        raise BadRequestError(f"Failed to synthesize audio: {e}")

    storage_payload = drive.save_audio_lesson(
        lesson_id=lesson_id,
        audio_bytes=audio_bytes,
        audio_filename="audio.mp3",
        transcript_text=text,
        language=language,
        duration_seconds=None,
        timestamps=None,
        name=name,
        subfolder=drive.AUTO_AUDIO_SUBFOLDER,
    )

    return ResponseBuilder().success(data=storage_payload, status_code=201).build()


@require_auth
def audio_lesson_generate_conversation_tts(user_id: str):
    """
    POST /web/audio-lessons/conversation

    Generate an audio lesson for a multi-speaker conversation.
    Audio is synthesized via Azure Speech; transcript is derived from turns.

    JSON body:
    {
      "turns": [
        { "speaker": "A", "voice": "fr-FR-DeniseNeural", "text": "..." },
        { "speaker": "B", "voice": "fr-FR-HenriNeural", "text": "..." }
      ],
      "language": "fr",
      "name": "Conversation title",
      "lesson_id": "custom-id",
      "break_ms": 600
    }
    """
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    body = request.get_json(silent=True) or {}

    turns = body.get("turns") or []
    if not isinstance(turns, list) or not turns:
        raise BadRequestError("turns must be a non-empty list")

    language = (body.get("language") or "").strip() or None
    name = (body.get("name") or "").strip() or None
    lesson_id = body.get("lesson_id") or body.get("id") or None
    break_ms = body.get("break_ms") or 500
    try:
        break_ms_int = int(break_ms)
    except (TypeError, ValueError):
        raise BadRequestError("break_ms must be an integer")

    transcript_lines: list[str] = []
    normalized_turns: list[dict] = []
    for t in turns:
        if not isinstance(t, dict):
            continue
        text = (t.get("text") or "").strip()
        if not text:
            continue
        speaker = (t.get("speaker") or "").strip()
        voice = (t.get("voice") or "").strip()

        if speaker:
            transcript_lines.append(f"{speaker}: {text}")
        else:
            transcript_lines.append(text)

        turn_payload: dict[str, str] = {"text": text}
        if voice:
            turn_payload["voice"] = voice
        normalized_turns.append(turn_payload)

    if not normalized_turns:
        raise BadRequestError("all turns are empty")

    transcript_text = "\n".join(transcript_lines)

    try:
        audio_bytes = tts_service.synthesize_conversation(
            normalized_turns,
            language=language,
            break_ms=break_ms_int,
        )
    except Exception as e:
        raise BadRequestError(f"Failed to synthesize conversation audio: {e}")

    storage_payload = drive.save_audio_lesson(
        lesson_id=lesson_id,
        audio_bytes=audio_bytes,
        audio_filename="audio.mp3",
        transcript_text=transcript_text,
        language=language,
        duration_seconds=None,
        timestamps=None,
        name=name,
        subfolder=drive.AUTO_AUDIO_SUBFOLDER,
    )

    return ResponseBuilder().success(data=storage_payload, status_code=201).build()


@require_auth
def audio_lesson_save_questions(lesson_id: str, user_id: str):
    """
    POST /web/audio-lessons/<lesson_id>/questions

    Attach a questions.json file to an existing audio lesson folder.
    The lesson_id must correspond to an existing AudioLessons/<lesson_id>
    or AudioLessons/autoAudio/<lesson_id> directory.

    Request JSON:
    {
      // arbitrary QCM structure; stored as-is
    }
    """
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    questions = request.get_json(silent=True)
    
    logger.info(
        f"[AUDIO-LESSONS] Questions payload debug: "
        f"get_json_result={questions}, "
        f"type={type(questions)}, "
        f"content_type={request.content_type}, "
        f"has_data={bool(request.data)}, "
        f"data_length={len(request.data) if request.data else 0}"
    )
    
    if questions is None and request.data:
        try:
            questions = json.loads(request.data.decode('utf-8'))
            logger.info(f"[AUDIO-LESSONS] Successfully parsed from request.data")
        except Exception as e:
            logger.error(f"[AUDIO-LESSONS] Failed to parse request.data: {e}")
            questions = {}
    
    if questions is None:
        questions = {}
    
    if not isinstance(questions, dict) or not questions:
        logger.warning(
            f"[AUDIO-LESSONS] Invalid questions payload after all attempts: "
            f"type={type(questions)}, is_dict={isinstance(questions, dict)}, "
            f"is_empty={not questions if isinstance(questions, dict) else 'N/A'}"
        )
        raise BadRequestError("questions payload must be a non-empty JSON object")

    variant = (request.args.get("variant") or request.args.get("type") or "").strip() or None

    result = drive.save_audio_lesson_questions(
        lesson_id=lesson_id,
        questions=questions,
        variant=variant,
    )
    if not result:
        raise NotFoundError("Audio lesson not found")

    return ResponseBuilder().success(data=result, status_code=201).build()


__all__ = [
    "audio_lessons_list",
    "audio_lesson_transcript",
    "audio_lesson_stream",
    "audio_lesson_create",
    "audio_lesson_generate_tts",
    "audio_lesson_generate_conversation_tts",
    "audio_lesson_save_questions",
]
