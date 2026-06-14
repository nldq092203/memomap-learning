"""add_delf_variant_listing_index

Revision ID: 2f6c8f1d9a0b
Revises: a3f7c1d2e4b5
Create Date: 2026-06-14 22:20:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2f6c8f1d9a0b"
down_revision: Union[str, Sequence[str], None] = "a3f7c1d2e4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        "ix_delf_test_papers_level_variant_section_status",
        "delf_test_papers",
        ["level", "variant", "section", "status"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_delf_test_papers_level_variant_section_status",
        table_name="delf_test_papers",
    )
