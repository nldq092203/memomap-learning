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
    LearningSessionORM,
    LearningTranscriptORM,
    VocabularyCardORM,
)


class UserQueries:
    """Database queries for users."""

    @staticmethod
    def get_by_email(db: Session, email: str) -> UserORM | None:
        stmt = select(UserORM).where(UserORM.email == email)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_by_id(db: Session, user_id: str) -> UserORM | None:
        stmt = select(UserORM).where(UserORM.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create(db: Session, email: str, extra: dict[str, Any] | None = None) -> UserORM:
        user = UserORM(id=str(uuid4()), email=email, extra=extra or {})
        db.add(user)
        db.flush()
        return user


class SessionQueries:
    """Database queries for learning sessions."""

    @staticmethod
    def create(
        db: Session,
        user_id: str,
        language: str,
        name: str,
        duration_seconds: int,
        tags: list[str] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> LearningSessionORM:
        session = LearningSessionORM(
            id=str(uuid4()),
            user_id=user_id,
            language=language,
            name=name,
            duration_seconds=duration_seconds,
            tags=tags or [],
            extra=extra or {},
        )
        db.add(session)
        db.flush()
        return session

    @staticmethod
    def get_by_id(db: Session, session_id: str, user_id: str) -> LearningSessionORM | None:
        stmt = select(LearningSessionORM).where(
            and_(
                LearningSessionORM.id == session_id,
                LearningSessionORM.user_id == user_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def list_by_user(
        db: Session,
        user_id: str,
        language: str | None = None,
        limit: int = 20,
        offset: int = 0,
        day_filter: str | None = None,
    ) -> tuple[list[LearningSessionORM], int]:
        conditions = [LearningSessionORM.user_id == user_id]

        if language:
            conditions.append(LearningSessionORM.language == language)

        if day_filter:
            try:
                filter_date = datetime.strptime(day_filter, "%Y-%m-%d").date()
                conditions.append(func.date(LearningSessionORM.created_at) == filter_date)
            except ValueError:
                pass

        count_stmt = (
            select(func.count())
            .select_from(LearningSessionORM)
            .where(and_(*conditions))
        )
        total = db.execute(count_stmt).scalar_one()

        stmt = (
            select(LearningSessionORM)
            .where(and_(*conditions))
            .order_by(LearningSessionORM.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        sessions = list(db.execute(stmt).scalars().all())

        return sessions, total


class TranscriptQueries:
    """Database queries for transcripts."""

    @staticmethod
    def create(
        db: Session,
        user_id: str,
        language: str,
        source_url: str | None = None,
        transcript: str | None = None,
        notes: list[str] | None = None,
        tags: list[str] | None = None,
        lesson_audio_folder_id: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> LearningTranscriptORM:
        obj = LearningTranscriptORM(
            id=str(uuid4()),
            user_id=user_id,
            language=language,
            source_url=source_url,
            lesson_audio_folder_id=lesson_audio_folder_id,
            transcript=transcript,
            notes=notes or [],
            tags=tags or [],
            extra=extra or {},
        )
        db.add(obj)
        db.flush()
        return obj

    @staticmethod
    def get_by_id(db: Session, transcript_id: str, user_id: str) -> LearningTranscriptORM | None:
        stmt = select(LearningTranscriptORM).where(
            and_(
                LearningTranscriptORM.id == transcript_id,
                LearningTranscriptORM.user_id == user_id,
            )
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def list_by_user(
        db: Session,
        user_id: str,
        language: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[LearningTranscriptORM], int]:
        conditions = [LearningTranscriptORM.user_id == user_id]
        if language:
            conditions.append(LearningTranscriptORM.language == language)

        count_stmt = (
            select(func.count())
            .select_from(LearningTranscriptORM)
            .where(and_(*conditions))
        )
        total = db.execute(count_stmt).scalar_one()

        stmt = (
            select(LearningTranscriptORM)
            .where(and_(*conditions))
            .order_by(LearningTranscriptORM.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        transcripts = list(db.execute(stmt).scalars().all())

        return transcripts, total

    @staticmethod
    def update(db: Session, transcript_id: str, user_id: str, **updates) -> LearningTranscriptORM | None:
        transcript = TranscriptQueries.get_by_id(db, transcript_id, user_id)
        if not transcript:
            return None

        allowed_fields = ["source_url", "lesson_audio_folder_id", "transcript", "notes", "tags", "extra"]
        for field, value in updates.items():
            if field in allowed_fields and value is not None:
                setattr(transcript, field, value)

        transcript.updated_at = datetime.now(timezone.utc)
        db.flush()
        return transcript

    @staticmethod
    def delete(db: Session, transcript_id: str, user_id: str) -> bool:
        transcript = TranscriptQueries.get_by_id(db, transcript_id, user_id)
        if not transcript:
            return False
        db.delete(transcript)
        db.flush()
        return True


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
    def update_content(db: Session, card_id: str, user_id: str, **updates) -> VocabularyCardORM | None:
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
    def get_stats(db: Session, user_id: str, language: str | None = None) -> dict[str, Any]:
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
            VocabularyCardORM.due_at <= datetime.now(timezone.utc),
        ]
        due_stmt = (
            select(func.count())
            .select_from(VocabularyCardORM)
            .where(and_(*due_conditions))
        )
        due_today = db.execute(due_stmt).scalar_one()

        overdue_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
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

