"""DOCX to Markdown import endpoint."""

import tempfile
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from app.auth import AuthUser
from app.config import settings
from app.converter import extraer_imagenes_docx
from app.database import AsyncSession, get_session
from app.models import Media, utcnow

router = APIRouter(prefix="/import", tags=["import"])

DOCX_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

_CONTENT_TYPE_MAP: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}


class ImportResponse(BaseModel):
    content: str


@router.post("/docx", response_model=ImportResponse)
async def import_docx(
    file: UploadFile,
    user: AuthUser,
    session: AsyncSession = Depends(get_session),
):
    """
    Recibe un .docx, extrae imágenes → las sube al media del CMS,
    convierte el texto a Markdown y retorna { content: "..." }.
    """
    if file.content_type != DOCX_CONTENT_TYPE:
        raise HTTPException(
            status_code=400,
            detail="Solo se aceptan archivos .docx",
        )

    content_bytes = await file.read()

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Archivo demasiado grande. Máximo: {settings.max_upload_size_mb} MB",
        )

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            safe_name = Path(file.filename).name if file.filename else "documento.docx"
            docx_path = tmp_path / safe_name
            async with aiofiles.open(docx_path, "wb") as f:
                await f.write(content_bytes)

            # 1. Extraer imágenes al directorio temporal
            img_tmp_dir = tmp_path / "img"
            rutas_imagenes = extraer_imagenes_docx(docx_path, img_tmp_dir)

            # 2. Subir cada imagen al media del CMS
            media_urls: list[str] = []
            media_dir = Path(settings.media_dir)
            media_dir.mkdir(parents=True, exist_ok=True)

            for img_path in rutas_imagenes:
                ext = img_path.suffix.lower()
                unique_name = f"{uuid.uuid4().hex}{ext}"
                dest_path = media_dir / unique_name

                # Copiar bytes al media dir
                async with aiofiles.open(img_path, "rb") as f:
                    img_bytes = await f.read()
                async with aiofiles.open(dest_path, "wb") as f:
                    await f.write(img_bytes)

                ct = _CONTENT_TYPE_MAP.get(ext, "image/png")

                # Obtener dimensiones si es imagen rasterizada
                width, height = None, None
                if ct != "image/svg+xml":
                    try:
                        from io import BytesIO

                        from PIL import Image

                        img = Image.open(BytesIO(img_bytes))
                        width, height = img.size
                    except Exception:
                        pass

                # Guardar registro en BD
                media = Media(
                    filename=unique_name,
                    original_name=img_path.name,
                    content_type=ct,
                    path=str(dest_path),
                    size=len(img_bytes),
                    width=width,
                    height=height,
                    uploaded_by=user.username,
                    created_at=utcnow(),
                )
                session.add(media)

                media_urls.append(f"/admin/api/v1/media/file/{unique_name}")

            # 3. Convertir texto a Markdown con markitdown
            from markitdown import MarkItDown

            md_engine = MarkItDown(enable_plugins=True)
            result = md_engine.convert(str(docx_path))
            markdown = result.text_content

            # 4. Reemplazar data URIs base64 de markitdown por URLs del media, en orden.
            # markitdown embeds images as data:image/... URIs, sometimes wrapped in **...**
            # Use regex to match regardless of surrounding markdown syntax.
            import re as _re

            _img_iter = iter(media_urls)

            def _replace_img(match: "_re.Match[str]") -> str:
                url = next(_img_iter, None)
                if url is None:
                    return match.group(0)
                return f"![imagen]({url})"

            markdown = _re.sub(
                r'!\[[^\]]*\]\(data:image/[^)]+\)',
                _replace_img,
                markdown,
            )

            await session.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error al convertir el documento",
        ) from e

    return ImportResponse(content=markdown)
