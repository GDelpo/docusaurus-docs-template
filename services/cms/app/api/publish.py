"""Publish approved posts to the Docusaurus docs/ directory."""

import asyncio
import json
import logging
import os
import re
import shlex
import subprocess
import shutil as _shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update

from app.auth import AdminUser, AuthUser
from app.config import settings
from app.database import AsyncSession, async_session, get_session
from app.api.assets import copy_post_assets_to_docs
from app.models import Media, Post, PostStatus, utcnow
from app.schemas import PublishResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/publish", tags=["publish"])

Session = Depends(get_session)


def _extract_description(content: str, max_length: int = 150) -> str:
    """Extract a plain-text description from markdown content.

    Used as auto-generated description when contributors don't provide one.
    """
    if not content:
        return ""
    text = re.sub(r"^#{1,6}\s+", "", content, flags=re.MULTILINE)
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\(.*?\)", r"\1", text)
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", text)
    text = re.sub(r"^>\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"---+", "", text)
    text = re.sub(r":::.*", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) > max_length:
        text = text[:max_length]
        last_space = text.rfind(" ")
        if last_space > max_length // 2:
            text = text[:last_space]
        text += "..."

    return text


def _generate_frontmatter(post: Post) -> str:
    """Generate Docusaurus-compatible frontmatter."""
    tags = [t.strip() for t in post.tags.split(",") if t.strip()]
    description = (post.description or "").strip()
    if not description:
        description = _extract_description(post.content)
    description = description.replace('"', '\\"')
    title = post.title.replace('"', '\\"')
    sidebar = (post.sidebar_label or post.title).replace('"', '\\"')
    author = post.author_display_name or post.author
    pub_date = (post.published_at or post.created_at).strftime("%Y-%m-%d")

    lines = [
        "---",
        f'id: {post.slug}',
        f'title: "{title}"',
        f'description: "{description}"',
        f'sidebar_label: "{sidebar}"',
        f"sidebar_position: {post.sidebar_position}",
    ]

    if tags:
        lines.append("tags:")
        for tag in tags:
            lines.append(f"  - {tag}")

    lines.extend(
        [
            f'pagination_label: "{sidebar}"',
            "pagination_next: null",
            "pagination_prev: null",
            "last_update:",
            f"  date: {pub_date}",
            f"  author: {author}",
            "---",
        ]
    )
    return "\n".join(lines)


# Pattern: ![alt](/admin/api/v1/media/file/{filename})
_MEDIA_URL_RE = re.compile(
    r"!\[([^\]]*)\]\(/admin/api/v1/media/file/([^)]+)\)"
)


def _rewrite_media_urls(content: str, target_dir: Path) -> str:
    """Rewrite global media URLs to relative ./assets/images/ paths.

    For each match, copy the media file from the global media dir
    to the post's assets/images/ directory.
    """
    media_root = Path(settings.media_dir)
    images_dir = target_dir / "assets" / "images"

    def _replace(m):
        alt, filename = m.group(1), m.group(2)
        src = media_root / filename
        if src.is_file():
            _shutil.copy2(src, images_dir / filename)
            logger.info("Copied global media %s → assets/images/", filename)
        else:
            logger.warning("Global media file not found: %s", filename)
        return f"![{alt}](./assets/images/{filename})"

    return _MEDIA_URL_RE.sub(_replace, content)


def _write_post_to_docs(post: Post) -> str:
    """Write a post as an index.md file in the docs directory.

    Creates: docs_dir / category_path / slug / index.md
    Plus:    .../assets/images/  and  .../assets/downloads/
    """
    target_dir = Path(settings.docs_dir) / post.category_path / post.slug
    target_dir.mkdir(parents=True, exist_ok=True)

    (target_dir / "assets" / "images").mkdir(parents=True, exist_ok=True)
    (target_dir / "assets" / "downloads").mkdir(parents=True, exist_ok=True)

    # Rewrite global media URLs to relative paths and copy files
    published_content = _rewrite_media_urls(post.content, target_dir)

    target_file = target_dir / "index.md"
    frontmatter = _generate_frontmatter(post)
    full_content = f"{frontmatter}\n\n{published_content}\n"

    target_file.write_text(full_content, encoding="utf-8")

    # Copy post assets (images, downloads) to docs directory
    copy_post_assets_to_docs(post.id, target_dir)

    rel_path = str(target_file.relative_to(settings.docs_dir))
    logger.info("Wrote post '%s' to %s", post.slug, rel_path)
    return rel_path


def _trigger_docs_rebuild(post_ids: list[int]):
    """Fire-and-forget: start rebuild + status update as a background task."""
    asyncio.get_running_loop().create_task(_rebuild_and_update_statuses(post_ids))


def _run_rebuild_sync(cmd: str) -> bool:
    """Run the rebuild command synchronously (executed in thread pool)."""
    log_file = Path(settings.media_dir).parent / "rebuild.log"
    try:
        with open(log_file, "a", encoding="utf-8") as fh:
            fh.write(f"\n--- rebuild triggered at {datetime.utcnow().isoformat()} ---\n")
            fh.write(f"cmd: {cmd}\n")
            fh.flush()
            result = subprocess.run(
                shlex.split(cmd),
                stdout=fh,
                stderr=subprocess.STDOUT,
                timeout=300,  # 5 min max
            )
            fh.write(f"--- exit code: {result.returncode} ---\n")
        if result.returncode == 0:
            logger.info("Docs rebuild completed successfully")
            return True
        logger.warning("Docs rebuild failed with exit code %d — see %s", result.returncode, log_file)
        return False
    except subprocess.TimeoutExpired:
        logger.error("Docs rebuild timed out after 300s")
        return False
    except Exception as exc:
        logger.error("Docs rebuild error: %s", exc)
        return False


async def _rebuild_and_update_statuses(post_ids: list[int]):
    """Background coroutine: run rebuild in thread pool, then update DB."""
    cmd = settings.rebuild_command
    if not cmd:
        logger.info("No rebuild_command configured, skipping docs rebuild")
        success = True
    else:
        logger.info("Triggering docs rebuild: %s", cmd)
        success = await asyncio.to_thread(_run_rebuild_sync, cmd)

    final_status = PostStatus.published if success else PostStatus.approved
    try:
        async with async_session() as session:
            now = utcnow()
            values = {"status": final_status, "updated_at": now}
            if final_status == PostStatus.published:
                values["published_at"] = now
            stmt = update(Post).where(Post.id.in_(post_ids)).values(**values)
            await session.execute(stmt)
            await session.commit()
            logger.info("Posts %s → %s", post_ids, final_status.value)
    except Exception as exc:
        logger.error("Failed to update post statuses: %s", exc)


# ---------------------------------------------------------------------------
# Publish single post
# ---------------------------------------------------------------------------


@router.post("/{post_id}", response_model=PublishResponse)
async def publish_post(
    post_id: int,
    user: AdminUser,
    session: AsyncSession = Session,
):
    """Publish a single approved post to the docs directory."""
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if post.status != PostStatus.approved:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden publicar posts aprobados (estado actual: {post.status})",
        )

    file_path = _write_post_to_docs(post)

    post.status = PostStatus.publishing
    post.updated_at = utcnow()
    await session.commit()

    _trigger_docs_rebuild([post.id])

    return PublishResponse(
        published_count=1,
        file_paths=[file_path],
        message=f"Post '{post.title}' publicándose — estará disponible en unos minutos",
    )


