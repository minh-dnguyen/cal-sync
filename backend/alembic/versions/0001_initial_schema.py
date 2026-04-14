"""Initial schema: users, calendar_sources, events

Revision ID: 0001
Revises:
Create Date: 2026-04-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("country_code", sa.String(2), nullable=True),
        sa.Column("timezone", sa.String(), server_default="UTC"),
        sa.Column(
            "theme",
            sa.Enum("light", "dark", "system", name="themepreference"),
            server_default="system",
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "calendar_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "source_type",
            sa.Enum("local", "google", "outlook", "holiday", name="sourcetype"),
            nullable=False,
        ),
        sa.Column("is_visible", sa.Boolean(), server_default="true"),
        sa.Column("color", sa.String(7), server_default="#6366F1"),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("calendar_source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("calendar_sources.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("all_day", sa.Boolean(), server_default="false"),
        sa.Column("color", sa.String(7), nullable=True),
        sa.Column("rrule", sa.String(), nullable=True),
        sa.Column(
            "source",
            sa.Enum("local", "google", "outlook", "holiday", name="eventsource"),
            server_default="local",
        ),
        sa.Column("external_id", sa.String(), nullable=True, index=True),
        sa.Column("reminder_minutes", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_events_user_id", "events", ["user_id"])
    op.create_index("ix_events_start_time", "events", ["start_time"])


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("calendar_sources")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS eventsource")
    op.execute("DROP TYPE IF EXISTS sourcetype")
    op.execute("DROP TYPE IF EXISTS themepreference")
