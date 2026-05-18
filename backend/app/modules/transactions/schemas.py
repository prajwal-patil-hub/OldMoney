from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.transactions.models import TransactionType


class CreateTransactionRequest(BaseModel):
    account_id: UUID
    portfolio_id: UUID
    asset_id: UUID | None = None
    transaction_type: TransactionType
    trade_date: date
    settlement_date: date | None = None
    quantity: Decimal | None = None
    price: Decimal | None = None
    gross_amount: Decimal | None = None
    fees: Decimal = Decimal("0")
    net_amount: Decimal | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    external_id: str | None = None
    notes: str | None = None
    metadata: dict = {}


class UpdateTransactionRequest(BaseModel):
    transaction_type: TransactionType | None = None
    trade_date: date | None = None
    settlement_date: date | None = None
    quantity: Decimal | None = None
    price: Decimal | None = None
    gross_amount: Decimal | None = None
    fees: Decimal | None = None
    net_amount: Decimal | None = None
    notes: str | None = None
    metadata: dict | None = None


class TransactionOut(BaseModel):
    id: UUID
    account_id: UUID
    portfolio_id: UUID
    org_id: UUID
    asset_id: UUID | None
    transaction_type: TransactionType
    trade_date: date
    settlement_date: date | None
    quantity: Decimal | None
    price: Decimal | None
    gross_amount: Decimal | None
    fees: Decimal
    net_amount: Decimal | None
    currency: str
    external_id: str | None
    notes: str | None
    metadata: dict = {}
    created_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionFilter(BaseModel):
    portfolio_id: UUID | None = None
    account_id: UUID | None = None
    asset_id: UUID | None = None
    transaction_type: TransactionType | None = None
    date_from: date | None = None
    date_to: date | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=200)
