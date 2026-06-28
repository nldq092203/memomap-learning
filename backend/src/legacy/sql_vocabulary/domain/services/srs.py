"""Archived SQL-backed SRS service."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from src.domain.services.srs import FSRSModel, FSRSState, Grade
from src.infra.db.orm import VocabularyCardORM
from src.legacy.sql_vocabulary.domain.db_queries import VocabularyQueries


class SRSService:
    """Spaced repetition service for legacy SQL vocabulary cards."""

    def __init__(self, db: Session):
        self.db = db
        self.model = FSRSModel()

    def calculate_next_review(
        self, card: VocabularyCardORM, grade: Grade
    ) -> dict[str, Any]:
        state = FSRSState(
            stability=float(card.interval_days) if card.interval_days > 0 else 1.0,
            difficulty=card.ease / 100.0 if card.ease > 0 else 0.5,
            last_review_at=card.last_reviewed_at,
            last_interval=float(card.interval_days),
            reps=card.reps,
            lapses=card.lapses,
            last_grade=card.last_grade,
        )

        now = datetime.now(timezone.utc)
        new_state = self.model.review(state, grade, now)

        if grade == "again":
            status = "learning"
        elif card.reps == 0:
            status = "learning"
        elif new_state.stability >= 21:
            status = "review"
        else:
            status = "learning"

        due_at = now + timedelta(seconds=new_state.stability * 86400)
        streak_correct = card.streak_correct + 1 if grade in ("good", "easy") else 0

        return {
            "status": status,
            "due_at": due_at,
            "last_reviewed_at": now,
            "interval_days": int(new_state.stability),
            "ease": int(new_state.difficulty * 100),
            "reps": new_state.reps,
            "lapses": new_state.lapses,
            "streak_correct": streak_correct,
            "last_grade": grade,
        }

    def batch_review(
        self,
        reviews: list[tuple[str, Grade]],
        user_id: str,
    ) -> list[VocabularyCardORM]:
        if not reviews:
            return []

        card_ids = [card_id for card_id, _ in reviews]
        cards_by_id = VocabularyQueries.get_by_ids(self.db, card_ids, user_id)
        updated_cards = []

        for card_id, grade in reviews:
            card = cards_by_id.get(card_id)
            if not card:
                continue

            new_stats = self.calculate_next_review(card, grade)
            card.status = new_stats["status"]
            card.due_at = new_stats["due_at"]
            card.last_reviewed_at = new_stats["last_reviewed_at"]
            card.interval_days = new_stats["interval_days"]
            card.ease = new_stats["ease"]
            card.reps = new_stats["reps"]
            card.lapses = new_stats["lapses"]
            card.streak_correct = new_stats["streak_correct"]
            card.last_grade = new_stats["last_grade"]
            card.updated_at = datetime.now(timezone.utc)
            updated_cards.append(card)

        self.db.flush()
        return updated_cards
