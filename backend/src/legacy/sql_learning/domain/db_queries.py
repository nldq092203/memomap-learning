"""Archived SQL-backed query helpers for legacy learning flows."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from src.infra.db.orm import LearningSessionORM, LearningTranscriptORM


class SessionQueries:
    """Database queries for legacy learning sessions."""

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
    def get_by_id(
        db: Session, session_id: str, user_id: str
    ) -> LearningSessionORM | None:
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
                conditions.append(
                    func.date(LearningSessionORM.created_at) == filter_date
                )
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
    """Database queries for legacy transcripts."""

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
    def get_by_id(
        db: Session, transcript_id: str, user_id: str
    ) -> LearningTranscriptORM | None:
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
    def update(
        db: Session, transcript_id: str, user_id: str, **updates
    ) -> LearningTranscriptORM | None:
        transcript = TranscriptQueries.get_by_id(db, transcript_id, user_id)
        if not transcript:
            return None

        allowed_fields = [
            "source_url",
            "lesson_audio_folder_id",
            "transcript",
            "notes",
            "tags",
            "extra",
        ]
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
