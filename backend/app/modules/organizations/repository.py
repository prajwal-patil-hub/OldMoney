from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.organizations.models import Membership, MemberRole, Organization


class OrganizationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, org_id: UUID) -> Organization | None:
        result = await self.db.execute(
            select(Organization).where(
                Organization.id == org_id,
                Organization.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Organization | None:
        result = await self.db.execute(
            select(Organization).where(
                Organization.slug == slug,
                Organization.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: UUID) -> list[Organization]:
        result = await self.db.execute(
            select(Organization)
            .join(Membership, Membership.org_id == Organization.id)
            .where(
                Membership.user_id == user_id,
                Membership.is_active.is_(True),
                Membership.deleted_at.is_(None),
                Organization.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def create(self, name: str, slug: str, plan: str, settings: dict) -> Organization:
        org = Organization(name=name, slug=slug, plan=plan, settings=settings)
        self.db.add(org)
        await self.db.flush()
        await self.db.refresh(org)
        return org

    async def update(self, org: Organization, **kwargs) -> Organization:  # type: ignore[type-arg]
        for key, value in kwargs.items():
            setattr(org, key, value)
        await self.db.flush()
        return org


class MembershipRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, user_id: UUID, org_id: UUID) -> Membership | None:
        result = await self.db.execute(
            select(Membership).where(
                Membership.user_id == user_id,
                Membership.org_id == org_id,
                Membership.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, membership_id: UUID) -> Membership | None:
        result = await self.db.execute(
            select(Membership).where(
                Membership.id == membership_id,
                Membership.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_org(self, org_id: UUID) -> list[Membership]:
        result = await self.db.execute(
            select(Membership).where(
                Membership.org_id == org_id,
                Membership.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def create(
        self,
        user_id: UUID,
        org_id: UUID,
        role: MemberRole,
        invited_by: UUID | None = None,
    ) -> Membership:
        membership = Membership(
            user_id=user_id,
            org_id=org_id,
            role=role,
            invited_by=invited_by,
        )
        self.db.add(membership)
        await self.db.flush()
        return membership

    async def update(self, membership: Membership, **kwargs) -> Membership:  # type: ignore[type-arg]
        for key, value in kwargs.items():
            setattr(membership, key, value)
        await self.db.flush()
        return membership
