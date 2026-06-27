"""
Business logic controllers for Learning API.

Controllers orchestrate operations between queries and services.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from src.domain.db_queries import (
    VocabularyQueries,
    ExerciseProgressQueries,
)
from src.domain.errors import ResourceNotFoundError, ValidationError
from src.domain.services.exercise_catalog import CatalogFilters, ExerciseCatalogService
from src.domain.services.srs import SRSService
from src.utils.constants import LEARNING_LANGS

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


# ==================== Exercise Progress Controllers ====================

PROGRESS_SECTIONS = {"CO", "CE", "PO", "PE"}
PROGRESS_SOURCE_TYPES = {
    "numbers",
    "video_podcast",
    "delf_book",
    "oral_prompt",
    "writing_prompt",
}
PROGRESS_STATUSES = {
    "not_started",
    "in_progress",
    "completed",
    "retry_suggested",
}
PROGRESS_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}


def update_exercise_progress_controller(
    db: Session,
    user_id: str,
    exercise_id: str,
    section: str,
    source_type: str,
    event: str = "opened",
    level: str | None = None,
    status: str | None = None,
    score: float | None = None,
    accuracy: float | None = None,
    saved_vocab_count: int | None = None,
    answers_snapshot: Any | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create or update user progress for one exercise."""
    section = section.upper()
    if section not in PROGRESS_SECTIONS:
        raise ValidationError("section must be one of: CO, CE, PO, PE")
    if source_type not in PROGRESS_SOURCE_TYPES:
        raise ValidationError(
            "source_type must be one of: "
            + ", ".join(sorted(PROGRESS_SOURCE_TYPES))
        )
    if level is not None:
        level = level.upper()
        if level not in PROGRESS_LEVELS:
            raise ValidationError("level must be one of: A1, A2, B1, B2, C1, C2")
    if status is not None and status not in PROGRESS_STATUSES:
        raise ValidationError(
            "status must be one of: " + ", ".join(sorted(PROGRESS_STATUSES))
        )
    if event not in {"opened", "started", "completed", "retried", "updated"}:
        raise ValidationError(
            "event must be one of: opened, started, completed, retried, updated"
        )

    existing = ExerciseProgressQueries.get_by_exercise(db, user_id, exercise_id)
    now = datetime.now(timezone.utc)

    next_status = status
    started_at = None
    completed_at = None
    attempts_count = None

    if event == "opened":
        if not existing:
            next_status = status or "not_started"
        elif existing.status == "not_started" and status is None:
            next_status = "in_progress"
    elif event == "started":
        next_status = status or "in_progress"
        started_at = existing.started_at if existing and existing.started_at else now
    elif event == "completed":
        next_status = status or "completed"
        started_at = existing.started_at if existing and existing.started_at else now
        completed_at = now
        attempts_count = (existing.attempts_count if existing else 0) + 1
    elif event == "retried":
        next_status = status or "in_progress"
        started_at = now
        completed_at = None
    elif event == "updated":
        next_status = status

    progress = ExerciseProgressQueries.upsert(
        db,
        user_id,
        exercise_id,
        section=section,
        source_type=source_type,
        level=level,
        status=next_status,
        score=score,
        accuracy=accuracy,
        started_at=started_at,
        completed_at=completed_at,
        last_opened_at=now,
        attempts_count=attempts_count,
        saved_vocab_count=saved_vocab_count,
        answers_snapshot=answers_snapshot,
        extra=extra,
    )
    return _exercise_progress_to_dict(progress)


def get_exercise_progress_controller(
    db: Session,
    user_id: str,
    exercise_id: str,
) -> dict[str, Any]:
    """Get one progress record for the current user."""
    progress = ExerciseProgressQueries.get_by_exercise(db, user_id, exercise_id)
    if not progress:
        raise ResourceNotFoundError("Exercise progress not found")
    return _exercise_progress_to_dict(progress)


def list_exercise_progress_controller(
    db: Session,
    user_id: str,
    status: str | None = None,
    section: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    """List progress records for the current user."""
    if status and status not in PROGRESS_STATUSES:
        raise ValidationError(
            "status must be one of: " + ", ".join(sorted(PROGRESS_STATUSES))
        )
    if section:
        section = section.upper()
        if section not in PROGRESS_SECTIONS:
            raise ValidationError("section must be one of: CO, CE, PO, PE")

    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    items, total = ExerciseProgressQueries.list_by_user(
        db,
        user_id,
        status=status,
        section=section,
        limit=limit,
        offset=offset,
    )
    return {
        "items": [_exercise_progress_to_dict(item) for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_exercise_progress_summary_controller(
    db: Session,
    user_id: str,
) -> dict[str, Any]:
    """Get lightweight progress counts for the current user."""
    return ExerciseProgressQueries.summary_by_user(db, user_id)


# ==================== Exercise Catalog Controllers ====================


def list_exercise_catalog_controller(
    db: Session,
    user_id: str,
    section: str | None = None,
    level: str | None = None,
    source_type: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    """Return normalized catalog items with current-user progress."""
    try:
        return ExerciseCatalogService().list_catalog(
            db=db,
            user_id=user_id,
            filters=CatalogFilters(
                section=section,
                level=level,
                source_type=source_type,
                status=status,
                limit=limit,
                offset=offset,
            ),
        )
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


# ==================== Helper Functions ====================


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


def _exercise_progress_to_dict(progress) -> dict[str, Any]:
    """Convert exercise progress ORM to dict."""
    return {
        "id": progress.id,
        "user_id": progress.user_id,
        "exercise_id": progress.exercise_id,
        "section": progress.section,
        "source_type": progress.source_type,
        "level": progress.level,
        "status": progress.status,
        "score": progress.score,
        "accuracy": progress.accuracy,
        "started_at": progress.started_at,
        "completed_at": progress.completed_at,
        "last_opened_at": progress.last_opened_at,
        "attempts_count": progress.attempts_count,
        "saved_vocab_count": progress.saved_vocab_count,
        "answers_snapshot": progress.answers_snapshot,
        "created_at": progress.created_at,
        "updated_at": progress.updated_at,
        "extra": progress.extra,
    }
