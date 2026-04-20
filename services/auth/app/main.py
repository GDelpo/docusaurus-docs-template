"""Docs - Auth Sidecar.

Minimal microservice that handles web authentication for the docs site.
All credential validation is delegated to the identity service.

Flow:
  1. Browser requests docs.example.com/<anything>
  2. Traefik ForwardAuth calls /verify
  3. /verify reads the JWT cookie and calls identity /api/v1/me
  4. If identity responds 200, the session is valid and Traefik serves the page
  5. Otherwise, 302 -> /auth/login
  6. User logs in -> POST /auth/login -> calls identity /login
  7. Identity validates (LDAP/DB) -> returns JWT -> stored in cookie
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import quote

import httpx
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates

from app.config import settings

# Logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Templates
templates = Jinja2Templates(directory="app/templates")


# =============================================================================
# Lifespan
# =============================================================================


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifecycle — create and close shared HTTP client."""
    _app.state.http_client = httpx.AsyncClient(timeout=10.0)
    logger.info("HTTP client created")
    yield
    await _app.state.http_client.aclose()
    logger.info("HTTP client closed")


# App
app = FastAPI(
    title=settings.project_name,
    lifespan=lifespan,
    docs_url="/auth/docs" if settings.debug else None,
    redoc_url=None,
    openapi_url="/auth/openapi.json" if settings.debug else None,
)


# =============================================================================
# Helpers
# =============================================================================


def _validate_redirect(redirect: str) -> str:
    """Validate that the redirect is a relative path (prevents open redirect)."""
    if not redirect or not redirect.startswith("/"):
        return "/"
    return redirect


def _build_login_redirect(request: Request) -> str:
    """Build redirect URL to the login page using X-Forwarded-* headers."""
    original_host = request.headers.get("X-Forwarded-Host", "docs.example.com")
    original_proto = request.headers.get("X-Forwarded-Proto", "http")
    original_uri = request.headers.get("X-Forwarded-Uri", "/")
    return f"{original_proto}://{original_host}/auth/login?redirect={quote(original_uri, safe='/')}"


# =============================================================================
# ForwardAuth endpoint (called by Traefik internally)
# =============================================================================


@app.get("/verify")
async def verify(request: Request):
    """ForwardAuth endpoint. Traefik calls it on every request to docs.

    - 200: valid session (JWT verified by identity), let it through
    - 302: no session or invalid, redirect to login
    """
    token = request.cookies.get(settings.cookie_name)

    if token:
        try:
            # Validate JWT by calling the identity service
            client: httpx.AsyncClient = request.app.state.http_client
            response = await client.get(
                settings.identity_me_url,
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 200:
                user_data = response.json()
                logger.debug("Valid session: %s", user_data.get("userName", user_data.get("user_name", "")))
                return Response(
                    status_code=200,
                    headers={
                        "X-Auth-User": user_data.get("userName", user_data.get("user_name", "")),
                        "X-Auth-Role": user_data.get("role", ""),
                    },
                )

            if response.status_code == 401:
                logger.info("Expired or invalid JWT")
            else:
                logger.warning("Unexpected response from identity: %s", response.status_code)

        except httpx.RequestError as e:
            logger.error("Error connecting to identity for verification: %s", e)
            # Fail-close: if identity does not respond, redirect to login
            # (security over availability)

    # No valid session -> redirect to login
    redirect_url = _build_login_redirect(request)
    return RedirectResponse(url=redirect_url, status_code=302)


# =============================================================================
# Login
# =============================================================================


@app.get("/auth/login", response_class=HTMLResponse)
async def login_page(request: Request, redirect: str = "/", error: str | None = None):
    """Login page."""
    # If already authenticated (cookie with valid JWT), redirect
    token = request.cookies.get(settings.cookie_name)
    if token:
        try:
            client = request.app.state.http_client
            response = await client.get(
                settings.identity_me_url,
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code == 200:
                return RedirectResponse(url=_validate_redirect(redirect), status_code=302)
        except httpx.RequestError:
            pass  # Ignore error, show login

    return templates.TemplateResponse("login.html", {
        "request": request,
        "redirect": redirect,
        "error": error,
    })


@app.post("/auth/login")
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    redirect: str = Form("/"),
):
    """Process the login form. Validates against the identity service."""
    redirect = _validate_redirect(redirect)

    try:
        client = request.app.state.http_client
        response = await client.post(
            settings.identity_login_url,
            data={"username": username, "password": password},
        )

        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("accessToken", token_data.get("access_token", ""))

            if not access_token:
                logger.error("Identity did not return access_token")
                return templates.TemplateResponse("login.html", {
                    "request": request,
                    "redirect": redirect,
                    "error": "Authentication service error",
                }, status_code=500)

            logger.info("Login successful: %s", username)

            resp = RedirectResponse(url=redirect, status_code=302)
            resp.set_cookie(
                key=settings.cookie_name,
                value=access_token,  # Store the JWT directly
                httponly=True,
                samesite="lax",
                secure=settings.cookie_secure,
                path="/",
                # We don't set max_age - expiration is controlled by the JWT
            )
            return resp

        # Invalid credentials or other error
        error_detail = ""
        try:
            error_body = response.json()
            error_detail = error_body.get("message", error_body.get("detail", ""))
        except Exception:
            pass

        logger.info("Login failed for '%s': %s", username, error_detail or response.status_code)

        return templates.TemplateResponse("login.html", {
            "request": request,
            "redirect": redirect,
            "error": error_detail or "Invalid credentials",
        }, status_code=401)

    except httpx.RequestError as e:
        logger.error("Error connecting to identity service: %s", e)
        return templates.TemplateResponse("login.html", {
            "request": request,
            "redirect": redirect,
            "error": "Authentication service unavailable",
        }, status_code=503)


# =============================================================================
# Logout
# =============================================================================


@app.get("/auth/logout")
async def logout(redirect: str = "/auth/login"):
    """Log out (clears cookie) and redirect to login.

    The `redirect` parameter allows returning to a specific URL after login.
    Example: /auth/logout?redirect=%2Fdashboard -> redirects to /auth/login?redirect=/dashboard
    """
    if redirect != "/auth/login" and redirect.startswith("/"):
        target = f"/auth/login?redirect={quote(redirect, safe='/')}"
    else:
        target = "/auth/login"
    resp = RedirectResponse(url=target, status_code=302)
    resp.delete_cookie(key=settings.cookie_name, path="/")
    return resp


# =============================================================================
# Health
# =============================================================================


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.project_name}


