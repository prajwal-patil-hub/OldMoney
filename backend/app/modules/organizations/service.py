from __future__ import annotations

import re
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.exceptions import (
    AuthorizationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.core.security import create_access_token
from app.modules.auth.models import User
from app.modules.organizations.models import MemberRole, Organization
from app.modules.organizations.repository import MembershipRepository, OrganizationRepository
from app.modules.organizations.schemas import MemberOut, OrgOut

log = structlog.get_logger(__name__)

_ADMIN_ROLES = {MemberRole.SUPERADMIN, MemberRole.ORG_ADMIN}


def _slugify(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug).strip("-")
    return slug[:100]


class OrganizationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.org_repo = OrganizationRepository(db)
        self.member_repo = MembershipRepository(db)

    async def create_org(
        self,
        name: str,
        creator_id: UUID,
        slug: str | None = None,
        plan: str = "free",
        settings: dict | None = None,
    ) -> OrgOut:
        final_slug = slug or _slugify(name)
        # Ensure slug uniqueness
        existing = await self.org_repo.get_by_slug(final_slug)
        if existing:
            import secrets
            final_slug = f"{final_slug}-{secrets.token_hex(3)}"

        org = await self.org_repo.create(
            name=name,
            slug=final_slug,
            plan=plan,
            settings=settings or {},
        )
        # Add creator as ORG_ADMIN
        await self.member_repo.create(
            user_id=creator_id,
            org_id=org.id,
            role=MemberRole.ORG_ADMIN,
            invited_by=None,
        )
        log.info("organization_created", org_id=str(org.id), creator_id=str(creator_id))
        return OrgOut.model_validate(org)

    async def list_orgs(self, user_id: UUID) -> list[OrgOut]:
        orgs = await self.org_repo.list_for_user(user_id)
        return [OrgOut.model_validate(o) for o in orgs]

    async def get_org(self, org_id: UUID, user_id: UUID) -> OrgOut:
        await self._assert_member(user_id, org_id)
        org = await self.org_repo.get_by_id(org_id)
        if not org:
            raise NotFoundError("Organization not found")
        return OrgOut.model_validate(org)

    async def update_org(
        self,
        org_id: UUID,
        user_id: UUID,
        **kwargs,  # type: ignore[type-arg]
    ) -> OrgOut:
        await self._assert_role(user_id, org_id, _ADMIN_ROLES)
        org = await self.org_repo.get_by_id(org_id)
        if not org:
            raise NotFoundError("Organization not found")
        update_data = {k: v for k, v in kwargs.items() if v is not None}
        org = await self.org_repo.update(org, **update_data)
        return OrgOut.model_validate(org)

    async def invite_member(
        self,
        org_id: UUID,
        inviter_id: UUID,
        email: str,
        role: MemberRole,
    ) -> MemberOut:
        await self._assert_role(inviter_id, org_id, _ADMIN_ROLES)

        result = await self.db.execute(
            select(User).where(User.email == email.lower(), User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError(f"No user with email {email}")

        existing = await self.member_repo.get(user.id, org_id)
        if existing:
            raise ConflictError("User is already a member of this organization")

        membership = await self.member_repo.create(
            user_id=user.id,
            org_id=org_id,
            role=role,
            invited_by=inviter_id,
        )
        return MemberOut(
            id=membership.id,
            user_id=membership.user_id,
            org_id=membership.org_id,
            role=membership.role,
            is_active=membership.is_active,
            email=user.email,
            full_name=user.full_name,
            created_at=membership.created_at,
        )

    async def list_members(self, org_id: UUID, user_id: UUID) -> list[MemberOut]:
        await self._assert_member(user_id, org_id)
        memberships = await self.member_repo.list_for_org(org_id)
        # Batch the user lookups into one IN query instead of one per member.
        user_ids = list({m.user_id for m in memberships})
        users_result = await self.db.execute(select(User).where(User.id.in_(user_ids)))
        users_by_id = {u.id: u for u in users_result.scalars().all()}

        result = []
        for m in memberships:
            u = users_by_id.get(m.user_id)
            result.append(
                MemberOut(
                    id=m.id,
                    user_id=m.user_id,
                    org_id=m.org_id,
                    role=m.role,
                    is_active=m.is_active,
                    email=u.email if u else "",
                    full_name=u.full_name if u else "",
                    created_at=m.created_at,
                )
            )
        return result

    async def update_member(
        self,
        org_id: UUID,
        target_user_id: UUID,
        requester_id: UUID,
        role: MemberRole | None = None,
        is_active: bool | None = None,
    ) -> MemberOut:
        await self._assert_role(requester_id, org_id, _ADMIN_ROLES)
        membership = await self.member_repo.get(target_user_id, org_id)
        if not membership:
            raise NotFoundError("Membership not found")
        updates: dict = {}
        if role is not None:
            updates["role"] = role
        if is_active is not None:
            updates["is_active"] = is_active
        membership = await self.member_repo.update(membership, **updates)
        user_result = await self.db.execute(select(User).where(User.id == membership.user_id))
        u = user_result.scalar_one_or_none()
        return MemberOut(
            id=membership.id,
            user_id=membership.user_id,
            org_id=membership.org_id,
            role=membership.role,
            is_active=membership.is_active,
            email=u.email if u else "",
            full_name=u.full_name if u else "",
            created_at=membership.created_at,
        )

    async def remove_member(
        self,
        org_id: UUID,
        target_user_id: UUID,
        requester_id: UUID,
    ) -> None:
        await self._assert_role(requester_id, org_id, _ADMIN_ROLES)
        if target_user_id == requester_id:
            raise ValidationError("Cannot remove yourself from the organization")
        membership = await self.member_repo.get(target_user_id, org_id)
        if not membership:
            raise NotFoundError("Membership not found")
        membership.soft_delete()
        await self.db.flush()

    async def switch_org(
        self,
        user_id: UUID,
        org_id: UUID,
    ) -> str:
        """Returns a new access token with the given org context."""
        membership = await self.member_repo.get(user_id, org_id)
        if not membership or not membership.is_active or membership.deleted_at:
            raise AuthorizationError("Not a member of this organization")
        access_token = create_access_token(user_id, org_id, membership.role.value)
        return access_token

    async def _assert_member(self, user_id: UUID, org_id: UUID) -> None:
        membership = await self.member_repo.get(user_id, org_id)
        if not membership or not membership.is_active:
            raise AuthorizationError("Not a member of this organization")

    async def _assert_role(
        self,
        user_id: UUID,
        org_id: UUID,
        required_roles: set[MemberRole],
    ) -> None:
        membership = await self.member_repo.get(user_id, org_id)
        if not membership or not membership.is_active or membership.role not in required_roles:
            raise AuthorizationError("Insufficient permissions")
