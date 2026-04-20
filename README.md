# docusaurus-docs-template

<p>
  <img alt="Docusaurus" src="https://img.shields.io/badge/docusaurus-3.9-2c8ebb?logo=docusaurus&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/react-18-61dafb?logo=react&logoColor=black">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="Status" src="https://img.shields.io/badge/status-template-lightgrey">
</p>

> Docusaurus 3 + React 18 scaffold for a documentation site with MDX components, dark/light theme, local search, and an optional CMS + auth sidecar.

> **This is a scaffold / template.** It was derived from an internal documentation site and the domain-specific content has been stripped. Every page under `docs/` is a short placeholder you should replace with your own content. Internal URLs, container names, and copy have been replaced with generic placeholders (`docs.example.com`, `identity_api`, etc.) — search for `example.com` and `TODO` before going to production.

## Features

- **Docusaurus 3.9** static site generator with Mermaid and local (Lunr-based) search.
- **Dark / light mode** with user preference detection.
- **Reusable MDX components** (Alert, Card, CardGrid, Steps, TabGroup, Tab, DownloadButton, Kbd) under `src/components/`.
- **Optional CMS**: FastAPI backend (`services/cms`) with PostgreSQL, an MDXEditor-based admin UI (`src/components/Admin/`), and a draft → review → publish workflow.
- **Optional Auth sidecar**: FastAPI ForwardAuth service (`services/auth`) for Traefik, which validates sessions against any JWT/LDAP identity service.
- **Docker-first**: Compose variants (standalone, behind Traefik) + multi-stage Dockerfiles for Nginx and Python services.

## Quickstart

### Requirements

- **Node.js 18+** for Docusaurus.
- **Docker + Docker Compose** if you want to run the CMS / auth stack.
- **Python 3.14** only if you want to run the CMS or auth services locally without Docker.

### Run the docs site locally

```bash
git clone https://github.com/GDelpo/docusaurus-docs-template.git
cd docusaurus-docs-template
npm install
npm start                       # http://localhost:3000
```

Edit any file under `docs/` — the dev server hot-reloads.

### Deploy behind Traefik (production)

```bash
cp .env.example .env
# Edit .env: change passwords, point IDENTITY_* URLs at your own identity service.
docker compose --env-file .env -f docker/docker-compose.prod.traefik.yml up -d --build
```

The compose file expects a pre-existing `traefik-public` network and a host like `docs.example.com` that you should change to your own domain.

### Deploy standalone (no reverse proxy)

```bash
docker compose -f docker/docker-compose.prod.standalone.yml up -d --build
# -> http://localhost:8090
```

## Configuration

