"""
Drive-backed services for Learning backend.

We keep Drive-based flows for:
- Audio Lessons (upload/list/stream)
- Numbers Dictation admin dataset generation (staging)

Auth model:
- Web clients authenticate with the app JWT only.
- The backend refreshes Google OAuth access tokens from the user's stored refresh token.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from src.api.errors import ForbiddenError
from src.domain.db_queries import UserQueries
from src.infra.auth.google_oauth import (
    GoogleOAuthRefreshError,
    build_google_auth_record,
    refresh_google_access_token,
)
from src.infra.db import db_session
from src.infra.drive import DriveRepository, GoogleDriveClient
from src.utils.datetime_utils import to_iso_utc


class LearningDriveServices:
    def __init__(self, repo: DriveRepository) -> None:
        self.repo = repo

    # ---------------------- Audio Lessons ----------------------

    AUTO_AUDIO_SUBFOLDER = "autoAudio"

    @staticmethod
    def _audio_root_parts() -> list[str]:
        # <MemoMap>/LearningTracker/AudioLessons/<lesson-id>/*
        return ["LearningTracker", "AudioLessons"]

    def ensure_audio_root(self) -> str:
        return self.repo.ensure_path(self._audio_root_parts())

    def save_audio_lesson(
        self,
        *,
        lesson_id: str | None,
        audio_bytes: bytes,
        audio_filename: str,
        transcript_text: str,
        language: str | None = None,
        duration_seconds: float | None = None,
        timestamps: Any | None = None,
        name: str | None = None,
        subfolder: str | None = None,
    ) -> dict[str, Any]:
        lesson_id = lesson_id or str(uuid4())
        audio_root_id = self.ensure_audio_root()
        parent_id = audio_root_id
        if subfolder:
            parent_id = self.repo._ensure_folder(subfolder, audio_root_id)
        lesson_folder_id = self.repo._ensure_folder(lesson_id, parent_id)

        # normalize filename
        original_name = audio_filename or "audio.bin"
        ext = "bin"
        base = original_name
        if "." in original_name:
            base, ext = original_name.rsplit(".", 1)
            ext = ext.lower() or "bin"
        audio_name = f"audio.{ext}"

        now = to_iso_utc(datetime.now(timezone.utc))

        transcript_doc: dict[str, Any] = {
            "id": lesson_id,
            "created_at": now,
            "updated_at": now,
            "name": name or base or lesson_id,
            "language": language,
            "duration_seconds": duration_seconds,
            "transcript": transcript_text,
            "audio_filename": audio_name,
            "audio_mime_type": "application/octet-stream",
        }
        if timestamps is not None:
            transcript_doc["timestamps"] = timestamps

        audio_file_id = self.repo.upload_file(
            parent_id=lesson_folder_id,
            name=audio_name,
            media=audio_bytes,
            mime_type="application/octet-stream",
            app_properties={
                "collection": "learning_audio",
                "type": "learning_audio_source",
                "id": f"{lesson_id}:audio",
                "name": transcript_doc["name"],
                "updatedAt": now,
                "language": language or "",
                "durationSeconds": str(duration_seconds) if duration_seconds is not None else "",
            },
        )

        transcript_result = self.repo.upsert_json(
            parent_id=lesson_folder_id,
            name="transcript.json",
            obj=transcript_doc,
            app_properties={
                "collection": "learning_audio",
                "type": "learning_audio_transcript",
                "id": f"{lesson_id}:transcript",
                "name": transcript_doc["name"],
                "updatedAt": now,
                "language": language or "",
                "durationSeconds": str(duration_seconds) if duration_seconds is not None else "",
            },
        )

        return {
            "lesson_id": lesson_id,
            "folder_id": lesson_folder_id,
            "audio_file": {"id": audio_file_id, "name": audio_name},
            "transcript_file": {"id": transcript_result.get("id"), "name": "transcript.json"},
        }

    def list_audio_lessons(
        self,
        *,
        page_size: int = 20,
        page_token: str | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        clauses = [
            "trashed = false",
            "appProperties has { key='collection' and value='learning_audio' }",
            "appProperties has { key='type' and value='learning_audio_transcript' }",
        ]
        if language:
            safe = language.replace("'", "\\'")
            clauses.append(f"appProperties has {{ key='language' and value='{safe}' }}")
        q = " and ".join(clauses)

        result = self.repo.g.drive_list(
            q=q,
            pageSize=page_size,
            pageToken=page_token,
            orderBy="modifiedTime desc",
            fields="nextPageToken, files(id,name,modifiedTime,appProperties)",
        )
        items: list[dict[str, Any]] = []
        for f in result.get("files", []) or []:
            props = f.get("appProperties", {}) or {}
            items.append(
                {
                    "id": (props.get("id") or "").replace(":transcript", ""),
                    "name": props.get("name") or f.get("name"),
                    "language": props.get("language") or None,
                    "durationSeconds": props.get("durationSeconds") or None,
                    "updatedAt": props.get("updatedAt") or f.get("modifiedTime"),
                    "transcriptFile": {"id": f.get("id"), "name": f.get("name")},
                }
            )
        return {"items": items, "nextPageToken": result.get("nextPageToken")}

    def get_audio_lesson_transcript(self, lesson_id: str) -> dict[str, Any] | None:
        audio_root_id = self.ensure_audio_root()

        # Try direct child folder first
        lesson_folder_id = self.repo._find_folder(lesson_id, audio_root_id)
        if not lesson_folder_id:
            # Then try under the autoAudio subfolder (for TTS-generated lessons)
            auto_root_id = self.repo._find_folder(self.AUTO_AUDIO_SUBFOLDER, audio_root_id)
            if auto_root_id:
                lesson_folder_id = self.repo._find_folder(lesson_id, auto_root_id)

        if not lesson_folder_id:
            return None
        return self.repo.get_json(lesson_folder_id, "transcript.json")

    def get_audio_lesson_audio_file(self, lesson_id: str) -> dict[str, Any] | None:
        audio_root_id = self.ensure_audio_root()

        # Try direct child folder first
        lesson_folder_id = self.repo._find_folder(lesson_id, audio_root_id)
        if not lesson_folder_id:
            # Then try under the autoAudio subfolder (for TTS-generated lessons)
            auto_root_id = self.repo._find_folder(self.AUTO_AUDIO_SUBFOLDER, audio_root_id)
            if auto_root_id:
                lesson_folder_id = self.repo._find_folder(lesson_id, auto_root_id)

        if not lesson_folder_id:
            return None

        file_id = self.repo.find_file_by_property(lesson_folder_id, "id", f"{lesson_id}:audio")
        if not file_id:
            # fallback: scan for "audio.*"
            listing = self.repo.list_items(parent_id=lesson_folder_id, page_size=50)
            for f in listing.get("files", []) or []:
                if isinstance(f.get("name"), str) and f["name"].startswith("audio."):
                    file_id = f["id"]
                    break
        if not file_id:
            return None
        meta = self.repo.g.drive_get(file_id, fields="id,name,mimeType,size")
        return meta

    def stream_drive_file(self, file_id: str) -> bytes:
        return self.repo.g.drive_download(file_id)

    # ---------------------- Speaking Practice ----------------------

    def save_speaking_practice_set(
        self,
        *,
        level: str,
        topic_id: str,
        content: dict[str, Any],
        audio_files: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Persist a speaking practice set to Drive.

        Layout:
        MemoMap/LearningTracker/SpeakingPractice/<level>/<topic_id>/
          - content.json
          - audio/<files>.mp3
        """
        level_slug = (level or "B2").upper()
        root_id = self.repo.ensure_path(
            ["LearningTracker", "SpeakingPractice", level_slug, topic_id]
        )

        # Write content.json at the topic root
        content_result = self.repo.upsert_json(
            parent_id=root_id,
            name="content.json",
            obj=content,
            app_properties={
                "collection": "speaking_practice",
                "topic_id": topic_id,
                "level": level_slug,
                "language": content.get("lang") or "",
            },
        )

        audio_root_id = self.repo._ensure_folder("audio", root_id)

        stored_files: list[dict[str, Any]] = []
        for entry in audio_files:
            filename = entry.get("filename")
            data = entry.get("bytes")
            if not filename or not isinstance(data, (bytes, bytearray)):
                continue

            file_id = self.repo.upload_file(
                parent_id=audio_root_id,
                name=filename,
                media=bytes(data),
                mime_type="audio/mpeg",
                app_properties={
                    "collection": "speaking_practice",
                    "topic_id": topic_id,
                    "level": level_slug,
                },
            )
            stored_files.append({"id": file_id, "name": filename})

        return {
            "topic_root_id": root_id,
            "content_file": {"id": content_result.get("id"), "name": "content.json"},
            "audio_root_id": audio_root_id,
            "audio_files": stored_files,
        }

    # ---------------------- Audio Lesson Questions ----------------------

    def save_audio_lesson_questions(
        self,
        *,
        lesson_id: str,
        questions: dict[str, Any],
        variant: str | None = None,
    ) -> dict[str, Any] | None:
        """
        Persist a questions.json file alongside transcript.json for an audio lesson.

        The function tries both:
        - <AudioLessons>/<lesson_id>/
        - <AudioLessons>/autoAudio/<lesson_id>/
        and writes questions.json into the matching folder.
        """
        audio_root_id = self.ensure_audio_root()

        # Try direct child folder first
        lesson_folder_id = self.repo._find_folder(lesson_id, audio_root_id)
        if not lesson_folder_id:
            # Then try under the autoAudio subfolder (for TTS-generated lessons)
            auto_root_id = self.repo._find_folder(self.AUTO_AUDIO_SUBFOLDER, audio_root_id)
            if auto_root_id:
                lesson_folder_id = self.repo._find_folder(lesson_id, auto_root_id)

        if not lesson_folder_id:
            return None

        # Derive filename / id suffix based on variant or meta.type
        suffix = None
        if variant:
            suffix = variant.strip().lower()
        else:
            meta = questions.get("meta") if isinstance(questions, dict) else None
            if isinstance(meta, dict):
                q_type = (meta.get("type") or "").strip().lower()
                if "compréhension_orale" in q_type or q_type == "co":
                    suffix = "co"
                elif "compréhension_écrite" in q_type or q_type == "ce":
                    suffix = "ce"

        if suffix:
            filename = f"questions_{suffix}.json"
            id_suffix = f"{lesson_id}:questions:{suffix}"
        else:
            filename = "questions.json"
            id_suffix = f"{lesson_id}:questions"

        result = self.repo.upsert_json(
            parent_id=lesson_folder_id,
            name=filename,
            obj=questions,
            app_properties={
                "collection": "learning_audio",
                "type": "learning_audio_questions",
                "id": id_suffix,
            },
        )

        return {
            "folder_id": lesson_folder_id,
            "questions_file": {"id": result.get("id"), "name": filename},
        }


