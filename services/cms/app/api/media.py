"""Media upload/management API."""

import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select

from app.auth import AdminUser, AuthUser
from app.config import settings
from app.database import AsyncSession, get_session
from app.models import Media
from app.schemas import MediaListResponse, MediaResponse

router = APIRouter(prefix="/media", tags=["media"])

Session = Depends(get_session)

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _media_url(filename: str) -> str:
    return f"/admin/api/v1/media/file/{filename}"


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------


@router.post("/upload", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile,
    user: AuthUser,
    session: AsyncSession = Session,
):
    """Upload a file (image, PDF, document)."""
    if not file.content_type or file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed: {file.content_type}. "
            f"Allowed: {', '.join(sorted(ALLOWED_TYPES))}",
        )

    # Read and check size
    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(content) / 1024 / 1024:.1f} MB). "
            f"Max: {settings.max_upload_size_mb} MB",
        )

    # Generate unique filename
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"

    # Save to disk
    media_path = Path(settings.media_dir)
    media_path.mkdir(parents=True, exist_ok=True)
    file_path = media_path / unique_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Get image dimensions if applicable
    width, height = None, None
    if file.content_type and file.content_type.startswith("image/") and file.content_type != "image/svg+xml":
        try:
            from PIL import Image
            from io import BytesIO

            img = Image.open(BytesIO(content))
            width, height = img.size
        except Exception:
            pass

    # Save metadata to DB
    media = Media(
        filename=unique_name,
        original_name=file.filename or unique_name,
        content_type=file.content_type or "application/octet-stream",
        path=str(file_path),
        size=len(content),
        width=width,
        height=height,
        uploaded_by=user.username,
    )
    session.add(media)
    await session.commit()
    await session.refresh(media)

    resp = MediaResponse.model_validate(media, from_attributes=True)
    resp.url = _media_url(media.filename)
    return resp


# ---------------------------------------------------------------------------
# List media
# ---------------------------------------------------------------------------


@router.get("", response_model=MediaListResponse)
async def list_media(
    user: AuthUser,
    session: AsyncSession = Session,
    content_type: str | None = None,
):
    """List all uploaded media."""
    query = select(Media).order_by(Media.created_at.desc())
    if content_type:
        query = query.where(Media.content_type.startswith(content_type))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_q)).scalar_one()

    results = (await session.execute(query)).scalars().all()
    items = []
    for m in results:
        resp = MediaResponse.model_validate(m, from_attributes=True)
        resp.url = _media_url(m.filename)
        items.append(resp)

    return MediaListResponse(items=items, total=total)


# ---------------------------------------------------------------------------
# Serve file
# ---------------------------------------------------------------------------


@router.get("/file/{filename}")
async def serve_file(filename: str):
    """Serve an uploaded file."""
    media_root = Path(settings.media_dir).resolve()
    file_path = (media_root / filename).resolve()

    # Prevent path traversal (e.g. ../../etc/passwd)
    if not file_path.is_relative_to(media_root):
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    from starlette.responses import FileResponse

    return FileResponse(
        file_path,
        media_type=None,  # auto-detect
        filename=filename,
    )


# ---------------------------------------------------------------------------
# Delete media
# ---------------------------------------------------------------------------


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: int,
    user: AdminUser,
    session: AsyncSession = Session,
):
    """Delete an uploaded file."""
    media = await session.get(Media, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete file from disk
    try:
        os.remove(media.path)
    except OSError:
        pass

    await session.delete(media)
    await session.commit()
