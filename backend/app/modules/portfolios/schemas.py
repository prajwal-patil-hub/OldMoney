from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.portfolios.models import AccountType, PortfolioStatus, PortfolioType


class CreatePortfolioRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    inception_date: date | None = None
    base_currency: str = Field(default="USD", min_length=3, max_length=3)
    portfolio_type: PortfolioType = PortfolioType.DISCRETIONARY
    status: PortfolioStatus = PortfolioStatus.ACTIVE
    benchmark_id: UUID | None = None
    manager_user_id: UUID | None = None
    metadata: dict = {}


class UpdatePortfolioRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    inception_date: date | None = None
    base_currency: str | None = None
    portfolio_type: PortfolioType | None = None
    status: PortfolioStatus | None = None
    benchmark_id: UUID | None = None
    manager_user_id: UUID | None = None
    metadata: dict | None = None


class AccountOut(BaseModel):
    id: UUID
    portfolio_id: UUID
    org_id: UUID
    name: str
    account_number: str | None
    account_type: AccountType
    custodian: str | None
    currency: str
    is_active: bool
    metadata: dict = {}
    created_at: datetime

    model_config = {"from_attributes": True}


class PortfolioOut(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    description: str | None
    inception_date: date | None
    base_currency: str
    portfolio_type: PortfolioType
    status: PortfolioStatus
    benchmark_id: UUID | None
    manager_user_id: UUID | None
    metadata: dict = {}
    created_at: datetime
    accounts: list[AccountOut] = []

    model_config = {"from_attributes": True}


class CreateAccountRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    account_number: str | None = None
    account_type: AccountType = AccountType.BROKERAGE
    custodian: str | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    is_active: bool = True
    metadata: dict = {}


class AllocationItem(BaseModel):
    asset_type: str
    total_value: Decimal
    percentage: Decimal


class PortfolioSummary(BaseModel):
    portfolio_id: UUID
    total_value: Decimal
    total_cost_basis: Decimal
    unrealized_gain_loss: Decimal
    unrealized_gain_loss_pct: Decimal
    num_accounts: int
    num_holdings: int
    allocation_by_type: list[AllocationItem]
    as_of_date: date
