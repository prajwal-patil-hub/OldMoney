from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.organizations.models import MemberRole


class CreateOrgRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str | None = Field(default=None, min_length=2, max_length=100)
    plan: str = "free"
    settings: dict = {}

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("Slug must contain only lowercase letters, numbers, and hyphens")
        return v


class UpdateOrgRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    plan: str | None = None
    is_active: bool | None = None
    settings: dict | None = None


class OrgOut(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    is_active: bool
    settings: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteMemberRequest(BaseModel):
    email: str
    role: MemberRole = MemberRole.VIEWER


class UpdateMemberRequest(BaseModel):
    role: MemberRole | None = None
    is_active: bool | None = None


class MemberOut(BaseModel):
    id: UUID
    user_id: UUID
    org_id: UUID
    role: MemberRole
    is_active: bool
    email: str = ""
    full_name: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class SwitchOrgRequest(BaseModel):
    org_id: UUID
