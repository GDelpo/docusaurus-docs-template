"""Per-post asset management — images and downloadable files.

Each post stores assets under:
  media/{post_id}/images/     ← images used in the post body
  media/{post_id}/downloads/  ← downloadable files (PDF, Excel, etc.)

When published, assets are copied to:
  docs/{category_path}/{slug}/assets/images/
  docs/{category_path}/{slug}/assets/downloads/
"""

import shutil
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.auth import AdminUser, AuthUser
from app.config import settings
from app.database import AsyncSession, get_session
from app.models import Post

router = APIRouter(prefix="/posts/{post_id}/assets", tags=["assets"])

Session = Depends(get_session)

IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
DOWNLOAD_TYPES = {
    "application/pdf",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/x-msdownload",
    "application/octet-stream",
    "text/plain",
    "text/csv",
}
ALL_ALLOWED = IMAGE_TYPES | DOWNLOAD_TYPES


def _asset_dir(post_id: int, kind: str) -> Path:
    """Return the storage path for post assets."""
    return Path(settings.media_dir) / str(post_id) / kind


def _asset_url(post_id: int, kind: str, filename: str) -> str:
    return f"/admin/api/v1/posts/{post_id}/assets/{kind}/{filename}"


# ---------------------------------------------------------------------------
# Upload asset to a post
# ---------------------------------------------------------------------------


@router.post(
    "/{kind}",
    status_code=status.HTTP_201_CREATED,
)
async def upload_asset(
    post_id: int,
    kind: str,
    file: UploadFile,
    user: AuthUser,
    session: AsyncSession = Session,
):
    """Upload an asset (image or download) to a specific post."""
    if kind not in ("images", "downloads"):
        raise HTTPException(status_code=400, detail="Tipo debe ser 'images' o 'downloads'")

    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    # Validate file type
    ct = file.content_type or "application/octet-stream"
    if ct not in ALL_ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido: {ct}",
        )

    # For images folder, only accept images
    if kind == "images" and ct not in IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes en /images")

    # Read and check size
    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Archivo demasiado grande ({len(content) / 1024 / 1024:.1f} MB). "
            f"Máximo: {settings.max_upload_size_mb} MB",
        )

    # Preserve original name but make it safe (no path traversal)
    original = Path(file.filename).name if file.filename else f"{uuid.uuid4().hex}"
    # Sanitize: keep only safe chars
    safe_name = "".join(c if c.isalnum() or c in ".-_" else "_" for c in original)
    if not safe_name:
        safe_name = f"{uuid.uuid4().hex}"

    target_dir = _asset_dir(post_id, kind)
    target_dir.mkdir(parents=True, exist_ok=True)

    file_path = target_dir / safe_name
    # Avoid overwriting: append suffix if exists
    if file_path.exists():
        stem = file_path.stem
        ext = file_path.suffix
        safe_name = f"{stem}_{uuid.uuid4().hex[:6]}{ext}"
        file_path = target_dir / safe_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Get dimensions for images
    width, height = None, None
    if ct.startswith("image/") and ct != "image/svg+xml":
        try:
            from io import BytesIO
            from PIL import Image
            img = Image.open(BytesIO(content))
            width, height = img.size
        except Exception:
            pass

    return {
        "filename": safe_name,
        "originalName": file.filename or safe_name,
        "contentType": ct,
        "size": len(content),
        "width": width,
        "height": height,
        "kind": kind,
        "url": _asset_url(post_id, kind, safe_name),
        "markdownRef": f"![{safe_name}](./assets/{kind}/{safe_name})"
        if kind == "images"
        else f"[{file.filename or safe_name}](./assets/{kind}/{safe_name})",
    }


# ---------------------------------------------------------------------------
# List post assets
# ---------------------------------------------------------------------------


@router.get("")
async def list_post_assets(
    post_id: int,
    user: AuthUser,
    session: AsyncSession = Session,
):
    """List all assets for a post (images + downloads)."""
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    result = {"images": [], "downloads": []}
    for kind in ("images", "downloads"):
        asset_dir = _asset_dir(post_id, kind)
        if not asset_dir.exists():
            continue
        for f in sorted(asset_dir.iterdir()):
            if f.is_file() and not f.name.startswith("."):
                stat = f.stat()
                result[kind].append({
                    "filename": f.name,
                    "size": stat.st_size,
                    "kind": kind,
                    "url": _asset_url(post_id, kind, f.name),
                    "markdownRef": f"![{f.name}](./assets/{kind}/{f.name})"
                    if kind == "images"
                    else f"[{f.name}](./assets/{kind}/{f.name})",
                })

    return result


# ---------------------------------------------------------------------------
# Serve asset file
# ---------------------------------------------------------------------------


@router.get("/{kind}/{filename}")
async def serve_asset(post_id: int, kind: str, filename: str):
    """Serve a post asset file."""
    if kind not in ("images", "downloads"):
        raise HTTPException(status_code=400, detail="Tipo debe ser 'images' o 'downloads'")

    asset_root = _asset_dir(post_id, kind).resolve()
    file_path = (asset_root / filename).resolve()

    # Prevent path traversal
    if not file_path.is_relative_to(asset_root):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    from starlette.responses import FileResponse
    return FileResponse(file_path, media_type=None, filename=filename)


# ---------------------------------------------------------------------------
# Delete asset
# ---------------------------------------------------------------------------


@router.delete("/{kind}/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    post_id: int,
    kind: str,
    filename: str,
    user: AuthUser,
    session: AsyncSession = Session,
):
    """Delete a specific asset from a post."""
    if kind not in ("images", "downloads"):
        raise HTTPException(status_code=400, detail="Tipo debe ser 'images' o 'downloads'")

    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    # Only author or admin
    if post.author != user.username and user.role != "admin":
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar este recurso")

    asset_root = _asset_dir(post_id, kind).resolve()
    file_path = (asset_root / filename).resolve()

    if not file_path.is_relative_to(asset_root):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    file_path.unlink()


# ---------------------------------------------------------------------------
# Copy assets to docs on publish (called by publish.py)
# ---------------------------------------------------------------------------


def copy_post_assets_to_docs(post_id: int, target_doc_dir: Path):
    """Copy post assets from media/{post_id}/ to docs/{slug}/assets/."""
    source_root = Path(settings.media_dir) / str(post_id)
    if not source_root.exists():
        return

    for kind in ("images", "downloads"):
        src = source_root / kind
        if not src.exists():
            continue
        dst = target_doc_dir / "assets" / kind
        dst.mkdir(parents=True, exist_ok=True)
        for f in src.iterdir():
            if f.is_file():
                shutil.copy2(f, dst / f.name)
