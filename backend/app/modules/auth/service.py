from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from datetime import timezone as _tz

from app.core.config import settings


def _ensure_utc(dt: datetime | None) -> datetime | None:
    """Make a datetime timezone-aware (UTC) even if SQLite returned a naive one."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=_tz.utc)
    return dt
from app.core.exceptions import (
    AccountLockedError,
    AuthenticationError,
    ConflictError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_refresh_token_expiry,
    hash_password,
    hash_token,
    needs_rehash,
    verify_password,
)
from app.modules.auth.models import User
from app.modules.auth.repository import RefreshTokenRepository, UserRepository
from app.modules.auth.schemas import LoginResponse, TokenPair, UserOut

log = structlog.get_logger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_repo = RefreshTokenRepository(db)

    async def register(
        self,
        email: str,
        password: str,
        full_name: str,
    ) -> User:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictError("Email already registered")

        hashed = hash_password(password)
        user = await self.user_repo.create(
            email=email,
            hashed_password=hashed,
            full_name=full_name,
        )
        log.info("user_registered", user_id=str(user.id), email=email)
        return user

    async def login(
        self,
        email: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> LoginResponse:
        user = await self.user_repo.get_by_email(email)
        if not user:
            # Constant-time fake verify to prevent timing attacks
            hash_password("dummy-to-prevent-timing")
            raise AuthenticationError("Invalid email or password")

        # Check lockout
        now = datetime.now(UTC)
        locked_until = _ensure_utc(user.locked_until)
        if locked_until and locked_until > now:
            raise AccountLockedError(
                f"Account locked until {locked_until.isoformat()}"
            )

        if not verify_password(password, user.hashed_password):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                from datetime import timedelta
                user.locked_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
                log.warning("account_locked", user_id=str(user.id), email=email)
            await self.db.flush()
            raise AuthenticationError("Invalid email or password")

        # Successful login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = now

        if needs_rehash(user.hashed_password):
            user.hashed_password = hash_password(password)

        await self.db.flush()

        # Get primary org membership for token
        org_id, role = await self._get_primary_membership(user.id)

        tokens = await self._issue_tokens(
            user=user,
            org_id=org_id,
            role=role,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Reload user with memberships for response
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.memberships))
            .where(User.id == user.id)
        )
        user_with_memberships = result.scalar_one()

        log.info("user_logged_in", user_id=str(user.id))
        return LoginResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type="bearer",
            user=await self._build_user_out(user_with_memberships),
        )

    async def refresh(self, raw_token: str, ip_address: str | None = None) -> TokenPair:
        token_hash = hash_token(raw_token)
        token = await self.token_repo.get_by_hash(token_hash)

        if not token:
            raise AuthenticationError("Invalid refresh token")
        if token.revoked_at is not None:
            # Token reuse detected — revoke all tokens for this user
            await self.token_repo.revoke_all_for_user(token.user_id)
            log.warning("refresh_token_reuse_detected", user_id=str(token.user_id))
            raise AuthenticationError("Refresh token already used")
        if _ensure_utc(token.expires_at) < datetime.now(UTC):
            raise AuthenticationError("Refresh token expired")

        # Revoke old token
        await self.token_repo.revoke(token)

        user = await self.user_repo.get_by_id(token.user_id)
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")

        org_id, role = await self._get_primary_membership(user.id)
        return await self._issue_tokens(user=user, org_id=org_id, role=role, ip_address=ip_address)

    async def logout(self, raw_token: str) -> None:
        token_hash = hash_token(raw_token)
        token = await self.token_repo.get_by_hash(token_hash)
        if token and token.revoked_at is None:
            await self.token_repo.revoke(token)

    async def get_me(self, user_id: UUID) -> UserOut:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.memberships))
            .where(User.id == user_id, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise AuthenticationError("User not found")
        return await self._build_user_out(user)

    async def update_profile(
        self,
        user_id: UUID,
        full_name: str | None = None,
        email: str | None = None,
    ) -> UserOut:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")
        if email and email.lower() != user.email:
            existing = await self.user_repo.get_by_email(email)
            if existing:
                raise ConflictError("Email already in use")
            user.email = email.lower()
            user.is_email_verified = False
        if full_name:
            user.full_name = full_name
        await self.db.flush()
        return await self._build_user_out(user)

    async def change_password(
        self,
        user_id: UUID,
        current_password: str,
        new_password: str,
    ) -> None:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")
        if not verify_password(current_password, user.hashed_password):
            raise ValidationError("Current password is incorrect")
        user.hashed_password = hash_password(new_password)
        # Revoke all refresh tokens to force re-login
        await self.token_repo.revoke_all_for_user(user_id)
        await self.db.flush()
        log.info("password_changed", user_id=str(user_id))

    async def _get_primary_membership(self, user_id: UUID) -> tuple[UUID | None, str | None]:
        """Return the org_id and role of the first active membership."""
        from app.modules.organizations.models import Membership
        result = await self.db.execute(
            select(Membership)
            .where(
                Membership.user_id == user_id,
                Membership.is_active.is_(True),
                Membership.deleted_at.is_(None),
            )
            .limit(1)
        )
        membership = result.scalar_one_or_none()
        if membership:
            return membership.org_id, membership.role.value
        return None, None

    async def _issue_tokens(
        self,
        user: User,
        org_id: UUID | None,
        role: str | None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenPair:
        access_token = create_access_token(user.id, org_id, role)
        raw_refresh, refresh_hash = create_refresh_token()
        await self.token_repo.create(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=get_refresh_token_expiry(),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return TokenPair(access_token=access_token, refresh_token=raw_refresh)

    async def _build_user_out(self, user: User) -> UserOut:
        from app.modules.auth.schemas import MembershipOut
        from app.modules.organizations.models import Organization

        memberships = []
        for m in (user.memberships or []):
            if m.deleted_at is None and m.is_active:
                # Load org name
                result = await self.db.execute(
                    select(Organization).where(Organization.id == m.org_id)
                )
                org = result.scalar_one_or_none()
                memberships.append(
                    MembershipOut(
                        org_id=m.org_id,
                        org_name=org.name if org else "Unknown",
                        role=m.role.value,
                        is_active=m.is_active,
                    )
                )
        return UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superadmin=user.is_superadmin,
            is_email_verified=user.is_email_verified,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            memberships=memberships,
        )
