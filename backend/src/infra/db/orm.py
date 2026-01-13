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
        onupdate=sa.func.now(),
        nullable=False,
    )
    extra: so.Mapped[dict] = so.mapped_column(
        sa.JSON,
        default=dict,
        nullable=False,
    )

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<{self.__class__.__name__}(id={self.id!r})>"


class UserORM(Base):
    """User account."""

    __tablename__ = "users"

    email: so.Mapped[str | None] = so.mapped_column(
        sa.String,
        unique=True,
        index=True,
        nullable=True,
    )

    # Relationships (for easier querying)
    sessions: so.Mapped[list["LearningSessionORM"]] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    transcripts: so.Mapped[list["LearningTranscriptORM"]] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    audio_lessons: so.Mapped[list["LearningAudioLessonORM"]] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    vocab_cards: so.Mapped[list["VocabularyCardORM"]] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<UserORM(id={self.id!r}, email={self.email!r})>"


class LearningSessionORM(Base):
    """Learning session (study time tracking)."""

    __tablename__ = "learning_sessions"

    user_id: so.Mapped[str] = so.mapped_column(
        sa.String,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    language: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    name: so.Mapped[str] = so.mapped_column(sa.String(200), nullable=False)
    duration_seconds: so.Mapped[int] = so.mapped_column(sa.Integer, nullable=False)
    tags: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list, nullable=False)

    # Relationship
    user: so.Mapped["UserORM"] = so.relationship(back_populates="sessions")

    __table_args__ = (
        sa.Index("ix_learning_sessions_user_lang", "user_id", "language"),
        sa.CheckConstraint("duration_seconds >= 0", name="ck_session_duration_positive"),
    )

    def __repr__(self) -> str:
        return f"<LearningSessionORM(id={self.id!r}, user_id={self.user_id!r}, language={self.language!r})>"


class LearningTranscriptORM(Base):
    """Learning transcript (lesson notes)."""

    __tablename__ = "learning_transcripts"

    user_id: so.Mapped[str] = so.mapped_column(
        sa.String,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    language: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    source_url: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    lesson_audio_folder_id: so.Mapped[str | None] = so.mapped_column(
        sa.String, nullable=True
    )  # Google Drive folder ID (not a DB FK)
    transcript: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    notes: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list, nullable=False)
    tags: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list, nullable=False)

    # Relationship
    user: so.Mapped["UserORM"] = so.relationship(back_populates="transcripts")

    __table_args__ = (
        sa.Index("ix_learning_transcripts_user_lang", "user_id", "language"),
    )

    def __repr__(self) -> str:
        return f"<LearningTranscriptORM(id={self.id!r}, user_id={self.user_id!r}, language={self.language!r})>"


class LearningAudioLessonORM(Base):
    """Audio lesson with transcript."""

    __tablename__ = "learning_audio_lessons"

    user_id: so.Mapped[str] = so.mapped_column(
        sa.String,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    language: so.Mapped[str | None] = so.mapped_column(sa.String(16), nullable=True)
    name: so.Mapped[str] = so.mapped_column(sa.String(200), nullable=False)
    duration_seconds: so.Mapped[float | None] = so.mapped_column(sa.Float, nullable=True)
    transcript: so.Mapped[str] = so.mapped_column(sa.Text, nullable=False)
    segments: so.Mapped[list[dict]] = so.mapped_column(sa.JSON, default=list, nullable=False)
    audio_filename: so.Mapped[str] = so.mapped_column(sa.String, nullable=False)
    audio_mime_type: so.Mapped[str] = so.mapped_column(sa.String(120), nullable=False)

    # Relationship
    user: so.Mapped["UserORM"] = so.relationship(back_populates="audio_lessons")

    __table_args__ = (
        sa.Index("ix_learning_audio_lessons_user_lang", "user_id", "language"),
        sa.CheckConstraint("duration_seconds IS NULL OR duration_seconds >= 0", name="ck_audio_duration_positive"),
    )

    def __repr__(self) -> str:
        return f"<LearningAudioLessonORM(id={self.id!r}, user_id={self.user_id!r}, name={self.name!r})>"


class VocabularyCardORM(Base):
    """Vocabulary flashcard with SRS state."""

    __tablename__ = "vocabulary_cards"

    user_id: so.Mapped[str] = so.mapped_column(
        sa.String,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    language: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    word: so.Mapped[str] = so.mapped_column(sa.String(100), nullable=False)
    translation: so.Mapped[str | None] = so.mapped_column(sa.Text, nullable=True)
    notes: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list, nullable=False)
    tags: so.Mapped[list[str]] = so.mapped_column(sa.JSON, default=list, nullable=False)

    # SRS state
    status: so.Mapped[str] = so.mapped_column(
        sa.String(16), 
        default="new",
        nullable=False,
    )
    due_at: so.Mapped[datetime | None] = so.mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )
    last_reviewed_at: so.Mapped[datetime | None] = so.mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )
    interval_days: so.Mapped[int] = so.mapped_column(sa.Integer, default=0, nullable=False)
    ease: so.Mapped[int] = so.mapped_column(sa.Integer, default=250, nullable=False)
    reps: so.Mapped[int] = so.mapped_column(sa.Integer, default=0, nullable=False)
    lapses: so.Mapped[int] = so.mapped_column(sa.Integer, default=0, nullable=False)
    streak_correct: so.Mapped[int] = so.mapped_column(sa.Integer, default=0, nullable=False)
    last_grade: so.Mapped[str | None] = so.mapped_column(sa.String(8), nullable=True)

    # Relationship
    user: so.Mapped["UserORM"] = so.relationship(back_populates="vocab_cards")

    __table_args__ = (
        sa.Index("ix_vocab_due_queue", "user_id", "language", "status", "due_at"),
        sa.Index("ix_vocabulary_cards_user_lang", "user_id", "language"),
        sa.CheckConstraint("interval_days >= 0", name="ck_vocab_interval_positive"),
        sa.CheckConstraint("ease > 0", name="ck_vocab_ease_positive"),
        sa.CheckConstraint("reps >= 0", name="ck_vocab_reps_positive"),
        sa.CheckConstraint("lapses >= 0", name="ck_vocab_lapses_positive"),
        sa.CheckConstraint("streak_correct >= 0", name="ck_vocab_streak_positive"),
        sa.CheckConstraint(
            "status IN ('new', 'learning', 'review', 'suspended')",
            name="ck_vocab_status_valid"
        ),
    )

    def __repr__(self) -> str:
        return f"<VocabularyCardORM(id={self.id!r}, word={self.word!r}, language={self.language!r}, status={self.status!r})>"

