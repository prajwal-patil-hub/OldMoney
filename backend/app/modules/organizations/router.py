from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.organizations.models import MemberRole
from app.modules.organizations.schemas import (
    CreateOrgRequest,
    InviteMemberRequest,
    SwitchOrgRequest,
    UpdateMemberRequest,
    UpdateOrgRequest,
)
from app.modules.organizations.service import OrganizationService
from app.shared.deps import get_current_user
from app.shared.responses import success

router = APIRouter(prefix="/orgs", tags=["organizations"])


@router.post("", response_model=dict, status_code=201)
async def create_org(
    body: CreateOrgRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    org = await svc.create_org(
        name=body.name,
        creator_id=current_user.id,
        slug=body.slug,
        plan=body.plan,
        settings=body.settings,
    )
    return success(org.model_dump())


@router.get("", response_model=dict)
async def list_orgs(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    orgs = await svc.list_orgs(current_user.id)
    return success([o.model_dump() for o in orgs])


@router.get("/{org_id}", response_model=dict)
async def get_org(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    org = await svc.get_org(org_id, current_user.id)
    return success(org.model_dump())


@router.patch("/{org_id}", response_model=dict)
async def update_org(
    org_id: UUID,
    body: UpdateOrgRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    org = await svc.update_org(
        org_id=org_id,
        user_id=current_user.id,
        **body.model_dump(exclude_none=True),
    )
    return success(org.model_dump())


@router.post("/{org_id}/members", response_model=dict, status_code=201)
async def invite_member(
    org_id: UUID,
    body: InviteMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    member = await svc.invite_member(
        org_id=org_id,
        inviter_id=current_user.id,
        email=body.email,
        role=body.role,
    )
    return success(member.model_dump())


@router.get("/{org_id}/members", response_model=dict)
async def list_members(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    members = await svc.list_members(org_id, current_user.id)
    return success([m.model_dump() for m in members])


@router.patch("/{org_id}/members/{user_id}", response_model=dict)
async def update_member(
    org_id: UUID,
    user_id: UUID,
    body: UpdateMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    member = await svc.update_member(
        org_id=org_id,
        target_user_id=user_id,
        requester_id=current_user.id,
        role=body.role,
        is_active=body.is_active,
    )
    return success(member.model_dump())


@router.delete("/{org_id}/members/{user_id}", response_model=dict)
async def remove_member(
    org_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    await svc.remove_member(org_id, user_id, current_user.id)
    return success({"message": "Member removed"})


@router.post("/{org_id}/switch", response_model=dict)
async def switch_org(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = OrganizationService(db)
    access_token = await svc.switch_org(current_user.id, org_id)
    return success({"access_token": access_token, "token_type": "bearer"})
