from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.assets.models import AssetType


class UpsertHoldingRequest(BaseModel):
    account_id: UUID
    portfolio_id: UUID
    asset_id: UUID
    quantity: Decimal
    cost_basis: Decimal | None = None
    cost_basis_per_unit: Decimal | None = None
    as_of_date: date


class UpdateHoldingRequest(BaseModel):
    quantity: Decimal | None = None
    cost_basis: Decimal | None = None
    cost_basis_per_unit: Decimal | None = None
    as_of_date: date | None = None


class HoldingOut(BaseModel):
    id: UUID
    account_id: UUID
    portfolio_id: UUID
    org_id: UUID
    asset_id: UUID
    quantity: Decimal
    cost_basis: Decimal | None
    cost_basis_per_unit: Decimal | None
    as_of_date: date
    unrealized_gain_loss: Decimal | None
    unrealized_gain_loss_pct: Decimal | None
    created_at: datetime

    # Denormalized for convenience
    asset_symbol: str | None = None
    asset_name: str | None = None
    asset_type: AssetType | None = None
    current_price: Decimal | None = None
    current_value: Decimal | None = None

    model_config = {"from_attributes": True}


class HoldingFilter(BaseModel):
    portfolio_id: UUID | None = None
    account_id: UUID | None = None
    asset_type: AssetType | None = None
    as_of_date: date | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=200)


class AssetTypeSummary(BaseModel):
    asset_type: str
    total_quantity: Decimal
    total_cost_basis: Decimal
    total_current_value: Decimal
    total_unrealized_gain_loss: Decimal
    num_holdings: int
