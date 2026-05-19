from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    total_aum: Decimal
    daily_change: Decimal
    daily_change_pct: Decimal
    ytd_return: Decimal
    ytd_return_pct: Decimal
    total_portfolios: int
    total_holdings: int
    as_of_date: date


class PerformancePoint(BaseModel):
    date: date
    value: Decimal


class AllocationItem(BaseModel):
    asset_type: str
    total_value: Decimal
    percentage: Decimal


class TopHolding(BaseModel):
    holding_id: UUID
    portfolio_id: UUID
    asset_id: UUID
    asset_symbol: str
    asset_name: str
    asset_type: str
    quantity: Decimal
    current_price: Decimal | None
    current_value: Decimal
    cost_basis: Decimal | None
    unrealized_gain_loss: Decimal | None
    weight_pct: Decimal


class RecentTransaction(BaseModel):
    id: UUID
    portfolio_id: UUID
    asset_id: UUID | None
    asset_symbol: str | None
    transaction_type: str
    trade_date: date
    quantity: Decimal | None
    price: Decimal | None
    net_amount: Decimal | None
    currency: str
