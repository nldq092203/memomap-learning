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
- Google Drive access is refreshed server-side from the user's stored Google session
"""

from __future__ import annotations

import re
import requests
import json
from typing import Any

from flask import request, Response

from src.api.decorators import require_auth
from src.api.errors import BadRequestError, NotFoundError
from src.infra.tts.tts_service import TTSService
from src.shared.drive_services import get_drive_services_for_user
from src.shared.github_manager import GitHubContentManager
from src.shared.speaking_practice_repo import SpeakingPracticeRepository
from src.utils.response_builder import ResponseBuilder
from src.config import Config
from src.extensions import logger


tts_service = TTSService()


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "topic"


def _is_guest_mode() -> bool:
    raw = (request.args.get("guest_mode") or "").strip().lower()
    return raw in ("1", "true", "yes")


def _filter_guest_preview_list(items: list[dict[str, Any]], limit: int = 2) -> list[dict[str, Any]]:
    flagged = [item for item in items if isinstance(item, dict) and item.get("guest_preview")]
    if flagged:
        return flagged[:limit]
    return items[:limit]


def _normalize_content_path(topic_id: str, subtopic: dict[str, Any]) -> str:
    content_path = str(subtopic.get("contentPath") or "").strip()
    if content_path:
        return content_path

    subtopic_id = str(subtopic.get("id") or "").strip()
    if not subtopic_id:
        raise BadRequestError("subtopic id is required to resolve content path")

    return f"speaking-practice/{topic_id}/{subtopic_id}/content.json"


def _extract_topic_id_from_content_path(content_path: str) -> str:
    parts = [part for part in content_path.strip("/").split("/") if part]
    if len(parts) < 4 or parts[0] != "speaking-practice":
        raise BadRequestError("Invalid speaking practice content path")
    return parts[1]


def _extract_topic_and_subtopic_from_audio_path(audio_path: str) -> tuple[str, str]:
    parts = [part for part in audio_path.strip("/").split("/") if part]
    if len(parts) < 5 or parts[0] != "speaking-practice":
        raise BadRequestError("Invalid speaking practice audio path")
    return parts[1], parts[2]


def _resolve_allowed_guest_content_paths(
    repo: SpeakingPracticeRepository,
    topic_id: str,
    limit: int = 2,
) -> set[str]:
    manifest = repo.get_manifest(topic_id)
    subtopics = manifest.get("subtopics", [])
    if not isinstance(subtopics, list):
        raise BadRequestError("Invalid manifest: subtopics must be a list")

    allowed_subtopics = _filter_guest_preview_list(subtopics, limit=limit)
    return {
        _normalize_content_path(topic_id, subtopic)
        for subtopic in allowed_subtopics
        if isinstance(subtopic, dict)
    }


def _resolve_guest_topic_access(
    repo: SpeakingPracticeRepository,
    limit: int = 2,
) -> tuple[dict[str, dict[str, Any]], bool]:
    topic_ids = repo.list_topics()
    manifests: dict[str, dict[str, Any]] = {}
    explicit_guest_preview_exists = False

    for topic_id in topic_ids:
        try:
            manifest = repo.get_manifest(topic_id)
        except Exception as e:
            logger.warning(f"[SPEAKING-PRACTICE] Could not fetch manifest for {topic_id}: {e}")
            continue

        subtopics = manifest.get("subtopics", [])
        if isinstance(subtopics, list) and any(
            isinstance(subtopic, dict) and subtopic.get("guest_preview")
            for subtopic in subtopics
        ):
            explicit_guest_preview_exists = True
        manifests[topic_id] = manifest

    guest_access: dict[str, dict[str, Any]] = {}
    for topic_id, manifest in manifests.items():
        subtopics = manifest.get("subtopics", [])
        if not isinstance(subtopics, list):
            continue

        if explicit_guest_preview_exists:
            allowed_subtopics = [
                subtopic
                for subtopic in subtopics
                if isinstance(subtopic, dict) and subtopic.get("guest_preview")
            ][:limit]
        else:
            allowed_subtopics = _filter_guest_preview_list(subtopics, limit=limit)

        if not allowed_subtopics:
            continue

        guest_access[topic_id] = {
            "manifest": {**manifest, "subtopics": allowed_subtopics},
            "content_paths": {
                _normalize_content_path(topic_id, subtopic)
                for subtopic in allowed_subtopics
                if isinstance(subtopic, dict)
            },
        }

    return guest_access, explicit_guest_preview_exists


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
        drive = get_drive_services_for_user(user_id)
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
        guest_access = None
        if _is_guest_mode():
            guest_access, _ = _resolve_guest_topic_access(repo)

        topic_ids = list(guest_access.keys()) if guest_access is not None else repo.list_topics()

        topics = []
        for topic_id in topic_ids:
            try:
                manifest = (
                    guest_access[topic_id]["manifest"]
                    if guest_access is not None
                    else repo.get_manifest(topic_id)
                )
                subtopics = manifest.get("subtopics", [])
                topics.append({
                    "id": topic_id,
                    "title": manifest.get("title", topic_id.replace("_", " ").title()),
                    "subtopics_count": len(subtopics),
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
        if _is_guest_mode():
            guest_access, _ = _resolve_guest_topic_access(repo)
            guest_entry = guest_access.get(topic_id)
            if not guest_entry:
                raise NotFoundError(f"Topic '{topic_id}' not available in guest mode")
            manifest = guest_entry["manifest"]
        else:
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
        if _is_guest_mode():
            topic_id = _extract_topic_id_from_content_path(content_path)
            guest_access, _ = _resolve_guest_topic_access(repo)
            guest_entry = guest_access.get(topic_id)
            if not guest_entry:
                raise NotFoundError("Content not available in guest mode")
            allowed_paths = guest_entry["content_paths"]
            if content_path not in allowed_paths:
                raise NotFoundError("Content not available in guest mode")
        content = repo.get_content(content_path)
        if _is_guest_mode():
            items = content.get("items", [])
            if isinstance(items, list):
                content = {**content, "items": _filter_guest_preview_list(items)}
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
        if _is_guest_mode():
            topic_id, subtopic_id = _extract_topic_and_subtopic_from_audio_path(audio_path)
            guest_access, _ = _resolve_guest_topic_access(repo)
            guest_entry = guest_access.get(topic_id)
            if not guest_entry:
                raise NotFoundError("Audio not available in guest mode")
            allowed_paths = guest_entry["content_paths"]
            content_path = f"speaking-practice/{topic_id}/{subtopic_id}/content.json"
            if content_path not in allowed_paths:
                raise NotFoundError("Audio not available in guest mode")
        audio_bytes = repo.get_audio(audio_path)
        return Response(audio_bytes, mimetype="audio/mpeg")
    
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            raise BadRequestError(f"Audio file not found at path: {audio_path}")
        raise BadRequestError(f"Failed to fetch audio: {e}")
    except Exception as e:
        raise BadRequestError(f"Failed to fetch audio: {e}")


@require_auth  # TODO: Change to @require_admin when ready
def speaking_practice_admin_mark_guest_preview(user_id: str):
    """
    POST /web/speaking-practice/admin/topics:guest-preview

    Marks the first `subtopic_count` subtopics of a topic as guest-preview and,
    for those selected subtopics, marks the first `item_count` content items as
    guest-preview. All other matching records are cleared.
    """
    del user_id  # Auth only for now

    body = request.get_json(silent=True) or {}
    topic_id = str(body.get("topic_id") or body.get("topic") or "").strip()
    subtopic_count_raw = body.get("subtopic_count", body.get("count", 2))
    item_count_raw = body.get("item_count", 2)

    if not topic_id:
        raise BadRequestError("topic_id is required")

    try:
        subtopic_count = int(subtopic_count_raw)
        item_count = int(item_count_raw)
    except (TypeError, ValueError):
        raise BadRequestError("subtopic_count and item_count must be integers")

    if subtopic_count < 0 or item_count < 0:
        raise BadRequestError("subtopic_count and item_count must be zero or greater")

    repo = SpeakingPracticeRepository(base_url=Config.NUMBERS_AUDIO_BASE_URL)
    github_mgr = GitHubContentManager(log_prefix="SPEAKING-PRACTICE-GITHUB-MANAGER")

    try:
        manifest = repo.get_manifest(topic_id)
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            raise BadRequestError(f"Topic '{topic_id}' not found")
        raise BadRequestError(f"Failed to fetch manifest: {e}")
    except Exception as e:
        raise BadRequestError(f"Failed to fetch manifest: {e}")

    subtopics = manifest.get("subtopics", [])
    if not isinstance(subtopics, list):
        raise BadRequestError("Invalid manifest: subtopics must be a list")

    selected_subtopics = [
        subtopic
        for subtopic in subtopics
        if isinstance(subtopic, dict)
    ][:subtopic_count]
    selected_subtopic_ids = {
        str(subtopic.get("id"))
        for subtopic in selected_subtopics
        if str(subtopic.get("id") or "").strip()
    }

    updated_subtopic_ids: list[str] = []
    normalized_subtopics: list[dict[str, Any]] = []
    for subtopic in subtopics:
        if not isinstance(subtopic, dict):
            normalized_subtopics.append(subtopic)
            continue
        candidate = dict(subtopic)
        subtopic_id = str(candidate.get("id") or "").strip()
        candidate["guest_preview"] = subtopic_id in selected_subtopic_ids
        if subtopic_id:
            updated_subtopic_ids.append(subtopic_id)
        normalized_subtopics.append(candidate)

    manifest["subtopics"] = normalized_subtopics
    manifest_path = f"speaking-practice/{topic_id}/manifest.json"
    manifest_result = github_mgr.create_or_update_file(
        file_path=manifest_path,
        content=json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        commit_message=f"chore: update speaking guest preview for topic {topic_id}",
    )

    updated_content_paths: list[str] = []
    selected_content_paths: list[str] = []
    content_item_counts: dict[str, int] = {}
    for subtopic in normalized_subtopics:
        if not isinstance(subtopic, dict):
            continue

        content_path = _normalize_content_path(topic_id, subtopic)
        subtopic_id = str(subtopic.get("id") or "").strip()
        if subtopic_id in selected_subtopic_ids:
            selected_content_paths.append(content_path)

        try:
            content = repo.get_content(content_path)
        except requests.HTTPError as e:
            if subtopic_id in selected_subtopic_ids and e.response.status_code == 404:
                raise BadRequestError(
                    f"Selected subtopic '{subtopic_id}' content not found at path: {content_path}"
                )
            logger.warning(
                "[SPEAKING-PRACTICE] Skipping guest preview update for %s: %s",
                content_path,
                e,
            )
            continue
        except Exception as e:
            if subtopic_id in selected_subtopic_ids:
                raise BadRequestError(f"Failed to fetch content for subtopic '{subtopic_id}': {e}")
            logger.warning(
                "[SPEAKING-PRACTICE] Skipping guest preview update for %s: %s",
                content_path,
                e,
            )
            continue

        items = content.get("items", [])
        if not isinstance(items, list):
            if subtopic_id in selected_subtopic_ids:
                raise BadRequestError(
                    f"Invalid content for subtopic '{subtopic_id}': items must be a list"
                )
            continue

        selected_item_ids = {
            str(item.get("id"))
            for item in items[:item_count]
            if isinstance(item, dict) and str(item.get("id") or "").strip()
        } if subtopic_id in selected_subtopic_ids else set()

        normalized_items: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict):
                normalized_items.append(item)
                continue
            candidate = dict(item)
            item_id = str(candidate.get("id") or "").strip()
            candidate["guest_preview"] = item_id in selected_item_ids
            normalized_items.append(candidate)

        content["items"] = normalized_items
        github_mgr.create_or_update_file(
            file_path=content_path,
            content=json.dumps(content, indent=2, ensure_ascii=False) + "\n",
            commit_message=(
                f"chore: update speaking guest preview items for {topic_id}/{subtopic_id or 'unknown'}"
            ),
        )
        updated_content_paths.append(content_path)
        if subtopic_id in selected_subtopic_ids:
            content_item_counts[content_path] = len(selected_item_ids)

    return ResponseBuilder().success(
        data={
            "topic_id": topic_id,
            "subtopic_count": subtopic_count,
            "item_count": item_count,
            "selected_subtopic_ids": list(selected_subtopic_ids),
            "updated_subtopic_ids": updated_subtopic_ids,
            "selected_content_paths": selected_content_paths,
            "updated_content_paths": updated_content_paths,
            "content_item_counts": content_item_counts,
            "manifest_github_url": manifest_result.get("content", {}).get("html_url"),
        }
    ).build()


__all__ = [
    "speaking_practice_create",
    "speaking_practice_list_topics",
    "speaking_practice_get_manifest",
    "speaking_practice_get_content",
    "speaking_practice_stream_audio",
    "speaking_practice_admin_mark_guest_preview",
]
