from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.base_model import Base


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (
        UniqueConstraint("account_id", "asset_id", "as_of_date", name="uq_holding_account_asset_date"),
    )

    account_id: Mapped[UUID] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    portfolio_id: Mapped[UUID] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(30, 10), nullable=False, default=0)
    cost_basis: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    cost_basis_per_unit: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)
    unrealized_gain_loss: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    unrealized_gain_loss_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
