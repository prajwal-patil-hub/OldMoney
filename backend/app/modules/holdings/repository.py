from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.assets.models import AssetType
from app.modules.holdings.models import Holding


class HoldingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, holding_id: UUID, org_id: UUID) -> Holding | None:
        result = await self.db.execute(
            select(Holding).where(
                Holding.id == holding_id,
                Holding.org_id == org_id,
                Holding.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_unique(
        self, account_id: UUID, asset_id: UUID, as_of_date: date
    ) -> Holding | None:
        result = await self.db.execute(
            select(Holding).where(
                Holding.account_id == account_id,
                Holding.asset_id == asset_id,
                Holding.as_of_date == as_of_date,
                Holding.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_current_position(
        self, account_id: UUID, asset_id: UUID
    ) -> Holding | None:
        """The single live position row for an (account, asset) pair.

        Holdings model a *running* position (one row per instrument that
        carries forward), not per-trade-date snapshots, so there is at most
        one live row per pair. Returns the most recent if legacy data left
        several behind.
        """
        result = await self.db.execute(
            select(Holding)
            .where(
                Holding.account_id == account_id,
                Holding.asset_id == asset_id,
                Holding.deleted_at.is_(None),
            )
            .order_by(Holding.as_of_date.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        org_id: UUID,
        portfolio_id: UUID | None = None,
        account_id: UUID | None = None,
        asset_type: AssetType | None = None,
        as_of_date: date | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Holding], int]:
        from app.modules.assets.models import Asset

        q = select(Holding).where(Holding.org_id == org_id, Holding.deleted_at.is_(None))
        if portfolio_id:
            q = q.where(Holding.portfolio_id == portfolio_id)
        if account_id:
            q = q.where(Holding.account_id == account_id)
        if as_of_date:
            q = q.where(Holding.as_of_date == as_of_date)
        if asset_type:
            q = q.join(Asset, Holding.asset_id == Asset.id).where(Asset.asset_type == asset_type)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        q = q.offset(offset).limit(limit).order_by(Holding.as_of_date.desc())
        result = await self.db.execute(q)
        return list(result.scalars().all()), total

    async def upsert(
        self,
        org_id: UUID,
        account_id: UUID,
        portfolio_id: UUID,
        asset_id: UUID,
        as_of_date: date,
        **kwargs,  # type: ignore[type-arg]
    ) -> Holding:
        existing = await self.get_by_unique(account_id, asset_id, as_of_date)
        if existing:
            for key, value in kwargs.items():
                setattr(existing, key, value)
            await self.db.flush()
            return existing
        holding = Holding(
            org_id=org_id,
            account_id=account_id,
            portfolio_id=portfolio_id,
            asset_id=asset_id,
            as_of_date=as_of_date,
            **kwargs,
        )
        self.db.add(holding)
        await self.db.flush()
        return holding

    async def update(self, holding: Holding, **kwargs) -> Holding:  # type: ignore[type-arg]
        for key, value in kwargs.items():
            setattr(holding, key, value)
        await self.db.flush()
        return holding
