"""SQLAlchemy ORM models for Learning application."""

from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
import sqlalchemy.orm as so


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

    exercise_progress: so.Mapped[list["UserExerciseProgressORM"]] = so.relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<UserORM(id={self.id!r}, email={self.email!r})>"


class UserExerciseProgressORM(Base):
    """Per-user progress for one normalized exercise/catalog item."""

    __tablename__ = "user_exercise_progress"

    user_id: so.Mapped[str] = so.mapped_column(
        sa.String,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    exercise_id: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)
    section: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    source_type: so.Mapped[str] = so.mapped_column(sa.String(32), nullable=False)
    level: so.Mapped[str | None] = so.mapped_column(sa.String(16), nullable=True)
    status: so.Mapped[str] = so.mapped_column(
        sa.String(32),
        default="not_started",
        nullable=False,
    )
    score: so.Mapped[float | None] = so.mapped_column(sa.Float, nullable=True)
    accuracy: so.Mapped[float | None] = so.mapped_column(sa.Float, nullable=True)
    started_at: so.Mapped[datetime | None] = so.mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )
    completed_at: so.Mapped[datetime | None] = so.mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )
    last_opened_at: so.Mapped[datetime] = so.mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )
    attempts_count: so.Mapped[int] = so.mapped_column(
        sa.Integer,
        default=0,
        nullable=False,
    )
    saved_vocab_count: so.Mapped[int] = so.mapped_column(
        sa.Integer,
        default=0,
        nullable=False,
    )
    answers_snapshot: so.Mapped[dict | list | None] = so.mapped_column(
        sa.JSON,
        nullable=True,
    )

    user: so.Mapped["UserORM"] = so.relationship(back_populates="exercise_progress")

    __table_args__ = (
        sa.UniqueConstraint("user_id", "exercise_id", name="uq_user_exercise_progress"),
        sa.Index(
            "ix_user_exercise_progress_user_status",
            "user_id",
            "status",
            "last_opened_at",
        ),
        sa.Index(
            "ix_user_exercise_progress_user_section",
            "user_id",
            "section",
            "last_opened_at",
        ),
        sa.Index(
            "ix_user_exercise_progress_catalog",
            "section",
            "source_type",
            "level",
            "status",
        ),
        sa.CheckConstraint(
            "section IN ('CO', 'CE', 'PO', 'PE')",
            name="ck_user_exercise_progress_section",
        ),
        sa.CheckConstraint(
            "source_type IN ('numbers', 'video_podcast', 'delf_book', 'oral_prompt', 'writing_prompt')",
            name="ck_user_exercise_progress_source_type",
        ),
        sa.CheckConstraint(
            "level IS NULL OR level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')",
            name="ck_user_exercise_progress_level",
        ),
        sa.CheckConstraint(
            "status IN ('not_started', 'in_progress', 'completed', 'retry_suggested')",
            name="ck_user_exercise_progress_status",
        ),
        sa.CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 100)",
            name="ck_user_exercise_progress_score",
        ),
        sa.CheckConstraint(
            "accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 100)",
            name="ck_user_exercise_progress_accuracy",
        ),
        sa.CheckConstraint(
            "attempts_count >= 0",
            name="ck_user_exercise_progress_attempts",
        ),
        sa.CheckConstraint(
            "saved_vocab_count >= 0",
            name="ck_user_exercise_progress_saved_vocab",
        ),
    )

    def __repr__(self) -> str:
        return f"<UserExerciseProgressORM(user_id={self.user_id!r}, exercise_id={self.exercise_id!r}, status={self.status!r})>"


class CoCeExerciseORM(Base):
    """CO/CE practice exercise metadata (audio or video based)."""

    __tablename__ = "coce_exercises"

    name: so.Mapped[str] = so.mapped_column(sa.String(200), nullable=False)
    level: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    duration_seconds: so.Mapped[int] = so.mapped_column(sa.Integer, nullable=False)

    # Media identifier (YouTube video ID or audio UUID)
    media_id: so.Mapped[str] = so.mapped_column(sa.String(255), nullable=False)

    # File paths in GitHub (relative paths)
    co_path: so.Mapped[str | None] = so.mapped_column(sa.String(500), nullable=True)
    ce_path: so.Mapped[str | None] = so.mapped_column(sa.String(500), nullable=True)
    transcript_path: so.Mapped[str | None] = so.mapped_column(
        sa.String(500), nullable=True
    )

    # Topic/category for filtering (e.g., 'politics', 'health', 'environment', etc.)
    topic: so.Mapped[str | None] = so.mapped_column(sa.String(50), nullable=True)

    # media_type stored in extra JSON: extra['media_type'] = 'audio' | 'video'

    __table_args__ = (
        sa.Index("ix_coce_exercises_level_topic", "level", "topic"),
        sa.Index("ix_coce_exercises_media_id", "media_id"),
        sa.CheckConstraint("duration_seconds >= 0", name="ck_coce_duration_positive"),
        sa.CheckConstraint(
            "level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')", name="ck_coce_level"
        ),
    )

    @property
    def media_type(self) -> str:
        """Get media type from extra JSON."""
        return self.extra.get("media_type", "audio")

    @media_type.setter
    def media_type(self, value: str) -> None:
        """Set media type in extra JSON."""
        if not isinstance(self.extra, dict):
            self.extra = {}
        self.extra["media_type"] = value

    def __repr__(self) -> str:
        return f"<CoCeExerciseORM(id={self.id!r}, name={self.name!r}, level={self.level!r}, media_type={self.media_type!r})>"


class DelfTestPaperORM(Base):
    """DELF exam test paper metadata."""

    __tablename__ = "delf_test_papers"

    test_id: so.Mapped[str] = so.mapped_column(sa.String(50), nullable=False)
    level: so.Mapped[str] = so.mapped_column(sa.String(16), nullable=False)
    variant: so.Mapped[str] = so.mapped_column(sa.String(100), nullable=False)
    section: so.Mapped[str] = so.mapped_column(sa.String(100), nullable=False)
    exercise_count: so.Mapped[int] = so.mapped_column(
        sa.Integer, default=0, nullable=False
    )
    audio_filename: so.Mapped[str | None] = so.mapped_column(
        sa.String(255), nullable=True
    )
    status: so.Mapped[str] = so.mapped_column(
        sa.String(16), default="active", nullable=False
    )
    github_path: so.Mapped[str] = so.mapped_column(sa.String(500), nullable=False)

    __table_args__ = (
        sa.Index(
            "ix_delf_test_papers_level_section_status", "level", "section", "status"
        ),
        sa.Index(
            "ix_delf_test_papers_level_variant_section_status",
            "level",
            "variant",
            "section",
            "status",
        ),
        sa.UniqueConstraint(
            "test_id", "level", "variant", "section", name="uq_delf_test_paper"
        ),
        sa.CheckConstraint(
            "level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')", name="ck_delf_level"
        ),
        sa.CheckConstraint(
            "status IN ('active', 'draft', 'archived')", name="ck_delf_status"
        ),
        sa.CheckConstraint("exercise_count >= 0", name="ck_delf_exercise_count"),
    )

    def __repr__(self) -> str:
        return f"<DelfTestPaperORM(id={self.id!r}, test_id={self.test_id!r}, level={self.level!r}, section={self.section!r})>"
