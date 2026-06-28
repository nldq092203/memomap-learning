"""Archived controllers for SQL-backed legacy learning flows."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from src.domain.errors import ResourceNotFoundError, ValidationError
from src.legacy.sql_learning.domain.db_queries import SessionQueries, TranscriptQueries
from src.legacy.sql_learning.domain.services.analytics import AnalyticsService
from src.utils.constants import LEARNING_LANGS


def create_session_controller(
    db: Session,
    user_id: str,
    language: str,
    name: str,
    duration_seconds: int,
    tags: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    session = SessionQueries.create(
        db=db,
        user_id=user_id,
        language=language,
        name=name,
        duration_seconds=duration_seconds,
        tags=tags,
        extra=extra,
    )
    return _session_to_dict(session)


def list_sessions_controller(
    db: Session,
    user_id: str,
    language: str | None = None,
    limit: int = 20,
    offset: int = 0,
    day_filter: str | None = None,
) -> dict[str, Any]:
    if language and language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    sessions, total = SessionQueries.list_by_user(
        db=db,
        user_id=user_id,
        language=language,
        limit=limit,
        offset=offset,
        day_filter=day_filter,
    )
    return {
        "items": [_session_to_dict(s) for s in sessions],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_session_controller(
    db: Session, user_id: str, session_id: str
) -> dict[str, Any]:
    session = SessionQueries.get_by_id(db, session_id, user_id)
    if not session:
        raise ResourceNotFoundError("Session not found")
    return _session_to_dict(session)


def create_transcript_controller(
    db: Session,
    user_id: str,
    language: str,
    source_url: str | None = None,
    transcript: str | None = None,
    notes: list[str] | None = None,
    tags: list[str] | None = None,
    lesson_audio_folder_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    transcript_obj = TranscriptQueries.create(
        db=db,
        user_id=user_id,
        language=language,
        source_url=source_url,
        transcript=transcript,
        notes=notes,
        tags=tags,
        lesson_audio_folder_id=lesson_audio_folder_id,
        extra=extra,
    )
    return _transcript_to_dict(transcript_obj)


def list_transcripts_controller(
    db: Session,
    user_id: str,
    language: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    if language and language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    transcripts, total = TranscriptQueries.list_by_user(
        db=db, user_id=user_id, language=language, limit=limit, offset=offset
    )
    return {
        "items": [_transcript_to_dict(t) for t in transcripts],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_transcript_controller(
    db: Session, user_id: str, transcript_id: str
) -> dict[str, Any]:
    transcript = TranscriptQueries.get_by_id(db, transcript_id, user_id)
    if not transcript:
        raise ResourceNotFoundError("Transcript not found")
    return _transcript_to_dict(transcript)


def update_transcript_controller(
    db: Session, user_id: str, transcript_id: str, **updates: Any
) -> dict[str, Any]:
    transcript = TranscriptQueries.update(db, transcript_id, user_id, **updates)
    if not transcript:
        raise ResourceNotFoundError("Transcript not found")
    return _transcript_to_dict(transcript)


def delete_transcript_controller(db: Session, user_id: str, transcript_id: str) -> bool:
    deleted = TranscriptQueries.delete(db, transcript_id, user_id)
    if not deleted:
        raise ResourceNotFoundError("Transcript not found")
    return True


def get_analytics_summary_controller(
    db: Session, user_id: str, language: str | None = None, days: int = 30
) -> dict[str, Any]:
    if language and language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    if days < 1 or days > 365:
        raise ValidationError("days must be between 1 and 365")

    service = AnalyticsService(db)
    return service.get_learning_summary(user_id=user_id, language=language, days=days)


def _session_to_dict(session: Any) -> dict[str, Any]:
    return {
        "id": session.id,
        "user_id": session.user_id,
        "language": session.language,
        "name": session.name,
        "duration_seconds": session.duration_seconds,
        "tags": session.tags,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "extra": session.extra,
    }


def _transcript_to_dict(transcript: Any) -> dict[str, Any]:
    return {
        "id": transcript.id,
        "user_id": transcript.user_id,
        "language": transcript.language,
        "source_url": transcript.source_url,
        "lesson_audio_folder_id": transcript.lesson_audio_folder_id,
        "transcript": transcript.transcript,
        "notes": transcript.notes,
        "tags": transcript.tags,
        "created_at": transcript.created_at,
        "updated_at": transcript.updated_at,
        "extra": transcript.extra,
    }
