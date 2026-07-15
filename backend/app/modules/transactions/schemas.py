from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.modules.transactions.models import TransactionType


class CreateTransactionRequest(BaseModel):
    account_id: UUID | None = None  # auto-resolved from portfolio's first account if omitted
    portfolio_id: UUID
    asset_id: UUID | None = None
    transaction_type: TransactionType
    trade_date: date
    settlement_date: date | None = None
    quantity: Decimal | None = Field(default=None, ge=0)
    price: Decimal | None = Field(default=None, ge=0)
    gross_amount: Decimal | None = Field(default=None, ge=0)
    fees: Decimal = Field(default=Decimal("0"), ge=0)
    net_amount: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    external_id: str | None = None
    notes: str | None = None
    metadata: dict = {}

    @model_validator(mode="after")
    def check_consistency(self) -> "CreateTransactionRequest":
        """Reject internally inconsistent amounts (non-negativity is enforced
        by the per-field ge=0 constraints above).

        When quantity and price are both supplied, any supplied gross/net must
        reconcile — this stops a client from fabricating a cost basis that
        contradicts the trade. Net is side-aware: a BUY pays price + fees, a
        SELL nets price − fees.
        """
        if self.quantity is not None and self.price is not None:
            computed = self.quantity * self.price
            if self.gross_amount is not None and abs(self.gross_amount - computed) > Decimal("0.01"):
                raise ValueError("gross_amount does not match quantity × price")
            if self.net_amount is not None:
                fees = self.fees or Decimal("0")
                expected_net = (
                    computed - fees if self.transaction_type == TransactionType.SELL
                    else computed + fees
                )
                if abs(self.net_amount - expected_net) > Decimal("0.01"):
                    raise ValueError(
                        "net_amount does not reconcile with quantity × price ± fees"
                    )
        return self


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
