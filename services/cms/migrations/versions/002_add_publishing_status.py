"""Add publishing status to PostStatus enum

Revision ID: 002
Revises: 001
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op


revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE poststatus ADD VALUE IF NOT EXISTS 'publishing' AFTER 'approved'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; no-op
    pass
