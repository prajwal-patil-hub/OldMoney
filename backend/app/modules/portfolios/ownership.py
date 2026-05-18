from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base


class OwnershipEdge(Base):
    __tablename__ = "ownership_edges"

    org_id: Mapped[UUID] = mapped_column(
        String(36), nullable=False, index=True  # type: ignore[assignment]
    )
    parent_entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # PORTFOLIO, ACCOUNT, USER, ORGANIZATION
    parent_entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    child_entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # PORTFOLIO, ACCOUNT, ASSET
    child_entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    percentage: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("1.0"))
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
