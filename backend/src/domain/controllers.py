"""
Business logic controllers for Learning API.

Controllers orchestrate operations between queries and services.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from src.domain.db_queries import (
    SessionQueries,
    TranscriptQueries,
    VocabularyQueries,
)
from src.domain.errors import ResourceNotFoundError, ValidationError
from src.domain.services.analytics import AnalyticsService
from src.domain.services.srs import SRSService
from src.utils.constants import LEARNING_LANGS

# ==================== Sessions Controllers ====================


def create_session_controller(
    db: Session,
    user_id: str,
    language: str,
    name: str,
    duration_seconds: int,
    tags: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a new learning session."""
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
    """List sessions with pagination."""
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

    items = [_session_to_dict(s) for s in sessions]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def get_session_controller(db: Session, user_id: str, session_id: str) -> dict[str, Any]:
    """Get session by ID."""
    session = SessionQueries.get_by_id(db, session_id, user_id)
    if not session:
        raise ResourceNotFoundError("Session not found")
    return _session_to_dict(session)


# ==================== Transcripts Controllers ====================


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
    """Create a new transcript."""
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
    """List transcripts with pagination."""
    if language and language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    transcripts, total = TranscriptQueries.list_by_user(
        db=db, user_id=user_id, language=language, limit=limit, offset=offset
    )

    items = [_transcript_to_dict(t) for t in transcripts]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def get_transcript_controller(db: Session, user_id: str, transcript_id: str) -> dict[str, Any]:
    """Get transcript by ID."""
    transcript = TranscriptQueries.get_by_id(db, transcript_id, user_id)
    if not transcript:
        raise ResourceNotFoundError("Transcript not found")
    return _transcript_to_dict(transcript)


def update_transcript_controller(
    db: Session, user_id: str, transcript_id: str, **updates
) -> dict[str, Any]:
    """Update transcript."""
    transcript = TranscriptQueries.update(db, transcript_id, user_id, **updates)
    if not transcript:
        raise ResourceNotFoundError("Transcript not found")
    return _transcript_to_dict(transcript)


def delete_transcript_controller(db: Session, user_id: str, transcript_id: str) -> bool:
    """Delete transcript."""
    deleted = TranscriptQueries.delete(db, transcript_id, user_id)
    if not deleted:
        raise ResourceNotFoundError("Transcript not found")
    return True


# ==================== Vocabulary Controllers ====================


def create_vocab_card_controller(
    db: Session,
    user_id: str,
    language: str,
    word: str,
    translation: str | None = None,
    notes: list[str] | None = None,
    tags: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a new vocabulary card."""
    if language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    card = VocabularyQueries.create(
        db=db,
        user_id=user_id,
        language=language,
        word=word,
        translation=translation,
        notes=notes,
        tags=tags,
        extra=extra,
    )

    return _vocab_card_to_dict(card)


def list_vocab_cards_controller(
    db: Session,
    user_id: str,
    language: str | None = None,
    limit: int = 50,
    offset: int = 0,
    search_query: str | None = None,
) -> dict[str, Any]:
    """List vocabulary cards with pagination and search."""
    if language and language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    cards, total = VocabularyQueries.list_by_user(
        db=db,
        user_id=user_id,
        language=language,
        limit=limit,
        offset=offset,
        search_query=search_query,
    )

    items = [_vocab_card_to_dict(c) for c in cards]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def get_vocab_card_controller(db: Session, user_id: str, card_id: str) -> dict[str, Any]:
    """Get vocabulary card by ID."""
    card = VocabularyQueries.get_by_id(db, card_id, user_id)
    if not card:
        raise ResourceNotFoundError("Vocabulary card not found")
    return _vocab_card_to_dict(card)


def update_vocab_card_controller(
    db: Session, user_id: str, card_id: str, **updates
) -> dict[str, Any]:
    """Update vocabulary card (content only)."""
    card = VocabularyQueries.update_content(db, card_id, user_id, **updates)
    if not card:
        raise ResourceNotFoundError("Vocabulary card not found")
    return _vocab_card_to_dict(card)


def soft_delete_vocab_card_controller(db: Session, user_id: str, card_id: str) -> bool:
    """Soft delete vocabulary card."""
    deleted = VocabularyQueries.soft_delete(db, card_id, user_id)
    if not deleted:
        raise ResourceNotFoundError("Vocabulary card not found")
    return True


def hard_delete_vocab_card_controller(db: Session, user_id: str, card_id: str) -> bool:
    """Hard delete vocabulary card."""
    deleted = VocabularyQueries.hard_delete(db, card_id, user_id)
    if not deleted:
        raise ResourceNotFoundError("Vocabulary card not found")
    return True


def get_due_vocab_cards_controller(
    db: Session, user_id: str, language: str, limit: int = 20
) -> dict[str, Any]:
    """Get vocabulary cards due for review."""
    if not language or language not in LEARNING_LANGS:
        raise ValidationError(
            f"language parameter is required and must be one of: {', '.join(LEARNING_LANGS)}"
        )

    cards = VocabularyQueries.get_due_cards(db=db, user_id=user_id, language=language, limit=limit)

    return {
        "cards": [_vocab_card_to_dict(c) for c in cards],
        "count": len(cards),
    }


def review_vocab_cards_controller(
    db: Session, user_id: str, reviews: list[tuple[str, str]]
) -> dict[str, Any]:
    """Process batch of card reviews."""
    srs_service = SRSService(db)
    updated_cards = srs_service.batch_review(reviews, user_id)

    return {
        "updated_count": len(updated_cards),
        "cards": [_vocab_card_to_dict(c) for c in updated_cards],
    }


def get_vocab_stats_controller(db: Session, user_id: str, language: str) -> dict[str, Any]:
    """Get vocabulary statistics."""
    if not language or language not in LEARNING_LANGS:
        raise ValidationError(
            f"language parameter is required and must be one of: {', '.join(LEARNING_LANGS)}"
        )

    stats = VocabularyQueries.get_stats(db, user_id, language)
    return {"language": language, **stats}


# ==================== Analytics Controllers ====================


def get_analytics_summary_controller(
    db: Session, user_id: str, language: str | None = None, days: int = 30
) -> dict[str, Any]:
    """Get learning analytics summary."""
    if language and language not in LEARNING_LANGS:
        raise ValidationError(f"language must be one of: {', '.join(LEARNING_LANGS)}")

    if days < 1 or days > 365:
        raise ValidationError("days must be between 1 and 365")

    service = AnalyticsService(db)
    return service.get_learning_summary(user_id=user_id, language=language, days=days)


# ==================== Helper Functions ====================


def _session_to_dict(session) -> dict[str, Any]:
    """Convert session ORM to dict."""
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


def _transcript_to_dict(transcript) -> dict[str, Any]:
    """Convert transcript ORM to dict."""
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


def _vocab_card_to_dict(card) -> dict[str, Any]:
    """Convert vocabulary card ORM to dict."""
    return {
        "id": card.id,
        "user_id": card.user_id,
        "language": card.language,
        "word": card.word,
        "translation": card.translation,
        "notes": card.notes,
        "tags": card.tags,
        "status": card.status,
        "due_at": card.due_at,
        "last_reviewed_at": card.last_reviewed_at,
        "interval_days": card.interval_days,
        "ease": card.ease,
        "reps": card.reps,
        "lapses": card.lapses,
        "streak_correct": card.streak_correct,
        "last_grade": card.last_grade,
        "created_at": card.created_at,
        "updated_at": card.updated_at,
        "extra": card.extra,
    }

