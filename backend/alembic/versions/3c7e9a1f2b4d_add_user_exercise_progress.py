"""add_user_exercise_progress

Revision ID: 3c7e9a1f2b4d
Revises: 2f6c8f1d9a0b
Create Date: 2026-06-21 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3c7e9a1f2b4d"
down_revision: Union[str, Sequence[str], None] = "2f6c8f1d9a0b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_exercise_progress",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("exercise_id", sa.String(length=255), nullable=False),
        sa.Column("section", sa.String(length=16), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("level", sa.String(length=16), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_opened_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("attempts_count", sa.Integer(), nullable=False),
        sa.Column("saved_vocab_count", sa.Integer(), nullable=False),
        sa.Column("answers_snapshot", sa.JSON(), nullable=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "exercise_id",
            name="uq_user_exercise_progress",
        ),
    )
    op.create_index(
        "ix_user_exercise_progress_user_status",
        "user_exercise_progress",
        ["user_id", "status", "last_opened_at"],
    )
    op.create_index(
        "ix_user_exercise_progress_user_section",
        "user_exercise_progress",
        ["user_id", "section", "last_opened_at"],
    )
    op.create_index(
        "ix_user_exercise_progress_catalog",
        "user_exercise_progress",
        ["section", "source_type", "level", "status"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_user_exercise_progress_catalog",
        table_name="user_exercise_progress",
    )
    op.drop_index(
        "ix_user_exercise_progress_user_section",
        table_name="user_exercise_progress",
    )
    op.drop_index(
        "ix_user_exercise_progress_user_status",
        table_name="user_exercise_progress",
    )
    op.drop_table("user_exercise_progress")
