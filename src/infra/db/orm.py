"""SQLAlchemy ORM models for Learning application."""

import sqlalchemy as sa
import sqlalchemy.orm as so
from datetime import datetime
from uuid import uuid4


class Base(so.DeclarativeBase):
    """Base class for all ORM models."""

    id: so.Mapped[str] = so.mapped_column(
        sa.String,
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    created_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )
    updated_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )
    extra: so.Mapped[dict] = so.mapped_column(
        sa.JSON,
        default=dict,
        nullable=False,
    )


class UserORM(Base):
    """User account."""

    __tablename__ = "users"

    email: so.Mapped[str | None] = so.mapped_column(
        sa.String,
        unique=True,
        index=True,
        nullable=True,
    )


class LearningSessionORM(Base):
    """Learning session (study time tracking)."""

    __tablename__ = "learning_sessions"

    user_id: so.Mapped[str] = so.mapped_column(sa.String)
    language: so.Mapped[str] = so.mapped_column(sa.String(16))
    name: so.Mapped[str] = so.mapped_column(sa.String(200))
    duration_seconds: so.Mapped[int] = so.mapped_column(sa.Integer)
    tags: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list)

    __table_args__ = (
        sa.Index("ix_learning_sessions_user_lang", "user_id", "language"),
    )


class LearningTranscriptORM(Base):
    """Learning transcript (lesson notes)."""

    __tablename__ = "learning_transcripts"

    user_id: so.Mapped[str] = so.mapped_column(sa.String)
    language: so.Mapped[str] = so.mapped_column(sa.String(16))
    source_url: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    lesson_audio_folder_id: so.Mapped[str | None] = so.mapped_column(
        sa.String, nullable=True
    )
    transcript: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    notes: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list)
    tags: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list)

    __table_args__ = (
        sa.Index("ix_learning_transcripts_user_lang", "user_id", "language"),
    )


class LearningAudioLessonORM(Base):
    """Audio lesson with transcript."""

    __tablename__ = "learning_audio_lessons"

    user_id: so.Mapped[str] = so.mapped_column(sa.String)
    language: so.Mapped[str | None] = so.mapped_column(sa.String(16), nullable=True)
    name: so.Mapped[str] = so.mapped_column(sa.String(200))
    duration_seconds: so.Mapped[float | None] = so.mapped_column(sa.Float, nullable=True)
    transcript: so.Mapped[str] = so.mapped_column(sa.Text)
    segments: so.Mapped[list[dict]] = so.mapped_column(sa.JSON, default=list)
    audio_filename: so.Mapped[str] = so.mapped_column(sa.String)
    audio_mime_type: so.Mapped[str] = so.mapped_column(sa.String(120))

    __table_args__ = (
        sa.Index("ix_learning_audio_lessons_user_lang", "user_id", "language"),
    )


class VocabularyCardORM(Base):
    """Vocabulary flashcard with SRS state."""

    __tablename__ = "vocabulary_cards"

    user_id: so.Mapped[str] = so.mapped_column(sa.String)
    language: so.Mapped[str] = so.mapped_column(sa.String(16))
    word: so.Mapped[str] = so.mapped_column(sa.String(100))
    translation: so.Mapped[str | None] = so.mapped_column(sa.Text)
    notes: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list)
    tags: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list)

    # SRS state
    status: so.Mapped[str] = so.mapped_column(sa.String(16), default="new")
    due_at: so.Mapped[datetime | None] = so.mapped_column(sa.DateTime(timezone=True))
    last_reviewed_at: so.Mapped[datetime | None] = so.mapped_column(
        sa.DateTime(timezone=True)
    )
    interval_days: so.Mapped[int] = so.mapped_column(sa.Integer, default=0)
    ease: so.Mapped[int] = so.mapped_column(sa.Integer, default=250)
    reps: so.Mapped[int] = so.mapped_column(sa.Integer, default=0)
    lapses: so.Mapped[int] = so.mapped_column(sa.Integer, default=0)
    streak_correct: so.Mapped[int] = so.mapped_column(sa.Integer, default=0)
    last_grade: so.Mapped[str | None] = so.mapped_column(sa.String(8))

    __table_args__ = (
        sa.Index("ix_vocab_due_queue", "user_id", "language", "status", "due_at"),
        sa.Index("ix_vocabulary_cards_user_lang", "user_id", "language"),
    )

