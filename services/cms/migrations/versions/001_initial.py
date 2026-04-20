"""Initial migration: posts, revisions, media

Revision ID: 001
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Post ---
    op.create_table(
        'posts',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column('slug', sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False, server_default=''),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        sa.Column('sidebar_label', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False, server_default=''),
        sa.Column('sidebar_position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tags', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False, server_default=''),
        sa.Column('category_path', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False, server_default=''),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False, server_default='draft'),
        sa.Column('rejection_reason', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('author', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('author_display_name', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False, server_default=''),
        sa.Column('reviewer', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('reviewer_display_name', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_posts_slug', 'posts', ['slug'], unique=True)
    op.create_index('ix_posts_status', 'posts', ['status'])
    op.create_index('ix_posts_author', 'posts', ['author'])
    op.create_index('ix_posts_category_path', 'posts', ['category_path'])

    # --- PostRevision ---
    op.create_table(
        'post_revisions',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False, server_default=''),
        sa.Column('edited_by', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('change_summary', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False, server_default=''),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_post_revisions_post_id', 'post_revisions', ['post_id'])

    # --- Media ---
    op.create_table(
        'media',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('filename', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('original_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('content_type', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('path', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('uploaded_by', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_media_filename', 'media', ['filename'], unique=True)
    op.create_index('ix_media_content_type', 'media', ['content_type'])


def downgrade() -> None:
    op.drop_table('media')
    op.drop_table('post_revisions')
    op.drop_table('posts')