# ---------------------------------------------------------------------------
# Publish all approved
# ---------------------------------------------------------------------------


@router.post("", response_model=PublishResponse)
async def publish_all_approved(
    user: AdminUser,
    session: AsyncSession = Session,
):
    """Publish all approved posts to the docs directory."""
    query = select(Post).where(Post.status == PostStatus.approved)
    posts = (await session.execute(query)).scalars().all()

    if not posts:
        return PublishResponse(
            published_count=0,
            file_paths=[],
            message="No hay posts aprobados para publicar",
        )

    file_paths = []
    now = utcnow()
    post_ids = []

    for post in posts:
        path = _write_post_to_docs(post)
        file_paths.append(path)
        post_ids.append(post.id)
        post.status = PostStatus.publishing
        post.updated_at = now

    await session.commit()

    _trigger_docs_rebuild(post_ids)

    return PublishResponse(
        published_count=len(file_paths),
        file_paths=file_paths,
        message=f"Publicando {len(file_paths)} post(s) — estarán disponibles en unos minutos",
    )


# ---------------------------------------------------------------------------
# Categories (read from docs filesystem)
# ---------------------------------------------------------------------------


@router.get("/categories")
async def list_categories(user: AuthUser):
    """List available doc categories by scanning the docs source directory."""
    # Prefer docs_source_dir (read-only mount of Docusaurus source)
    # Fallback to docs_dir (published content volume)
    source = Path(settings.docs_source_dir)
    if not source.exists() or not any(source.iterdir()):
        source = Path(settings.docs_dir)
    if not source.exists():
        return []

    return _scan_categories(source, "")


