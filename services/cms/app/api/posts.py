"""Posts CRUD + workflow API."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.auth import AdminUser, AuthUser
from app.database import AsyncSession, get_session
from app.models import Post, PostRevision, PostStatus, utcnow
from app.schemas import (
    PostCreate,
    PostListItem,
    PostListResponse,
    PostResponse,
    PostUpdate,
    ReviewAction,
)
from fastapi import Depends

router = APIRouter(prefix="/posts", tags=["posts"])

Session = Depends(get_session)


# ---------------------------------------------------------------------------
# List posts
# ---------------------------------------------------------------------------


@router.get("", response_model=PostListResponse)
async def list_posts(
    user: AuthUser,
    session: AsyncSession = Session,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: PostStatus | None = Query(None, alias="status"),
    category: str | None = None,
    author: str | None = None,
    search: str | None = None,
):
    """List posts with filtering and pagination."""
    query = select(Post)

    if status_filter:
        query = query.where(Post.status == status_filter)
    if category:
        query = query.where(Post.category_path.startswith(category))
    if author:
        query = query.where(Post.author == author)
    if search:
        query = query.where(
            Post.title.ilike(f"%{search}%") | Post.description.ilike(f"%{search}%")
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_q)).scalar_one()

    # Paginate — most recently updated first
    query = query.order_by(Post.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    results = (await session.execute(query)).scalars().all()

    return PostListResponse(
        items=[PostListItem.model_validate(p, from_attributes=True) for p in results],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# Get single post
# ---------------------------------------------------------------------------


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    user: AuthUser,
    session: AsyncSession = Session,
):
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return PostResponse.model_validate(post, from_attributes=True)


# ---------------------------------------------------------------------------
# Create post
# ---------------------------------------------------------------------------


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: PostCreate,
    user: AuthUser,
    session: AsyncSession = Session,
):
    # Check slug uniqueness
    existing = (
        await session.execute(select(Post).where(Post.slug == data.slug))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"Ya existe un post con slug '{data.slug}'"
        )

    post = Post(
        title=data.title,
        slug=data.slug,
        description=data.description,
        content=data.content,
        sidebar_label=data.sidebar_label or data.title,
        sidebar_position=data.sidebar_position,
        tags=data.tags,
        category_path=data.category_path,
        status=PostStatus.draft,
        author=user.username,
        author_display_name=user.display_name,
        version=1,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    return PostResponse.model_validate(post, from_attributes=True)


# ---------------------------------------------------------------------------
# Update post
# ---------------------------------------------------------------------------


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    data: PostUpdate,
    user: AuthUser,
    session: AsyncSession = Session,
):
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    # Only author or admin can edit
    if post.author != user.username and user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo el autor o un admin puede editar este post")

    # Published posts: only author can create a new draft (admin edits directly)
    if post.status == PostStatus.published and user.role != "admin":
        if post.author != user.username:
            raise HTTPException(status_code=403, detail="Solo el autor puede editar un post publicado")

    # Save revision before update
    revision = PostRevision(
        post_id=post.id,
        version=post.version,
        title=post.title,
        content=post.content,
        description=post.description,
        edited_by=user.username,
        change_summary=data.change_summary,
    )
    session.add(revision)

    # Apply updates
    update_data = data.model_dump(exclude_unset=True, exclude={"change_summary"})
    for key, value in update_data.items():
        setattr(post, key, value)

    post.version += 1
    post.updated_at = utcnow()

    # If it was rejected, pending, or published, move back to draft on edit
    if post.status in (PostStatus.rejected, PostStatus.pending_review, PostStatus.published):
        post.status = PostStatus.draft
        post.rejection_reason = None

    await session.commit()
    await session.refresh(post)

    return PostResponse.model_validate(post, from_attributes=True)


# ---------------------------------------------------------------------------
# Submit for review
# ---------------------------------------------------------------------------


@router.post("/{post_id}/submit", response_model=PostResponse)
async def submit_for_review(
    post_id: int,
    user: AuthUser,
    session: AsyncSession = Session,
):
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if post.status != PostStatus.draft:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden enviar a revisión posts en borrador (estado actual: {post.status})",
        )

    post.status = PostStatus.pending_review
    post.updated_at = utcnow()
    await session.commit()
    await session.refresh(post)

    return PostResponse.model_validate(post, from_attributes=True)


# ---------------------------------------------------------------------------
# Review (approve / reject)
# ---------------------------------------------------------------------------


@router.post("/{post_id}/review", response_model=PostResponse)
async def review_post(
    post_id: int,
    data: ReviewAction,
    user: AdminUser,
    session: AsyncSession = Session,
):
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if post.status != PostStatus.pending_review:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden revisar posts en estado 'pending_review'",
        )

    post.reviewer = user.username
    post.reviewer_display_name = user.display_name
    post.reviewed_at = utcnow()
    post.updated_at = utcnow()

    if data.action == "approve":
        post.status = PostStatus.approved
        post.rejection_reason = None
    elif data.action == "reject":
        post.status = PostStatus.rejected
        post.rejection_reason = data.reason
    elif data.action == "request_changes":
        post.status = PostStatus.draft
        post.rejection_reason = data.reason

    await session.commit()
    await session.refresh(post)

    return PostResponse.model_validate(post, from_attributes=True)


# ---------------------------------------------------------------------------
# Delete post
# ---------------------------------------------------------------------------


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    user: AdminUser,
    session: AsyncSession = Session,
):
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if post.status == PostStatus.published:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un post publicado. Despublicalo primero.",
        )

    await session.delete(post)
    await session.commit()


# ---------------------------------------------------------------------------
# Get revisions
# ---------------------------------------------------------------------------


@router.get("/{post_id}/revisions")
async def list_revisions(
    post_id: int,
    user: AuthUser,
    session: AsyncSession = Session,
):
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    query = (
        select(PostRevision)
        .where(PostRevision.post_id == post_id)
        .order_by(PostRevision.version.desc())
    )
    results = (await session.execute(query)).scalars().all()

    return [
        {
            "id": r.id,
            "version": r.version,
            "title": r.title,
            "editedBy": r.edited_by,
            "createdAt": r.created_at.isoformat(),
            "changeSummary": r.change_summary,
        }
        for r in results
    ]
