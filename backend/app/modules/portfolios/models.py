from __future__ import annotations

import enum
from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date, Enum, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base


class PortfolioType(str, enum.Enum):
    DISCRETIONARY = "DISCRETIONARY"
    ADVISORY = "ADVISORY"
    DIRECT = "DIRECT"


class PortfolioStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    SUSPENDED = "SUSPENDED"


class AccountType(str, enum.Enum):
    BROKERAGE = "BROKERAGE"
    BANK = "BANK"
    CRYPTO = "CRYPTO"
    RETIREMENT = "RETIREMENT"
    TRUST = "TRUST"
    OTHER = "OTHER"


class Portfolio(Base):
    __tablename__ = "portfolios"

    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    inception_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    base_currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    portfolio_type: Mapped[PortfolioType] = mapped_column(
        Enum(PortfolioType), nullable=False, default=PortfolioType.DISCRETIONARY
    )
    status: Mapped[PortfolioStatus] = mapped_column(
        Enum(PortfolioStatus), nullable=False, default=PortfolioStatus.ACTIVE
    )
    benchmark_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"), nullable=True
    )
    manager_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)

    accounts: Mapped[list["Account"]] = relationship(
        "Account", back_populates="portfolio", cascade="all, delete-orphan"
    )


class Account(Base):
    __tablename__ = "accounts"

    portfolio_id: Mapped[UUID] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType), nullable=False, default=AccountType.BROKERAGE
    )
    custodian: Mapped[str | None] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)

    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="accounts")