def _scan_categories(base: Path, relative: str) -> list[dict]:
    """Recursively scan for _category_.json files."""
    categories = []

    for item in sorted(base.iterdir()):
        if not item.is_dir() or item.name.startswith((".", "_", "node_modules", "assets")):
            continue

        # Directories with index.md/mdx are doc entries, not categories
        if (item / "index.md").exists() or (item / "index.mdx").exists():
            continue

        cat_path = relative + "/" + item.name if relative else item.name
        cat_json = item / "_category_.json"

        label = item.name.replace("-", " ").title()
        position = 0

        if cat_json.exists():
            try:
                data = json.loads(cat_json.read_text(encoding="utf-8"))
                label = data.get("label", label)
                position = data.get("position", 0)
            except (json.JSONDecodeError, OSError):
                pass

        children = _scan_categories(item, cat_path)

        categories.append(
            {
                "label": label,
                "path": cat_path,
                "position": position,
                "children": children,
            }
        )

    categories.sort(key=lambda c: c["position"])
    return categories


# ---------------------------------------------------------------------------
# Scan existing docs + assets (admin view)
# ---------------------------------------------------------------------------


@router.get("/existing-docs")
async def list_existing_docs(user: AdminUser):
    """Scan docs directory for existing documents with their assets."""
    docs_path = Path(settings.docs_dir)
    if not docs_path.exists():
        return []

    return _scan_docs_recursive(docs_path, docs_path)


def _scan_docs_recursive(base: Path, docs_root: Path) -> list[dict]:
    """Recursively scan for index.md and their associated assets."""
    results = []

    for item in sorted(base.iterdir()):
        if not item.is_dir() or item.name.startswith((".", "_", "node_modules")):
            continue

        # Skip assets directories themselves
        if item.name == "assets":
            continue

        index_md = item / "index.md"
        rel = str(item.relative_to(docs_root)).replace("\\", "/")

        if index_md.exists():
            # This is a document directory
            doc_info = {
                "path": rel,
                "slug": item.name,
                "hasIndex": True,
                "assets": {"images": [], "downloads": []},
            }

            # Parse basic frontmatter
            try:
                content = index_md.read_text(encoding="utf-8")
                if content.startswith("---"):
                    end = content.index("---", 3)
                    fm_block = content[3:end]
                    for line in fm_block.split("\n"):
                        line = line.strip()
                        if line.startswith("title:"):
                            doc_info["title"] = line[6:].strip()
                        elif line.startswith("sidebar_label:"):
                            doc_info["sidebarLabel"] = line[14:].strip()
            except (ValueError, OSError):
                pass

            # Scan assets
            assets_dir = item / "assets"
            if assets_dir.exists():
                for kind in ("images", "downloads"):
                    kind_dir = assets_dir / kind
                    if kind_dir.exists():
                        for f in sorted(kind_dir.iterdir()):
                            if f.is_file():
                                doc_info["assets"][kind].append({
                                    "filename": f.name,
                                    "size": f.stat().st_size,
                                })

                # Also check legacy patterns (imgs, img, descargas, download)
                for legacy, target in [
                    ("imgs", "images"), ("img", "images"),
                    ("descargas", "downloads"), ("download", "downloads"),
                ]:
                    legacy_dir = assets_dir / legacy
                    if legacy_dir.exists():
                        for f in sorted(legacy_dir.iterdir()):
                            if f.is_file():
                                doc_info["assets"][target].append({
                                    "filename": f.name,
                                    "size": f.stat().st_size,
                                    "legacy": True,
                                    "legacyPath": legacy,
                                })

            results.append(doc_info)

        # Recurse into subdirectories to find more docs
        children = _scan_docs_recursive(item, docs_root)
        results.extend(children)

    return results


# ---------------------------------------------------------------------------
# Import existing docs into CMS database
# ---------------------------------------------------------------------------

