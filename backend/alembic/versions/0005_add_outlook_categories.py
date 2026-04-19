"""add outlook_categories to events

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("outlook_categories", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "outlook_categories")
