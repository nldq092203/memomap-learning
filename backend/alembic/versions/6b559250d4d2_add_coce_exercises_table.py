"""add_coce_exercises_table

Revision ID: 6b559250d4d2
Revises: 9df4f9e4eab4
Create Date: 2026-01-15 21:53:05.198567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b559250d4d2'
down_revision: Union[str, Sequence[str], None] = '9df4f9e4eab4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'coce_exercises',
        
        # Primary key and timestamps (from Base)
        sa.Column('id', sa.String(), primary_key=True, nullable=False, server_default=sa.text("gen_random_uuid()::text")),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('extra', sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        
        # Exercise metadata
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('level', sa.String(16), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=False),
        
        # Media information
        sa.Column('media_id', sa.String(255), nullable=False),
        
        # File paths in GitHub (separate for CO, CE, and transcript)
        sa.Column('co_path', sa.String(500), nullable=True),
        sa.Column('ce_path', sa.String(500), nullable=True),
        sa.Column('transcript_path', sa.String(500), nullable=True),
        
        # Constraints
        sa.CheckConstraint('duration_seconds >= 0', name='ck_coce_duration_positive'),
        sa.CheckConstraint("level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')", name='ck_coce_level'),
    )
    
    # Create indexes
    op.create_index('ix_coce_exercises_level', 'coce_exercises', ['level'])
    op.create_index('ix_coce_exercises_media_id', 'coce_exercises', ['media_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_coce_exercises_media_id', table_name='coce_exercises')
    op.drop_index('ix_coce_exercises_level', table_name='coce_exercises')
    op.drop_table('coce_exercises')