_YAML_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Extract YAML-like frontmatter and body from markdown text."""
    m = _YAML_RE.match(text)
    if not m:
        return {}, text

    fm: dict = {}
    tags: list[str] = []
    in_tags = False
    last_update_date = ""
    last_update_author = ""
    in_last_update = False

    for line in m.group(1).split("\n"):
        stripped = line.strip()

        # Handle indented list items under tags:
        if in_tags:
            if stripped.startswith("- "):
                tags.append(stripped[2:].strip())
                continue
            else:
                in_tags = False

        # Handle indented keys under last_update:
        if in_last_update:
            if stripped.startswith("date:"):
                last_update_date = stripped[5:].strip()
                continue
            elif stripped.startswith("author:"):
                last_update_author = stripped[7:].strip()
                continue
            elif line and not line[0].isspace():
                in_last_update = False
            else:
                continue

        if stripped.startswith("tags:"):
            in_tags = True
            continue
        if stripped.startswith("last_update:"):
            in_last_update = True
            continue

        if ":" in stripped:
            key, _, val = stripped.partition(":")
            fm[key.strip()] = val.strip()

    if tags:
        fm["tags"] = tags
    if last_update_date:
        fm["last_update_date"] = last_update_date
    if last_update_author:
        fm["last_update_author"] = last_update_author

    body = text[m.end():]
    return fm, body


def _scan_importable_docs(
    base: Path, docs_root: Path
) -> list[tuple[str, str, Path]]:
    """Recursively find all importable index.md files.

    Returns list of (category_path, slug, file_path).
    """
    results = []

    for item in sorted(base.iterdir()):
        if not item.is_dir() or item.name.startswith((".", "_", "node_modules")):
            continue
        if item.name == "assets":
            continue

        index_md = item / "index.md"
        if not index_md.exists():
            index_md = item / "index.mdx"

        if index_md.exists():
            rel = item.relative_to(docs_root)
            parts = rel.parts
            if len(parts) >= 2:
                category_path = "/".join(parts[:-1])
                slug = parts[-1]
            elif len(parts) == 1:
                category_path = ""
                slug = parts[0]
            else:
                continue
            results.append((category_path, slug, index_md))

        # Recurse
        children = _scan_importable_docs(item, docs_root)
        results.extend(children)

    return results


async def import_docs_on_startup(session: AsyncSession) -> None:
    """Import existing Docusaurus docs into the CMS database.

    Called automatically during app startup. Idempotent — skips docs whose
    slug already exists in the database.
    """
    source = Path(settings.docs_source_dir)
    if not source.exists():
        logger.warning("docs source dir %s not found, skipping import", source)
        return

    docs = _scan_importable_docs(source, source)
    if not docs:
        logger.info("No importable docs found in %s", source)
        return

    existing = (await session.execute(select(Post.slug))).scalars().all()
    existing_slugs = set(existing)

    imported = 0
    skipped = 0
    now = utcnow()

    for category_path, slug, file_path in docs:
        if slug in existing_slugs:
            skipped += 1
            continue

        try:
            text = file_path.read_text(encoding="utf-8")
            fm, body = _parse_frontmatter(text)

            title = fm.get("title", slug.replace("-", " ").title())
            description = fm.get("description", "")
            sidebar_label = fm.get("sidebar_label", title)

            try:
                sidebar_position = int(fm.get("sidebar_position", 0))
            except (ValueError, TypeError):
                sidebar_position = 0

            tags_list = fm.get("tags", [])
            if isinstance(tags_list, str):
                tags_str = tags_list
            else:
                tags_str = ", ".join(tags_list)

            author_name = fm.get("last_update_author", "system")

            # Use last_update date from frontmatter if available
            doc_date = now
            raw_date = fm.get("last_update_date", "")
            if raw_date:
                try:
                    doc_date = datetime.strptime(raw_date, "%Y-%m-%d")
                except ValueError:
                    pass

            post = Post(
                title=title,
                slug=slug,
                description=description,
                content=body.strip(),
                sidebar_label=sidebar_label,
                sidebar_position=sidebar_position,
                tags=tags_str,
                category_path=category_path,
                status=PostStatus.published,
                author="system",
                author_display_name=author_name,
                created_at=doc_date,
                updated_at=doc_date,
                published_at=doc_date,
                version=1,
            )
            session.add(post)
            existing_slugs.add(slug)
            imported += 1

        except Exception as exc:
            logger.warning("Error importing %s: %s", file_path, exc)

    await session.commit()
    logger.info("Startup import: %d imported, %d skipped (already exist)", imported, skipped)
