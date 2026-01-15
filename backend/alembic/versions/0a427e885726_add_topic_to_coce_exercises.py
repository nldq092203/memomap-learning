"""add_topic_to_coce_exercises

Revision ID: 0a427e885726
Revises: 6b559250d4d2
Create Date: 2026-01-15 23:38:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0a427e885726'
down_revision = '6b559250d4d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add topic column (nullable for now to allow existing data)
    op.add_column('coce_exercises', sa.Column('topic', sa.String(length=50), nullable=True))
    
    # Create index on topic for faster filtering
    op.create_index('ix_coce_exercises_topic', 'coce_exercises', ['topic'])


def downgrade() -> None:
    op.drop_index('ix_coce_exercises_topic', table_name='coce_exercises')
    op.drop_column('coce_exercises', 'topic')
