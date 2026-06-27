"""Archived controllers for SQL-backed vocabulary flows."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from src.domain.errors import ResourceNotFoundError, ValidationError
from src.legacy.sql_vocabulary.domain.db_queries import VocabularyQueries
from src.legacy.sql_vocabulary.domain.services.srs import SRSService
from src.utils.constants import LEARNING_LANGS


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
    return {
        "items": [_vocab_card_to_dict(c) for c in cards],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_vocab_card_controller(db: Session, user_id: str, card_id: str) -> dict[str, Any]:
    card = VocabularyQueries.get_by_id(db, card_id, user_id)
    if not card:
        raise ResourceNotFoundError("Vocabulary card not found")
    return _vocab_card_to_dict(card)


def update_vocab_card_controller(
    db: Session, user_id: str, card_id: str, **updates: Any
) -> dict[str, Any]:
    card = VocabularyQueries.update_content(db, card_id, user_id, **updates)
    if not card:
        raise ResourceNotFoundError("Vocabulary card not found")
    return _vocab_card_to_dict(card)


def soft_delete_vocab_card_controller(db: Session, user_id: str, card_id: str) -> bool:
    deleted = VocabularyQueries.soft_delete(db, card_id, user_id)
    if not deleted:
        raise ResourceNotFoundError("Vocabulary card not found")
    return True


def hard_delete_vocab_card_controller(db: Session, user_id: str, card_id: str) -> bool:
    deleted = VocabularyQueries.hard_delete(db, card_id, user_id)
    if not deleted:
        raise ResourceNotFoundError("Vocabulary card not found")
    return True


def get_due_vocab_cards_controller(
    db: Session, user_id: str, language: str, limit: int = 20
) -> dict[str, Any]:
    if not language or language not in LEARNING_LANGS:
        raise ValidationError(
            f"language parameter is required and must be one of: {', '.join(LEARNING_LANGS)}"
        )

    cards = VocabularyQueries.get_due_cards(
        db=db,
        user_id=user_id,
        language=language,
        limit=limit,
    )
    return {"cards": [_vocab_card_to_dict(c) for c in cards], "count": len(cards)}


def review_vocab_cards_controller(
    db: Session, user_id: str, reviews: list[tuple[str, str]]
) -> dict[str, Any]:
    srs_service = SRSService(db)
    updated_cards = srs_service.batch_review(reviews, user_id)
    return {
        "updated_count": len(updated_cards),
        "cards": [_vocab_card_to_dict(c) for c in updated_cards],
    }


def get_vocab_stats_controller(db: Session, user_id: str, language: str) -> dict[str, Any]:
    if not language or language not in LEARNING_LANGS:
        raise ValidationError(
            f"language parameter is required and must be one of: {', '.join(LEARNING_LANGS)}"
        )

    stats = VocabularyQueries.get_stats(db, user_id, language)
    return {"language": language, **stats}


def _vocab_card_to_dict(card: Any) -> dict[str, Any]:
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
