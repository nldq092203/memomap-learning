"""add_delf_test_papers_table

Revision ID: a3f7c1d2e4b5
Revises: 1ad1e6763aa6
Create Date: 2026-03-09 23:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f7c1d2e4b5'
down_revision: Union[str, Sequence[str], None] = '1ad1e6763aa6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'delf_test_papers',

        # Primary key and timestamps (from Base)
        sa.Column('id', sa.String(), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()::text")),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('extra', sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),

        # Test paper metadata
        sa.Column('test_id', sa.String(50), nullable=False),
        sa.Column('level', sa.String(16), nullable=False),
        sa.Column('variant', sa.String(100), nullable=False),
        sa.Column('section', sa.String(100), nullable=False),
        sa.Column('exercise_count', sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column('audio_filename', sa.String(255), nullable=True),
        sa.Column('status', sa.String(16), nullable=False, server_default=sa.text("'active'")),
        sa.Column('github_path', sa.String(500), nullable=False),

        # Constraints
        sa.UniqueConstraint('test_id', 'level', 'variant', 'section', name='uq_delf_test_paper'),
        sa.CheckConstraint("level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')", name='ck_delf_level'),
        sa.CheckConstraint("status IN ('active', 'draft', 'archived')", name='ck_delf_status'),
        sa.CheckConstraint('exercise_count >= 0', name='ck_delf_exercise_count'),
    )

    # Create indexes
    op.create_index('ix_delf_test_papers_level_section_status', 'delf_test_papers', ['level', 'section', 'status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_delf_test_papers_level_section_status', table_name='delf_test_papers')
    op.drop_table('delf_test_papers')
