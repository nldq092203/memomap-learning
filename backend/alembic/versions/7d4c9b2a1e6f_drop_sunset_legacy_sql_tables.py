"""drop_sunset_legacy_sql_tables

Revision ID: 7d4c9b2a1e6f
Revises: 3c7e9a1f2b4d
Create Date: 2026-06-28 00:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "7d4c9b2a1e6f"
down_revision: Union[str, Sequence[str], None] = "3c7e9a1f2b4d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEGACY_TABLES = (
    "vocabulary_cards",
    "learning_transcripts",
    "learning_sessions",
    "learning_audio_lessons",
)


def upgrade() -> None:
    """Drop SQL tables that were sunset by the revamp.

    The active vocabulary data lives in MongoDB. Sessions, transcripts,
    analytics, and Drive-backed audio lessons are disabled legacy flows.
    """

    for table_name in LEGACY_TABLES:
        op.execute(sa.text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))


def downgrade() -> None:
    """Recreate empty legacy tables for schema rollback only."""

    op.create_table(
        "learning_audio_lessons",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("language", sa.String(length=16), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=False),
        sa.Column("segments", sa.JSON(), nullable=False),
        sa.Column("audio_filename", sa.String(), nullable=False),
        sa.Column("audio_mime_type", sa.String(length=120), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("extra", sa.JSON(), nullable=False),
        sa.CheckConstraint(
            "duration_seconds IS NULL OR duration_seconds >= 0",
            name="ck_audio_duration_positive",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_learning_audio_lessons_user_lang",
        "learning_audio_lessons",
        ["user_id", "language"],
        unique=False,
    )

    op.create_table(
        "learning_sessions",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("language", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("extra", sa.JSON(), nullable=False),
        sa.CheckConstraint(
            "duration_seconds >= 0", name="ck_session_duration_positive"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_learning_sessions_user_lang",
        "learning_sessions",
        ["user_id", "language"],
        unique=False,
    )

    op.create_table(
        "learning_transcripts",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("language", sa.String(length=16), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("lesson_audio_folder_id", sa.String(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("notes", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("extra", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_learning_transcripts_user_lang",
        "learning_transcripts",
        ["user_id", "language"],
        unique=False,
    )

    op.create_table(
        "vocabulary_cards",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("language", sa.String(length=16), nullable=False),
        sa.Column("word", sa.String(length=100), nullable=False),
        sa.Column("translation", sa.Text(), nullable=True),
        sa.Column("notes", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("ease", sa.Integer(), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("lapses", sa.Integer(), nullable=False),
        sa.Column("streak_correct", sa.Integer(), nullable=False),
        sa.Column("last_grade", sa.String(length=8), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("extra", sa.JSON(), nullable=False),
        sa.CheckConstraint("interval_days >= 0", name="ck_vocab_interval_positive"),
        sa.CheckConstraint("ease > 0", name="ck_vocab_ease_positive"),
        sa.CheckConstraint("reps >= 0", name="ck_vocab_reps_positive"),
        sa.CheckConstraint("lapses >= 0", name="ck_vocab_lapses_positive"),
        sa.CheckConstraint("streak_correct >= 0", name="ck_vocab_streak_positive"),
        sa.CheckConstraint(
            "status IN ('new', 'learning', 'review', 'suspended')",
            name="ck_vocab_status_valid",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_vocab_due_queue",
        "vocabulary_cards",
        ["user_id", "language", "status", "due_at"],
        unique=False,
    )
    op.create_index(
        "ix_vocabulary_cards_user_lang",
        "vocabulary_cards",
        ["user_id", "language"],
        unique=False,
    )
