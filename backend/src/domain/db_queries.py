"""
Database query helpers for Learning application.

All direct database access is encapsulated here.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select, and_, or_
from sqlalchemy.orm import Session

from src.infra.db.orm import (
    UserORM,
    VocabularyCardORM,
    UserExerciseProgressORM,
)

from src.extensions import logger


class UserQueries:
    """Database queries for users."""

    @staticmethod
    def get_by_email(db: Session, email: str) -> UserORM | None:
        stmt = select(UserORM).where(UserORM.email == email)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_by_id(db: Session, user_id: str) -> UserORM | None:
        """
        Get user by ID.
        """
        stmt = select(UserORM).where(UserORM.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create(db: Session, email: str, extra: dict[str, Any] | None = None) -> UserORM:
        user = UserORM(id=str(uuid4()), email=email, extra=extra or {})
        db.add(user)
        db.flush()
        return user

    @staticmethod
    def update_google_identity(
        db: Session,
        user: UserORM,
        *,
        google_user: dict[str, Any],
    ) -> UserORM:
        extra = dict(user.extra or {})
        extra.update(
            {
                "google_sub": google_user.get("sub"),
                "google_email_verified": google_user.get("email_verified"),
                "google_iss": google_user.get("iss"),
                "google_aud": google_user.get("aud"),
            }
        )
        user.extra = extra
        user.updated_at = datetime.now(timezone.utc)
        db.flush()
        return user


class VocabularyQueries:
    """Database queries for vocabulary cards."""

    @staticmethod
    def create(
        db: Session,
        user_id: str,
        language: str,
        word: str,
        translation: str | None = None,
        notes: list[str] | None = None,
        tags: list[str] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> VocabularyCardORM:
        card = VocabularyCardORM(
            id=str(uuid4()),
            user_id=user_id,
            language=language,
            word=word,
            translation=translation,
            notes=notes or [],
            tags=tags or [],
            status="new",
            due_at=datetime.now(timezone.utc),
            interval_days=0,
            ease=250,
            reps=0,
            lapses=0,
            streak_correct=0,
            extra=extra or {},
        )
        db.add(card)
        db.flush()
        return card

    @staticmethod
    def get_by_id(db: Session, card_id: str, user_id: str) -> VocabularyCardORM | None:
        stmt = select(VocabularyCardORM).where(
            and_(
                VocabularyCardORM.id == card_id,
                VocabularyCardORM.user_id == user_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_by_ids(
        db: Session,
        card_ids: list[str],
        user_id: str,
    ) -> dict[str, VocabularyCardORM]:
        """Get multiple cards by IDs in a single query, returning a dict keyed by card_id."""
        if not card_ids:
            return {}

        stmt = select(VocabularyCardORM).where(
            and_(
                VocabularyCardORM.id.in_(card_ids),
                VocabularyCardORM.user_id == user_id,
            )
        )
        cards = db.execute(stmt).scalars().all()
        return {card.id: card for card in cards}

    @staticmethod
    def list_by_user(
        db: Session,
        user_id: str,
        language: str | None = None,
        limit: int = 50,
        offset: int = 0,
        search_query: str | None = None,
    ) -> tuple[list[VocabularyCardORM], int]:
        conditions = [VocabularyCardORM.user_id == user_id]

        if language:
            conditions.append(VocabularyCardORM.language == language)

        if search_query:
            search_pattern = f"%{search_query}%"
            conditions.append(
                or_(
                    VocabularyCardORM.word.ilike(search_pattern),
                    VocabularyCardORM.translation.ilike(search_pattern),
                )
            )

        count_stmt = (
            select(func.count()).select_from(VocabularyCardORM).where(and_(*conditions))
        )
        total = db.execute(count_stmt).scalar_one()

        stmt = (
            select(VocabularyCardORM)
            .where(and_(*conditions))
            .order_by(VocabularyCardORM.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        cards = list(db.execute(stmt).scalars().all())

        return cards, total

    @staticmethod
    def get_due_cards(
        db: Session,
        user_id: str,
        language: str | None = None,
        limit: int = 20,
    ) -> list[VocabularyCardORM]:
        conditions = [
            VocabularyCardORM.user_id == user_id,
            VocabularyCardORM.status.in_(["new", "learning", "review"]),
            or_(
                VocabularyCardORM.due_at.is_(None),
                VocabularyCardORM.due_at <= datetime.now(timezone.utc),
            ),
        ]

        if language:
            conditions.append(VocabularyCardORM.language == language)

        stmt = (
            select(VocabularyCardORM)
            .where(and_(*conditions))
            .order_by(VocabularyCardORM.due_at.asc().nullsfirst())
            .limit(limit)
        )

        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def update_content(
        db: Session, card_id: str, user_id: str, **updates
    ) -> VocabularyCardORM | None:
        card = VocabularyQueries.get_by_id(db, card_id, user_id)
        if not card:
            return None

        allowed_fields = ["word", "translation", "notes", "tags", "extra"]
        for field, value in updates.items():
            if field in allowed_fields and value is not None:
                setattr(card, field, value)

        card.updated_at = datetime.now(timezone.utc)
        db.flush()
        return card

    @staticmethod
    def update_srs(
        db: Session,
        card_id: str,
        user_id: str,
        status: str,
        due_at: datetime | None,
        last_reviewed_at: datetime | None,
        interval_days: int,
        ease: int,
        reps: int,
        lapses: int,
        streak_correct: int,
        last_grade: str | None,
    ) -> VocabularyCardORM | None:
        card = VocabularyQueries.get_by_id(db, card_id, user_id)
        if not card:
            return None

        card.status = status
        card.due_at = due_at
        card.last_reviewed_at = last_reviewed_at
        card.interval_days = interval_days
        card.ease = ease
        card.reps = reps
        card.lapses = lapses
        card.streak_correct = streak_correct
        card.last_grade = last_grade
        card.updated_at = datetime.now(timezone.utc)

        db.flush()
        return card

    @staticmethod
    def soft_delete(db: Session, card_id: str, user_id: str) -> bool:
        card = VocabularyQueries.get_by_id(db, card_id, user_id)
        if not card:
            return False
        card.status = "suspended"
        card.updated_at = datetime.now(timezone.utc)
        db.flush()
        return True

    @staticmethod
    def hard_delete(db: Session, card_id: str, user_id: str) -> bool:
        card = VocabularyQueries.get_by_id(db, card_id, user_id)
        if not card:
            return False
        db.delete(card)
        db.flush()
        return True

    @staticmethod
    def get_stats(
        db: Session, user_id: str, language: str | None = None
    ) -> dict[str, Any]:
        conditions = [VocabularyCardORM.user_id == user_id]
        if language:
            conditions.append(VocabularyCardORM.language == language)

        total_stmt = (
            select(func.count()).select_from(VocabularyCardORM).where(and_(*conditions))
        )
        total = db.execute(total_stmt).scalar_one()

        status_stmt = (
            select(VocabularyCardORM.status, func.count().label("count"))
            .where(and_(*conditions))
            .group_by(VocabularyCardORM.status)
        )
        status_counts = {row.status: row.count for row in db.execute(status_stmt).all()}

        due_conditions = conditions + [
            VocabularyCardORM.status.in_(["new", "learning", "review"]),
            or_(
                VocabularyCardORM.due_at.is_(None),
                VocabularyCardORM.due_at <= datetime.now(timezone.utc),
            ),
        ]
        due_stmt = (
            select(func.count())
            .select_from(VocabularyCardORM)
            .where(and_(*due_conditions))
        )
        due_today = db.execute(due_stmt).scalar_one()

        overdue_date = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        overdue_conditions = conditions + [
            VocabularyCardORM.status.in_(["learning", "review"]),
            VocabularyCardORM.due_at < overdue_date,
        ]
        overdue_stmt = (
            select(func.count())
            .select_from(VocabularyCardORM)
            .where(and_(*overdue_conditions))
        )
        overdue = db.execute(overdue_stmt).scalar_one()

        return {
            "total": total,
            "new": status_counts.get("new", 0),
            "learning": status_counts.get("learning", 0),
            "review": status_counts.get("review", 0),
            "suspended": status_counts.get("suspended", 0),
            "due_today": due_today,
            "overdue": overdue,
        }


class ExerciseProgressQueries:
    """Database queries for per-user exercise progress."""

    @staticmethod
    def get_by_exercise(
        db: Session,
        user_id: str,
        exercise_id: str,
    ) -> UserExerciseProgressORM | None:
        stmt = select(UserExerciseProgressORM).where(
            and_(
                UserExerciseProgressORM.user_id == user_id,
                UserExerciseProgressORM.exercise_id == exercise_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_many_by_exercise_ids(
        db: Session,
        user_id: str,
        exercise_ids: list[str],
    ) -> list[UserExerciseProgressORM]:
        if not exercise_ids:
            return []

        stmt = select(UserExerciseProgressORM).where(
            and_(
                UserExerciseProgressORM.user_id == user_id,
                UserExerciseProgressORM.exercise_id.in_(exercise_ids),
            )
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def upsert(
        db: Session,
        user_id: str,
        exercise_id: str,
        *,
        section: str,
        source_type: str,
        level: str | None = None,
        status: str | None = None,
        score: float | None = None,
        accuracy: float | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
        last_opened_at: datetime | None = None,
        attempts_count: int | None = None,
        saved_vocab_count: int | None = None,
        answers_snapshot: Any | None = None,
        extra: dict[str, Any] | None = None,
    ) -> UserExerciseProgressORM:
        progress = ExerciseProgressQueries.get_by_exercise(db, user_id, exercise_id)
        now = datetime.now(timezone.utc)

        if not progress:
            progress = UserExerciseProgressORM(
                id=str(uuid4()),
                user_id=user_id,
                exercise_id=exercise_id,
                section=section,
                source_type=source_type,
                level=level,
                status=status or "not_started",
                score=score,
                accuracy=accuracy,
                started_at=started_at,
                completed_at=completed_at,
                last_opened_at=last_opened_at or now,
                attempts_count=attempts_count if attempts_count is not None else 0,
                saved_vocab_count=(
                    saved_vocab_count if saved_vocab_count is not None else 0
                ),
                answers_snapshot=answers_snapshot,
                extra=extra or {},
            )
            db.add(progress)
            db.flush()
            return progress

        progress.section = section
        progress.source_type = source_type
        progress.level = level
        if status is not None:
            progress.status = status
        if score is not None:
            progress.score = score
        if accuracy is not None:
            progress.accuracy = accuracy
        if started_at is not None:
            progress.started_at = started_at
        if completed_at is not None:
            progress.completed_at = completed_at
        if last_opened_at is not None:
            progress.last_opened_at = last_opened_at
        if attempts_count is not None:
            progress.attempts_count = attempts_count
        if saved_vocab_count is not None:
            progress.saved_vocab_count = saved_vocab_count
        if answers_snapshot is not None:
            progress.answers_snapshot = answers_snapshot
        if extra is not None:
            progress.extra = extra
        progress.updated_at = now
        db.flush()
        return progress

    @staticmethod
    def list_by_user(
        db: Session,
        user_id: str,
        *,
        status: str | None = None,
        section: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[UserExerciseProgressORM], int]:
        conditions = [UserExerciseProgressORM.user_id == user_id]
        if status:
            conditions.append(UserExerciseProgressORM.status == status)
        if section:
            conditions.append(UserExerciseProgressORM.section == section)

        count_stmt = (
            select(func.count())
            .select_from(UserExerciseProgressORM)
            .where(and_(*conditions))
        )
        total = db.execute(count_stmt).scalar_one()

        stmt = (
            select(UserExerciseProgressORM)
            .where(and_(*conditions))
            .order_by(UserExerciseProgressORM.last_opened_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = list(db.execute(stmt).scalars().all())
        return items, total

    @staticmethod
    def summary_by_user(db: Session, user_id: str) -> dict[str, Any]:
        status_stmt = (
            select(UserExerciseProgressORM.status, func.count())
            .where(UserExerciseProgressORM.user_id == user_id)
            .group_by(UserExerciseProgressORM.status)
        )
        section_stmt = (
            select(
                UserExerciseProgressORM.section,
                UserExerciseProgressORM.status,
                func.count(),
            )
            .where(UserExerciseProgressORM.user_id == user_id)
            .group_by(UserExerciseProgressORM.section, UserExerciseProgressORM.status)
        )

        by_status = {status: count for status, count in db.execute(status_stmt).all()}
        by_section: dict[str, dict[str, int]] = {}
        for section, status, count in db.execute(section_stmt).all():
            by_section.setdefault(section, {})[status] = count

        return {
            "by_status": by_status,
            "by_section": by_section,
        }
