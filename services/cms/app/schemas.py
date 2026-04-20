"""Pydantic schemas for API request/response."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.models import PostStatus


# ---------------------------------------------------------------------------
# Base config (camelCase JSON)
# ---------------------------------------------------------------------------


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class CurrentUser(CamelModel):
    username: str
    display_name: str = ""
    role: str = ""
    email: str = ""


# ---------------------------------------------------------------------------
# Post
# ---------------------------------------------------------------------------


class PostCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str = ""
    content: str = ""
    sidebar_label: str = ""
    sidebar_position: int = 0
    tags: str = ""
    category_path: str = Field(min_length=1)


class PostUpdate(CamelModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    content: Optional[str] = None
    sidebar_label: Optional[str] = None
    sidebar_position: Optional[int] = None
    tags: Optional[str] = None
    category_path: Optional[str] = None
    change_summary: str = ""


class PostResponse(CamelModel):
    id: int
    title: str
    slug: str
    description: str
    content: str
    sidebar_label: str
    sidebar_position: int
    tags: str
    category_path: str
    status: PostStatus
    rejection_reason: Optional[str]
    author: str
    author_display_name: str
    reviewer: Optional[str]
    reviewer_display_name: Optional[str]
    created_at: datetime
    updated_at: datetime
    reviewed_at: Optional[datetime]
    published_at: Optional[datetime]
    version: int


class PostListItem(CamelModel):
    id: int
    title: str
    slug: str
    description: str
    category_path: str
    status: PostStatus
    author: str
    author_display_name: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    version: int


class PostListResponse(CamelModel):
    items: list[PostListItem]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------


class ReviewAction(CamelModel):
    action: str = Field(pattern=r"^(approve|reject|request_changes)$")
    reason: str = ""


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------


class MediaResponse(CamelModel):
    id: int
    filename: str
    original_name: str
    content_type: str
    path: str
    size: int
    width: Optional[int]
    height: Optional[int]
    uploaded_by: str
    created_at: datetime
    url: str = ""  # computed


class MediaListResponse(CamelModel):
    items: list[MediaResponse]
    total: int


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------


class CategoryNode(CamelModel):
    label: str
    path: str
    position: int = 0
    children: list["CategoryNode"] = []


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------


class PublishResponse(CamelModel):
    published_count: int
    file_paths: list[str]
    message: str
