"""Authentication dependencies — validates JWT against identity service."""

from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request, status

from app.config import settings
from app.schemas import CurrentUser

ADMIN_ROLE = "admin"


async def get_current_user(request: Request) -> CurrentUser:
    """Extract and validate JWT token from Authorization header or cookie."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.identity_service_url}/me",
                headers={"Authorization": f"Bearer {token}"},
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de identity no disponible",
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    data = resp.json()
    return CurrentUser(
        username=data.get("userName", data.get("username", "")),
        display_name=data.get("displayName", data.get("display_name", "")),
        role=data.get("role", "employee"),
        email=data.get("mail", data.get("email", "")),
    )


async def get_admin_user(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Require admin role."""
    if user.role != ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return user


def _extract_token(request: Request) -> str | None:
    """Try Authorization header first, then docs_session cookie."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]

    return request.cookies.get("docs_session")


# Annotated aliases
AuthUser = Annotated[CurrentUser, Depends(get_current_user)]
AdminUser = Annotated[CurrentUser, Depends(get_admin_user)]
