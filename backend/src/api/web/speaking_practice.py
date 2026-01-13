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
import requests
from typing import Any

from flask import request, Response

from src.api.decorators import require_auth
from src.api.errors import BadRequestError
from src.infra.tts.tts_service import TTSService
from src.shared.drive_services import get_drive_services_from_request
from src.shared.speaking_practice_repo import SpeakingPracticeRepository
from src.utils.response_builder import ResponseBuilder
from src.utils.config import Config
from src.extensions import logger


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


# ==================== Retrieval Endpoints (GitHub-backed) ====================

def speaking_practice_list_topics():
    """
    GET /web/speaking-practice/topics
    
    List all available speaking practice topics from GitHub.
    No authentication required (public content).
    """
    repo = SpeakingPracticeRepository(base_url=Config.NUMBERS_AUDIO_BASE_URL)
    
    try:
        topic_ids = repo.list_topics()
        
        # Fetch manifest for each topic to get metadata
        topics = []
        for topic_id in topic_ids:
            try:
                manifest = repo.get_manifest(topic_id)
                topics.append({
                    "id": topic_id,
                    "title": manifest.get("title", topic_id.replace("_", " ").title()),
                    "subtopics_count": len(manifest.get("subtopics", [])),
                })
            except Exception as e:
                logger.warning(f"[SPEAKING-PRACTICE] Could not fetch manifest for {topic_id}: {e}")
                continue
        
        return ResponseBuilder().success(data={"topics": topics}).build()
    
    except Exception as e:
        raise BadRequestError(f"Failed to list topics: {e}")


def speaking_practice_get_manifest(topic_id: str):
    """
    GET /web/speaking-practice/topics/{topic_id}
    
    Get manifest for a specific topic, listing all subtopics.
    No authentication required (public content).
    """
    repo = SpeakingPracticeRepository(base_url=Config.NUMBERS_AUDIO_BASE_URL)
    
    try:
        manifest = repo.get_manifest(topic_id)
        return ResponseBuilder().success(data=manifest).build()
    
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            raise BadRequestError(f"Topic '{topic_id}' not found")
        raise BadRequestError(f"Failed to fetch manifest: {e}")
    except Exception as e:
        raise BadRequestError(f"Failed to fetch manifest: {e}")


def speaking_practice_get_content():
    """
    GET /web/speaking-practice/content?path={contentPath}
    
    Get practice content from a specific path.
    No authentication required (public content).
    
    Example: ?path=speaking-practice/alimentation/modes_consommation/content.json
    """
    content_path = request.args.get("path", "").strip()
    if not content_path:
        raise BadRequestError("path parameter is required")
    
    repo = SpeakingPracticeRepository(base_url=Config.NUMBERS_AUDIO_BASE_URL)
    
    try:
        content = repo.get_content(content_path)
        return ResponseBuilder().success(data=content).build()
    
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            raise BadRequestError(f"Content not found at path: {content_path}")
        raise BadRequestError(f"Failed to fetch content: {e}")
    except Exception as e:
        raise BadRequestError(f"Failed to fetch content: {e}")


def speaking_practice_stream_audio():
    """
    GET /web/speaking-practice/audio?path={audioPath}
    
    Stream audio file from GitHub.
    No authentication required (public content).
    
    Example: ?path=speaking-practice/alimentation/modes_consommation/audio/intro.mp3
    """
    audio_path = request.args.get("path", "").strip()
    if not audio_path:
        raise BadRequestError("path parameter is required")
    
    repo = SpeakingPracticeRepository(base_url=Config.NUMBERS_AUDIO_BASE_URL)
    
    try:
        audio_bytes = repo.get_audio(audio_path)
        return Response(audio_bytes, mimetype="audio/mpeg")
    
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            raise BadRequestError(f"Audio file not found at path: {audio_path}")
        raise BadRequestError(f"Failed to fetch audio: {e}")
    except Exception as e:
        raise BadRequestError(f"Failed to fetch audio: {e}")


__all__ = [
    "speaking_practice_create",
    "speaking_practice_list_topics",
    "speaking_practice_get_manifest",
    "speaking_practice_get_content",
    "speaking_practice_stream_audio",
]
