"""SQLModel models for the CMS."""

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Column, Enum, Field, Relationship, SQLModel


def utcnow() -> datetime:
    """Naive UTC now — compatible with TIMESTAMP WITHOUT TIME ZONE columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class PostStatus(str, enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    approved = "approved"
    publishing = "publishing"
    published = "published"
    rejected = "rejected"


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------


class Media(SQLModel, table=True):
    __tablename__ = "media"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True)
    original_name: str
    content_type: str
    path: str
    size: int
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_by: str  # username from identity
    created_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Post
# ---------------------------------------------------------------------------


class Post(SQLModel, table=True):
    __tablename__ = "posts"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Content
    title: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    description: str = ""
    content: str = ""  # MDX body

    # Frontmatter metadata
    sidebar_label: str = ""
    sidebar_position: int = 0
    tags: str = ""  # comma-separated

    # Location in docs tree — e.g. "section/subsection/page"
    category_path: str = Field(index=True)

    # Workflow
    status: PostStatus = Field(
        default=PostStatus.draft,
        sa_column=Column(Enum(PostStatus), nullable=False, default=PostStatus.draft),
    )
    rejection_reason: Optional[str] = None

    # Audit
    author: str  # username from identity
    author_display_name: str = ""
    reviewer: Optional[str] = None
    reviewer_display_name: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    reviewed_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    # Versioning
    version: int = 1

    # Relationships
    revisions: list["PostRevision"] = Relationship(back_populates="post")


# ---------------------------------------------------------------------------
# Post Revisions (history)
# ---------------------------------------------------------------------------


class PostRevision(SQLModel, table=True):
    __tablename__ = "post_revisions"

    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="posts.id", index=True)
    version: int
    title: str
    content: str
    description: str = ""
    edited_by: str
    created_at: datetime = Field(default_factory=utcnow)
    change_summary: str = ""

    post: Optional[Post] = Relationship(back_populates="revisions")
