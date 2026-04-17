"""Phase 3: add connected_email to calendar_sources

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-15
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "calendar_sources",
        sa.Column("connected_email", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("calendar_sources", "connected_email")