Variables are read from `.env` (copy from `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `IDENTITY_LOGIN_URL` | Identity service login endpoint (container-to-container). | `http://identity_api:8080/api/v1/login` |
| `IDENTITY_ME_URL` | Identity service "me" endpoint for JWT verification. | `http://identity_api:8080/api/v1/me` |
| `COOKIE_SECURE` | Set to `true` when serving over HTTPS. | `false` |
| `CMS_DB_USER` / `CMS_DB_PASSWORD` / `CMS_DB_NAME` | PostgreSQL credentials for the CMS. | `cms` / `changeme` / `cms` |
| `CMS_DEBUG` | Enables `/admin/api/docs` (Swagger UI). | `false` |
| `IDENTITY_SERVICE_URL` | Identity service base URL used by the CMS. | `http://identity_api:8080/api/v1` |
| `IDENTITY_EXTERNAL_URL` | Public-facing identity service URL (for browser redirects). | `https://example.com/identity/api/v1` |

## Architecture

Three containers behind Traefik when you use the full stack:

```
          +------------------+
          |     Traefik      |
          +--------+---------+
                   |
      +------------+-----------------+
      |            |                 |
   /auth/*     everything else   /admin/api/*
      |            |                 |
+-----v------+  +--v-----------+  +--v---------+
| Auth       |  |  Nginx       |  |  CMS API   |
| sidecar    |  |  (Docusaurus |  |  (FastAPI) |
| (FastAPI)  |  |   + Admin UI)|  +------+-----+
+-----+------+  +--------------+         |
      |                                  |
  Identity                          PostgreSQL
```

If you only want the static docs site, remove `services/` and the `auth` / `cms` / `cms_db` entries from the Traefik compose file.

### Container names

| Container | Image | Port | Role |
|-----------|-------|------|------|
| `docusaurus_docs` | Nginx | 80 | Static Docusaurus site + admin UI (React SPA) |
| `docs_auth` | FastAPI | 8000 | ForwardAuth: login, logout, session verification |
| `docs_cms` | FastAPI | 8000 | CMS API: posts, media, publishing |
| `docs_cms_db` | PostgreSQL 17 | 5432 | CMS database |

### Routing

| Route | Service | ForwardAuth | Purpose |
|-------|---------|-------------|---------|
| `docs.example.com/*` | Nginx | yes | Docs + Admin UI |
| `docs.example.com/auth/*` | Auth sidecar | no | Login / logout (must stay public) |
| `docs.example.com/admin/api/*` | CMS API | yes | CMS backend |

## Admin panel (optional CMS)

Lives at `/dashboard/` as React components integrated into Docusaurus:

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard/` | Overview | Dashboard with stats and shortcuts |
| `/dashboard/posts` | PostsList | List with filters, search, pagination |
| `/dashboard/new` | PostEditor | Create a new post with MDXEditor |
| `/dashboard/editor/:id` | PostEditor | Edit an existing post |
| `/dashboard/post/:id` | PostDetail | Post detail + workflow actions |
| `/dashboard/media` | MediaGallery | Upload / copy / delete media files |

Workflow:

```
Draft -> Submit for review -> Pending review
                                   |
                      Approve / Reject / Request changes
                                   |
                              Approved -> Publish -> index.md in docs/
```

Admin stack:

- **React 18** + React Query v5 (cache, mutations)
- **MDXEditor** (WYSIWYG Markdown editor)
- **Lucide React** (icons)
- Custom CSS with variables (scoped `adm-*` under `#admin-root`)
- Code splitting via `React.lazy()`

## CMS API

Base URL: `/admin/api/v1`

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/posts` | List posts (`page`, `status`, `category`, `author`, `search`) |
| `POST` | `/posts` | Create a post |
| `GET` | `/posts/{id}` | Get a post |
| `PUT` | `/posts/{id}` | Update a post |
| `DELETE` | `/posts/{id}` | Delete a post |
| `POST` | `/posts/{id}/submit` | Submit for review |
| `POST` | `/posts/{id}/review` | Review (`action`: approve / reject / request_changes) |
| `GET` | `/posts/{id}/revisions` | Revision history |

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/media/upload` | Upload a file (max 20 MB) |
| `GET` | `/media` | List files (`content_type`) |
| `GET` | `/media/file/{filename}` | Serve a file |
| `DELETE` | `/media/{id}` | Delete a file |

### Publishing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/publish/{id}` | Publish an approved post |
| `POST` | `/publish` | Publish all approved posts |
| `GET` | `/publish/categories` | List categories from the docs tree |

### Auth + Health

| Method | Endpoint | Service | Description |
|--------|----------|---------|-------------|
| `GET` | `/health` | CMS | Health check |
| `GET` | `/auth/login` | Auth sidecar | Login page |
| `POST` | `/auth/login` | Auth sidecar | Process login |
| `GET` | `/auth/logout` | Auth sidecar | Sign out |
| `GET` | `/verify` | Auth sidecar | ForwardAuth endpoint (Traefik) |

> Swagger UI is exposed at `/admin/api/docs` when `CMS_DEBUG=true`.

## Project layout

```
.
├── docs/                          # Docusaurus content (Markdown/MDX)
│   └── inicio/                    # Example section (replace with your own)
│       ├── welcome/index.md
│       └── structure-example/index.md
├── src/
│   ├── components/                # Reusable MDX components
│   │   ├── Alert/
│   │   ├── Card/
│   │   ├── CardGrid/
│   │   ├── Steps/
│   │   ├── TabGroup/
│   │   ├── DownloadButton/
│   │   ├── Kbd/
│   │   └── Admin/                 # Admin CMS UI (React)
│   ├── css/
│   └── pages/
├── plugins/
│   └── admin-cms/                 # Plugin registering the /dashboard route
├── services/
│   ├── auth/                      # ForwardAuth sidecar (FastAPI)
│   └── cms/                       # CMS backend (FastAPI + PostgreSQL)
├── docker/
│   ├── Dockerfile                 # Node build -> Nginx
│   ├── nginx.conf
│   ├── docker-compose.prod.traefik.yml
│   └── docker-compose.prod.standalone.yml
├── docusaurus.config.js
├── sidebars.js
├── deploy.sh
└── .env.example
```

## Content conventions

- Folders use `kebab-case`, no accents or spaces.
- Each page lives in `index.md` inside its folder, so assets can be co-located.
- Dates use ISO format (`YYYY-MM-DD`).
- Co-locate assets under `./assets/images/`, `./assets/downloads/`.

### Suggested frontmatter

```yaml
---
id: area-document
title: Document title
description: Short SEO description
pagination_label: Short label
pagination_next: null
pagination_prev: null
tags:
  - tag1
  - tag2
last_update:
  date: 2026-01-01
  author: Your Name
---
```

## Reusable MDX components

```jsx
import Alert from '@site/src/components/Alert';           // type: info|success|warning|danger|tip
import Card from '@site/src/components/Card';              // title, icon
import CardGrid from '@site/src/components/CardGrid';      // grid container
import { Steps, Step } from '@site/src/components/Steps';  // auto-numbered
import TabGroup from '@site/src/components/TabGroup';      // tabs
import Tab from '@site/src/components/TabGroup/Tab';       // label
import DownloadButton from '@site/src/components/DownloadButton';
import Kbd from '@site/src/components/Kbd';
```

## Migrations (CMS)

```bash
docker exec -it docs_cms alembic upgrade head
```

## Origin

This template was extracted from an internal documentation site. The Docusaurus structure, React components, CMS backend, and deployment setup are all reusable — only the prose content was stripped.

## Contributing

Issues and PRs welcome. Fork it and adapt freely.

## License

[MIT](LICENSE) © 2026 Guido Delponte
