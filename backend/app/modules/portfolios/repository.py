from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.portfolios.models import Account, Portfolio


class PortfolioRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, portfolio_id: UUID, org_id: UUID) -> Portfolio | None:
        result = await self.db.execute(
            select(Portfolio)
            .options(selectinload(Portfolio.accounts))
            .where(
                Portfolio.id == portfolio_id,
                Portfolio.org_id == org_id,
                Portfolio.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        org_id: UUID,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Portfolio], int]:
        q = (
            select(Portfolio)
            .options(selectinload(Portfolio.accounts))
            .where(Portfolio.org_id == org_id, Portfolio.deleted_at.is_(None))
        )
        count_q = select(func.count()).select_from(
            select(Portfolio)
            .where(Portfolio.org_id == org_id, Portfolio.deleted_at.is_(None))
            .subquery()
        )
        total_result = await self.db.execute(count_q)
        total = total_result.scalar_one()

        q = q.offset(offset).limit(limit).order_by(Portfolio.name)
        result = await self.db.execute(q)
        return list(result.scalars().all()), total

    async def create(self, org_id: UUID, **kwargs) -> Portfolio:  # type: ignore[type-arg]
        portfolio = Portfolio(org_id=org_id, **kwargs)
        self.db.add(portfolio)
        await self.db.flush()
        await self.db.refresh(portfolio)
        return portfolio

    async def update(self, portfolio: Portfolio, **kwargs) -> Portfolio:  # type: ignore[type-arg]
        for key, value in kwargs.items():
            setattr(portfolio, key, value)
        await self.db.flush()
        return portfolio


class AccountRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, account_id: UUID, org_id: UUID) -> Account | None:
        result = await self.db.execute(
            select(Account).where(
                Account.id == account_id,
                Account.org_id == org_id,
                Account.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_portfolio(self, portfolio_id: UUID, org_id: UUID) -> list[Account]:
        result = await self.db.execute(
            select(Account).where(
                Account.portfolio_id == portfolio_id,
                Account.org_id == org_id,
                Account.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def create(self, portfolio_id: UUID, org_id: UUID, **kwargs) -> Account:  # type: ignore[type-arg]
        account = Account(portfolio_id=portfolio_id, org_id=org_id, **kwargs)
        self.db.add(account)
        await self.db.flush()
        await self.db.refresh(account)
        return account
