from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.assets.models import Asset, AssetPrice, AssetType


class AssetRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, asset_id: UUID, org_id: UUID) -> Asset | None:
        result = await self.db.execute(
            select(Asset).where(
                Asset.id == asset_id,
                Asset.org_id == org_id,
                Asset.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        org_id: UUID,
        symbol: str | None = None,
        name: str | None = None,
        asset_type: AssetType | None = None,
        is_active: bool | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Asset], int]:
        q = select(Asset).where(Asset.org_id == org_id, Asset.deleted_at.is_(None))
        if symbol:
            q = q.where(Asset.symbol.ilike(f"%{symbol}%"))
        if name:
            q = q.where(Asset.name.ilike(f"%{name}%"))
        if asset_type:
            q = q.where(Asset.asset_type == asset_type)
        if is_active is not None:
            q = q.where(Asset.is_active == is_active)

        count_q = select(func.count()).select_from(q.subquery())
        total_result = await self.db.execute(count_q)
        total = total_result.scalar_one()

        q = q.offset(offset).limit(limit).order_by(Asset.symbol)
        result = await self.db.execute(q)
        return list(result.scalars().all()), total

    async def create(
        self,
        org_id: UUID,
        symbol: str,
        name: str,
        asset_type: AssetType,
        **kwargs,  # type: ignore[type-arg]
    ) -> Asset:
        asset = Asset(
            org_id=org_id,
            symbol=symbol.upper(),
            name=name,
            asset_type=asset_type,
            **kwargs,
        )
        self.db.add(asset)
        await self.db.flush()
        await self.db.refresh(asset)
        return asset

    async def update(self, asset: Asset, **kwargs) -> Asset:  # type: ignore[type-arg]
        for key, value in kwargs.items():
            setattr(asset, key, value)
        await self.db.flush()
        return asset

    async def get_latest_price(self, asset_id: UUID) -> AssetPrice | None:
        result = await self.db.execute(
            select(AssetPrice)
            .where(AssetPrice.asset_id == asset_id)
            .order_by(AssetPrice.price_date.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_price_history(
        self,
        asset_id: UUID,
        org_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[AssetPrice]:
        q = select(AssetPrice).where(
            AssetPrice.asset_id == asset_id,
            AssetPrice.org_id == org_id,
        )
        if date_from:
            q = q.where(AssetPrice.price_date >= date_from)
        if date_to:
            q = q.where(AssetPrice.price_date <= date_to)
        q = q.order_by(AssetPrice.price_date.desc())
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def upsert_price(
        self,
        asset_id: UUID,
        org_id: UUID,
        price_date: date,
        close: Decimal,
        open: Decimal | None = None,
        high: Decimal | None = None,
        low: Decimal | None = None,
        volume: Decimal | None = None,
        source: str | None = None,
    ) -> AssetPrice:
        # Check existing
        existing_result = await self.db.execute(
            select(AssetPrice).where(
                AssetPrice.asset_id == asset_id,
                AssetPrice.price_date == price_date,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            existing.close = close
            if open is not None:
                existing.open = open
            if high is not None:
                existing.high = high
            if low is not None:
                existing.low = low
            if volume is not None:
                existing.volume = volume
            if source:
                existing.source = source
            await self.db.flush()
            return existing
        else:
            price = AssetPrice(
                asset_id=asset_id,
                org_id=org_id,
                price_date=price_date,
                close=close,
                open=open,
                high=high,
                low=low,
                volume=volume,
                source=source,
            )
            self.db.add(price)
            await self.db.flush()
            return price

    async def get_by_symbol(self, symbol: str, org_id: UUID) -> Asset | None:
        result = await self.db.execute(
            select(Asset).where(
                Asset.symbol == symbol.upper(),
                Asset.org_id == org_id,
                Asset.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()
