"""composite_index_level_topic

Revision ID: 1ad1e6763aa6
Revises: 0a427e885726
Create Date: 2026-01-15 23:53:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1ad1e6763aa6'
down_revision = '0a427e885726'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop individual indexes
    op.drop_index('ix_coce_exercises_level', table_name='coce_exercises')
    op.drop_index('ix_coce_exercises_topic', table_name='coce_exercises')
    
    # Create composite index on (level, topic)
    # Most queries will filter by level first, then topic
    op.create_index('ix_coce_exercises_level_topic', 'coce_exercises', ['level', 'topic'])


def downgrade() -> None:
    # Drop composite index
    op.drop_index('ix_coce_exercises_level_topic', table_name='coce_exercises')
    
    # Re-create individual indexes
    op.create_index('ix_coce_exercises_topic', 'coce_exercises', ['topic'])
    op.create_index('ix_coce_exercises_level', 'coce_exercises', ['level'])
