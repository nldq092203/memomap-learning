"""
Drive-backed services for Learning backend.

We keep Drive-based flows for:
- Audio Lessons (upload/list/stream)
- Numbers Dictation admin dataset generation (staging)

Auth model:
- Callers must supply a Google OAuth access token when invoking Drive-backed endpoints.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from flask import request

from src.infra.drive import DriveRepository, GoogleDriveClient
from src.utils.datetime_utils import to_iso_utc


class LearningDriveServices:
    def __init__(self, repo: DriveRepository) -> None:
        self.repo = repo

    # ---------------------- Audio Lessons ----------------------

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
    ) -> dict[str, Any]:
        lesson_id = lesson_id or str(uuid4())
        audio_root_id = self.ensure_audio_root()
        lesson_folder_id = self.repo._ensure_folder(lesson_id, audio_root_id)

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
        lesson_folder_id = self.repo._find_folder(lesson_id, audio_root_id)
        if not lesson_folder_id:
            return None
        return self.repo.get_json(lesson_folder_id, "transcript.json")

    def get_audio_lesson_audio_file(self, lesson_id: str) -> dict[str, Any] | None:
        audio_root_id = self.ensure_audio_root()
        lesson_folder_id = self.repo._find_folder(lesson_id, audio_root_id)
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


def get_drive_services_from_request() -> LearningDriveServices:
    """
    Create Drive services for the current request.

    Requires:
    - Header: X-Google-Access-Token
    """
    access_token = (request.headers.get("X-Google-Access-Token") or "").strip()
    if not access_token:
        raise ValueError("X-Google-Access-Token header is required for Drive operations")
    client = GoogleDriveClient(access_token)
    repo = DriveRepository(client)
    return LearningDriveServices(repo)


def parse_optional_json(raw: str | None) -> Any | None:
    if not raw:
        return None
    return json.loads(raw)


__all__ = ["LearningDriveServices", "get_drive_services_from_request", "parse_optional_json"]


