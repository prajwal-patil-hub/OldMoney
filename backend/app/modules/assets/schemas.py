from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.assets.models import AssetType


class CreateAssetRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    asset_type: AssetType
    isin: str | None = Field(default=None, max_length=12)
    cusip: str | None = Field(default=None, max_length=9)
    exchange: str | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    sector: str | None = None
    industry: str | None = None
    country: str | None = Field(default=None, max_length=2)
    metadata: dict = {}


class UpdateAssetRequest(BaseModel):
    symbol: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    asset_type: AssetType | None = None
    isin: str | None = None
    cusip: str | None = None
    exchange: str | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    sector: str | None = None
    industry: str | None = None
    country: str | None = None
    is_active: bool | None = None
    metadata: dict | None = None


class PriceOut(BaseModel):
    id: UUID
    asset_id: UUID
    price_date: date
    open: Decimal | None
    high: Decimal | None
    low: Decimal | None
    close: Decimal
    volume: Decimal | None
    source: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AssetOut(BaseModel):
    id: UUID
    org_id: UUID
    symbol: str
    name: str
    asset_type: AssetType
    isin: str | None
    cusip: str | None
    exchange: str | None
    currency: str
    sector: str | None
    industry: str | None
    country: str | None
    is_active: bool
    metadata: dict = {}
    created_at: datetime
    latest_price: PriceOut | None = None

    model_config = {"from_attributes": True}


class AddPriceRequest(BaseModel):
    price_date: date
    close: Decimal = Field(gt=0)
    open: Decimal | None = None
    high: Decimal | None = None
    low: Decimal | None = None
    volume: Decimal | None = None
    source: str | None = None


class PriceHistoryFilter(BaseModel):
    date_from: date | None = None
    date_to: date | None = None


class AssetListFilter(BaseModel):
    symbol: str | None = None
    name: str | None = None
    asset_type: AssetType | None = None
    is_active: bool | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=200)
