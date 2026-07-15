from __future__ import annotations

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_access_token

log = structlog.get_logger(__name__)

security = HTTPBearer(auto_error=False)


async def get_db_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    return db


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Decode JWT and return the current user model."""
    from app.modules.auth.models import User

    if not credentials:
        raise AuthenticationError("Missing authorization token")

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        # Do not surface internal JWT error details to callers
        raise AuthenticationError("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Token missing subject")

    result = await db.execute(
        select(User).where(User.id == UUID(user_id), User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise AuthenticationError("User not found")
    if not user.is_active:
        raise AuthenticationError("User account is disabled")

    # Stateless access-token revocation: reject tokens issued before the user's
    # session cutoff (set on password change / global logout).
    cutoff = user.sessions_valid_after
    iat = payload.get("iat")
    if cutoff is not None and iat is not None:
        from datetime import UTC, datetime, timezone

        issued_at = datetime.fromtimestamp(int(iat), tz=UTC)
        if cutoff.tzinfo is None:
            cutoff = cutoff.replace(tzinfo=timezone.utc)
        if issued_at < cutoff:
            raise AuthenticationError("Session expired, please sign in again")

    # Bind context for logging
    structlog.contextvars.bind_contextvars(
        user_id=str(user.id),
        org_id=payload.get("org_id"),
    )

    # Attach token payload to request state for role checks
    request.state.token_payload = payload
    request.state.current_user = user
    return user


async def get_current_active_user(user=Depends(get_current_user)):
    return user


CurrentUser = Annotated[object, Depends(get_current_user)]


def get_token_payload(request: Request) -> dict:
    payload = getattr(request.state, "token_payload", None)
    if payload is None:
        raise AuthenticationError("No token payload")
    return payload


def require_role(*allowed_roles: str):
    """Dependency factory: require one of the given roles in the token."""

    async def _check(request: Request, user=Depends(get_current_user)) -> object:
        payload = getattr(request.state, "token_payload", {})
        role = payload.get("role")
        if role not in allowed_roles:
            raise AuthorizationError(
                f"Required role: {allowed_roles}, got: {role}"
            )
        return user

    return _check


def require_org(allow_superadmin: bool = True):
    """Dependency: ensure current token has an org_id."""

    async def _check(request: Request, user=Depends(get_current_user)) -> tuple:
        payload = getattr(request.state, "token_payload", {})
        org_id_str = payload.get("org_id")
        role = payload.get("role")

        is_superadmin = getattr(user, "is_superadmin", False)
        if allow_superadmin and is_superadmin:
            return user, None, "SUPERADMIN"

        if not org_id_str:
            raise AuthorizationError("No organization context in token")

        return user, UUID(org_id_str), role

    return _check
