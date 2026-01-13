"""
Spaced Repetition System (SRS) service using FSRS algorithm.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import exp
from typing import Any, Literal

from sqlalchemy.orm import Session

from src.infra.db.orm import VocabularyCardORM
from src.domain.db_queries import VocabularyQueries


Grade = Literal["again", "hard", "good", "easy"]


class FSRSParams:
    """FSRS algorithm parameters."""

    def __init__(
        self,
        init_stability_hard: float = 1.0,
        init_stability_good: float = 2.0,
        init_stability_easy: float = 3.0,
        init_difficulty_again: float = 0.9,
        init_difficulty_hard: float = 0.7,
        init_difficulty_good: float = 0.5,
        init_difficulty_easy: float = 0.3,
        difficulty_change_fast: float = 0.25,
        difficulty_change_slow: float = 0.1,
        grow_factor_hard: float = 0.4,
        grow_factor_good: float = 1.0,
        grow_factor_easy: float = 1.3,
        lapse_factor: float = 0.5,
        min_stability: float = 0.2,
        max_stability: float = 36500.0,
        min_difficulty: float = 0.1,
        max_difficulty: float = 0.9,
    ) -> None:
        self.init_stability_hard = init_stability_hard
        self.init_stability_good = init_stability_good
        self.init_stability_easy = init_stability_easy
        self.init_difficulty_again = init_difficulty_again
        self.init_difficulty_hard = init_difficulty_hard
        self.init_difficulty_good = init_difficulty_good
        self.init_difficulty_easy = init_difficulty_easy
        self.difficulty_change_fast = difficulty_change_fast
        self.difficulty_change_slow = difficulty_change_slow
        self.grow_factor_hard = grow_factor_hard
        self.grow_factor_good = grow_factor_good
        self.grow_factor_easy = grow_factor_easy
        self.lapse_factor = lapse_factor
        self.min_stability = min_stability
        self.max_stability = max_stability
        self.min_difficulty = min_difficulty
        self.max_difficulty = max_difficulty


class FSRSState:
    """Per-card FSRS state."""

    def __init__(
        self,
        stability: float,
        difficulty: float,
        last_review_at: datetime | None,
        last_interval: float,
        reps: int,
        lapses: int,
        last_grade: Grade | None,
    ) -> None:
        self.stability = stability
        self.difficulty = difficulty
        self.last_review_at = last_review_at
        self.last_interval = last_interval
        self.reps = reps
        self.lapses = lapses
        self.last_grade = last_grade


class FSRSModel:
    """FSRS algorithm implementation."""

    def __init__(self, params: FSRSParams | None = None) -> None:
        self.params = params or FSRSParams()

    def _retrievability(self, elapsed_days: float, stability: float) -> float:
        if stability <= 0:
            return 0.0
        return exp(-elapsed_days / stability)

    def review(self, state: FSRSState, grade: Grade, now: datetime) -> FSRSState:
        p = self.params
        elapsed = 0.0
        if state.last_review_at:
            elapsed = (now - state.last_review_at).total_seconds() / 86400.0
            elapsed = max(elapsed, 0.0)

        R = self._retrievability(elapsed, state.stability)

        if state.reps == 0:
            if grade == "again":
                new_stability = p.min_stability
                new_difficulty = p.init_difficulty_again
            elif grade == "hard":
                new_stability = p.init_stability_hard
                new_difficulty = p.init_difficulty_hard
            elif grade == "good":
                new_stability = p.init_stability_good
                new_difficulty = p.init_difficulty_good
            else:
                new_stability = p.init_stability_easy
                new_difficulty = p.init_difficulty_easy
            new_reps = 1
            new_lapses = state.lapses
        else:
            if grade == "again":
                new_stability = max(state.stability * p.lapse_factor, p.min_stability)
                delta = p.difficulty_change_fast
                new_difficulty = min(state.difficulty + delta, p.max_difficulty)
                new_reps = 0
                new_lapses = state.lapses + 1
            else:
                if grade == "hard":
                    grow = p.grow_factor_hard
                    d_delta = p.difficulty_change_slow
                elif grade == "good":
                    grow = p.grow_factor_good
                    d_delta = 0.0
                else:
                    grow = p.grow_factor_easy
                    d_delta = -p.difficulty_change_slow

                base_grow = (1 - state.difficulty) * grow
                R_factor = 1.0 + (1.0 - R) * 0.5
                new_stability = state.stability * (1 + base_grow * R_factor)
                new_stability = max(p.min_stability, min(new_stability, p.max_stability))
                new_difficulty = max(p.min_difficulty, min(state.difficulty + d_delta, p.max_difficulty))
                new_reps = state.reps + 1
                new_lapses = state.lapses

        return FSRSState(
            stability=new_stability,
            difficulty=new_difficulty,
            last_review_at=now,
            last_interval=new_stability,
            reps=new_reps,
            lapses=new_lapses,
            last_grade=grade,
        )


class SRSService:
    """Spaced Repetition System service."""

    def __init__(self, db: Session):
        self.db = db
        self.model = FSRSModel()

    def calculate_next_review(self, card: VocabularyCardORM, grade: Grade) -> dict[str, Any]:
        """Calculate next review stats based on grade."""
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

        interval_seconds = new_state.stability * 86400
        due_at = now + timedelta(seconds=interval_seconds)

        if grade in ("good", "easy"):
            streak_correct = card.streak_correct + 1
        else:
            streak_correct = 0

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
        """Process a batch of card reviews."""
        updated_cards = []

        for card_id, grade in reviews:
            card = VocabularyQueries.get_by_id(self.db, card_id, user_id)
            if not card:
                continue

            new_stats = self.calculate_next_review(card, grade)
            updated_card = VocabularyQueries.update_srs(
                db=self.db,
                card_id=card_id,
                user_id=user_id,
                **new_stats,
            )

            if updated_card:
                updated_cards.append(updated_card)

        self.db.flush()
        return updated_cards

