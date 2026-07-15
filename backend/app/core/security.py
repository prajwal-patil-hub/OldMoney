from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from jose import JWTError, jwt

from app.core.config import settings

ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=2,
    hash_len=32,
    salt_len=16,
)

ALGORITHM = "HS256"
# Issuer/audience claims scope tokens to this service so a token minted for a
# different app (sharing a key by mistake) can't be replayed here.
JWT_ISSUER = "oldmoney"
JWT_AUDIENCE = "oldmoney-api"


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(hashed_password: str) -> bool:
    return ph.check_needs_rehash(hashed_password)


def create_access_token(
    user_id: UUID,
    org_id: UUID | None,
    role: str | None,
    jti: str | None = None,
) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "org_id": str(org_id) if org_id else None,
        "role": role,
        "jti": jti or secrets.token_hex(16),
        "iat": now,
        "exp": expire,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate an access token.

    Raises JWTError on any failure — message is intentionally generic
    to avoid leaking validation details to callers.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
    except JWTError:
        raise JWTError("Token validation failed")
    if payload.get("type") != "access":
        raise JWTError("Token validation failed")
    return payload


def create_refresh_token() -> tuple[str, str]:
    """
    Returns (raw_token, token_hash).
    Store hash in DB; send raw token to client.
    """
    raw = secrets.token_urlsafe(64)
    token_hash = hash_token(raw)
    return raw, token_hash


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def get_refresh_token_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
