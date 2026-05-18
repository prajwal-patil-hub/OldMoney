from __future__ import annotations

import enum
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base


class MemberRole(str, enum.Enum):
    SUPERADMIN = "SUPERADMIN"
    ORG_ADMIN = "ORG_ADMIN"
    ADVISOR = "ADVISOR"
    ANALYST = "ANALYST"
    CLIENT = "CLIENT"
    VIEWER = "VIEWER"


class Organization(Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    memberships: Mapped[list["Membership"]] = relationship(
        "Membership", back_populates="organization", foreign_keys="[Membership.org_id]"
    )


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_membership_user_org"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole), nullable=False, default=MemberRole.VIEWER
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invited_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="memberships", foreign_keys=[org_id]
    )
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="memberships", foreign_keys=[user_id]
    )
