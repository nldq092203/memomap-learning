"""
Database query helpers for Learning application.

All direct database access is encapsulated here.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select, and_
from sqlalchemy.orm import Session

from src.infra.db.orm import (
    UserORM,
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
