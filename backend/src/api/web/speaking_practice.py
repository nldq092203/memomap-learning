"""
Speaking Practice API endpoints (Drive + Azure TTS).

Feature:
- Learner listens to an intro and progressive questions.
- Learner speaks for a fixed time per question.
- Then listens to a model answer.

Storage layout in Google Drive:

MemoMap/LearningTracker/SpeakingPractice/<level>/<topic_id>/
  - content.json        # Source of truth for prompts and timings
  - audio/
      intro.mp3
      q1_warmup.mp3
      q2_opinion.mp3
      q3_nuance.mp3
      model_answer.mp3

Auth:
- JWT (Authorization: Bearer <jwt>)
- Google Drive access token for Drive ops (X-Google-Access-Token)
"""

from __future__ import annotations

import re
from typing import Any

from flask import request

from src.api.decorators import require_auth
from src.api.errors import BadRequestError
from src.infra.tts.tts_service import TTSService
from src.shared.drive_services import get_drive_services_from_request
from src.utils.response_builder import ResponseBuilder


tts_service = TTSService()


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "topic"


@require_auth
def speaking_practice_create(user_id: str):
    """
    POST /web/speaking-practice/sets

    Create a speaking practice set for a given topic.
    Expects text prompts; generates all audio via Azure TTS and persists
    content.json + audio files to Drive.

    Request JSON (voice per item optional):
    {
      "topic": "Télétravail",
      "language": "fr",
      "level": "B2",
      "topic_id": "teletravail",   // optional, derived from topic if absent
      "audios": [
        { "type": "intro", "text": "Nous allons parler du télétravail.", "voice": "fr-FR-DeniseNeural" },
        {
          "type": "question",
          "level": "warmup",
          "text": "Avez-vous déjà travaillé à distance ?",
          "speak_time_sec": 45,
          "voice": "fr-FR-HenriNeural"
        },
        ...
        {
          "type": "model_answer",
          "text": "On peut répondre de plusieurs manières. D’abord...",
          "voice": "fr-FR-DeniseNeural"
        }
      ]
    }
    """
    try:
        drive = get_drive_services_from_request()
    except ValueError as e:
        raise BadRequestError(str(e))

    body: dict[str, Any] = request.get_json(silent=True) or {}

    topic = (body.get("topic") or "").strip()
    if not topic:
        raise BadRequestError("topic is required")

    language = (body.get("language") or "").strip() or "fr"
    level = (body.get("level") or "").strip().upper() or "B2"
    topic_id = (body.get("topic_id") or "").strip() or _slugify(topic)

    audios = body.get("audios") or []
    if not isinstance(audios, list) or not audios:
        raise BadRequestError("audios must be a non-empty list")

    # Normalize items into structured segments
    intro_item: dict[str, Any] | None = None
    question_items: list[dict[str, Any]] = []
    model_item: dict[str, Any] | None = None

    for item in audios:
        if not isinstance(item, dict):
            continue
        item_type = (item.get("type") or "").strip().lower()
        text = (item.get("text") or "").strip()
        if not text or not item_type:
            continue

        item_voice = (item.get("voice") or "").strip() or None

        if item_type == "intro" and intro_item is None:
            intro_item = {
                "id": "intro",
                "text": text,
                "filename": "intro.mp3",
                "voice": item_voice,
            }
        elif item_type == "question":
            level_tag = (item.get("level") or "").strip().lower()
            speak = item.get("speak_time_sec") or item.get("s") or 0
            try:
                speak_sec = int(speak)
            except (TypeError, ValueError):
                raise BadRequestError("speak_time_sec must be an integer for questions")
            question_items.append(
                {
                    "type": "question",
                    "level": level_tag,
                    "text": text,
                    "s": speak_sec,
                    "voice": item_voice,
                }
            )
        elif item_type == "model_answer" and model_item is None:
            model_item = {
                "id": "model",
                "text": text,
                "filename": "model_answer.mp3",
                "voice": item_voice,
            }

    if not intro_item:
        raise BadRequestError("one 'intro' item is required")
    if not question_items:
        raise BadRequestError("at least one 'question' item is required")
    if not model_item:
        raise BadRequestError("one 'model_answer' item is required")

    # Assign ids/filenames to questions in order
    normalized_questions: list[dict[str, Any]] = []
    for idx, q in enumerate(question_items, start=1):
        q_id = f"q{idx}"
        level_tag = q.get("level") or ""
        level_suffix = level_tag.lower() or f"q{idx}"
        filename = f"{q_id}_{level_suffix}.mp3"
        normalized_questions.append(
            {
                "id": q_id,
                "text": q["text"],
                "s": q["s"],
                "level": level_tag,
                "voice": q.get("voice"),
                "filename": filename,
            }
        )

    # Build content.json structure
    content_items: list[dict[str, Any]] = []
    content_items.append({"id": "intro", "t": intro_item["text"]})
    for q in normalized_questions:
        content_items.append(
            {"id": q["id"], "t": q["text"], "s": q["s"]}
        )
    content_items.append({"id": "model", "t": model_item["text"]})

    content_doc = {
        "id": topic_id,
        "lang": language,
        "level": level,
        "topic": topic,
        "items": content_items,
    }

    # Synthesize audio for all items
    audio_payloads: list[dict[str, Any]] = []

    # Intro
    intro_audio = tts_service.synthesize(intro_item["text"], voice=intro_item.get("voice"))
    audio_payloads.append(
        {
            "filename": intro_item["filename"],
            "bytes": intro_audio,
        }
    )

    # Questions
    for q in normalized_questions:
        q_audio = tts_service.synthesize(q["text"], voice=q.get("voice"))
        audio_payloads.append(
            {
                "filename": q["filename"],
                "bytes": q_audio,
            }
        )

    # Model answer
    model_audio = tts_service.synthesize(model_item["text"], voice=model_item.get("voice"))
    audio_payloads.append(
        {
            "filename": model_item["filename"],
            "bytes": model_audio,
        }
    )

    # Persist to Drive
    storage_result = drive.save_speaking_practice_set(
        level=level,
        topic_id=topic_id,
        content=content_doc,
        audio_files=audio_payloads,
    )

    return (
        ResponseBuilder()
        .success(
            data={
                "topic_id": topic_id,
                "level": level,
                "language": language,
                "drive": storage_result,
            },
            status_code=201,
        )
        .build()
    )


__all__ = ["speaking_practice_create"]
