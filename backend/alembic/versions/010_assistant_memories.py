"""Add assistant memories table

Revision ID: 010_assistant_memories
Revises: 010_in_app_reviews
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa


revision = "010_assistant_memories"
down_revision = "010_in_app_reviews"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assistant_memories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("pet_status", sa.Text(), nullable=True),
        sa.Column("preferences_budget", sa.Text(), nullable=True),
        sa.Column("common_questions", sa.Text(), nullable=True),
        sa.Column("cautions", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("last_extracted_message_id", sa.Integer(), nullable=True),
        sa.Column("last_extracted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_user_edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_assistant_memories_user_id"),
        sa.CheckConstraint("char_length(coalesce(summary, '')) <= 500", name="ck_assistant_memories_summary_len"),
    )
    op.create_index("ix_assistant_memories_user_id", "assistant_memories", ["user_id"], unique=False)
    op.create_index("ix_assistant_memories_enabled", "assistant_memories", ["enabled"], unique=False)
    op.create_index(
        "ix_assistant_memories_enabled_extracted",
        "assistant_memories",
        ["enabled", "last_extracted_message_id"],
        unique=False,
    )


def downgrade() -> None:
    # Project policy forbids destructive table deletion without explicit user approval.
    # Keep downgrade intentionally non-destructive for this additive migration.
    pass
