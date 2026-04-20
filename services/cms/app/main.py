"""Docs CMS — FastAPI application (API-only).

Architecture:
  /admin/api/v1/*       → JSON API (posts, media, publish, categories)
  /health               → Health check

The admin UI lives inside Docusaurus (React components at /admin/*).
This container ONLY serves the API — Traefik routes /admin/api/* here.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.config import settings
from app.database import async_session, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    # Ensure media directory exists
    Path(settings.media_dir).mkdir(parents=True, exist_ok=True)
    # Import existing docs from source directory into CMS database
    from app.api.publish import import_docs_on_startup

    async with async_session() as session:
        await import_docs_on_startup(session)
    yield
    # Shutdown


app = FastAPI(
    title=settings.project_name,
    docs_url="/admin/api/docs" if settings.debug else None,
    openapi_url="/admin/api/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

# --- Middleware ---
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API routes ---
from app.api.posts import router as posts_router
from app.api.media import router as media_router
from app.api.publish import router as publish_router
from app.api.assets import router as assets_router
from app.api.import_docx import router as import_docx_router

app.include_router(posts_router, prefix="/admin/api/v1")
app.include_router(media_router, prefix="/admin/api/v1")
app.include_router(publish_router, prefix="/admin/api/v1")
app.include_router(assets_router, prefix="/admin/api/v1")
app.include_router(import_docx_router, prefix="/admin/api/v1")


# --- Health ---
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "docs-cms"}


# --- Current user info ---
from app.auth import AuthUser


@app.get("/admin/api/v1/me")
async def get_me(user: AuthUser):
    """Return current user info (role, username, etc.)."""
    return {
        "username": user.username,
        "displayName": user.display_name,
        "role": user.role,
        "email": user.email,
    }