def _parse_google_expiry(raw_value: str | None) -> datetime | None:
    if not raw_value:
        return None

    normalized = raw_value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def _is_google_access_token_stale(google_auth: dict[str, Any]) -> bool:
    expires_at = _parse_google_expiry(google_auth.get("access_token_expires_at"))
    if expires_at is None:
        return True
    return expires_at <= datetime.now(timezone.utc) + timedelta(seconds=60)


def _get_or_refresh_google_access_token(user_id: str) -> str:
    with db_session() as db:
        user = UserQueries.get_by_id(db, user_id)
        if not user:
            raise ForbiddenError("User not found")

        google_auth = UserQueries.get_google_auth(user)
        access_token = (google_auth.get("access_token") or "").strip()
        if access_token and not _is_google_access_token_stale(google_auth):
            return access_token

        refresh_token = (google_auth.get("refresh_token") or "").strip()
        if not refresh_token:
            raise GoogleOAuthRefreshError(
                "Google Drive session expired or invalid. Please sign in with Google again."
            )

        refreshed = refresh_google_access_token(refresh_token)
        refreshed_auth = build_google_auth_record(
            refreshed,
            existing_refresh_token=refresh_token,
        )
        UserQueries.update_google_oauth(
            db,
            user,
            google_user={
                "sub": user.extra.get("google_sub"),
                "email_verified": user.extra.get("google_email_verified"),
                "iss": user.extra.get("google_iss"),
                "aud": user.extra.get("google_aud"),
            },
            google_auth=refreshed_auth,
        )
        db.commit()
        return refreshed_auth["access_token"]


def get_drive_services_for_user(user_id: str) -> LearningDriveServices:
    """Create Drive services for the authenticated user."""
    access_token = _get_or_refresh_google_access_token(user_id)
    client = GoogleDriveClient(access_token)
    repo = DriveRepository(client)
    return LearningDriveServices(repo)


def parse_optional_json(raw: str | None) -> Any | None:
    if not raw:
        return None
    return json.loads(raw)


__all__ = ["LearningDriveServices", "get_drive_services_for_user", "parse_optional_json"]
