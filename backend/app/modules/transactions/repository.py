from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.transactions.models import Transaction, TransactionType


class TransactionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, tx_id: UUID, org_id: UUID) -> Transaction | None:
        result = await self.db.execute(
            select(Transaction).where(
                Transaction.id == tx_id,
                Transaction.org_id == org_id,
                Transaction.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_external_id(self, external_id: str, org_id: UUID) -> Transaction | None:
        result = await self.db.execute(
            select(Transaction).where(
                Transaction.external_id == external_id,
                Transaction.org_id == org_id,
                Transaction.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        org_id: UUID,
        portfolio_id: UUID | None = None,
        account_id: UUID | None = None,
        asset_id: UUID | None = None,
        transaction_type: TransactionType | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Transaction], int]:
        q = select(Transaction).where(
            Transaction.org_id == org_id, Transaction.deleted_at.is_(None)
        )
        if portfolio_id:
            q = q.where(Transaction.portfolio_id == portfolio_id)
        if account_id:
            q = q.where(Transaction.account_id == account_id)
        if asset_id:
            q = q.where(Transaction.asset_id == asset_id)
        if transaction_type:
            q = q.where(Transaction.transaction_type == transaction_type)
        if date_from:
            q = q.where(Transaction.trade_date >= date_from)
        if date_to:
            q = q.where(Transaction.trade_date <= date_to)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        q = q.offset(offset).limit(limit).order_by(Transaction.trade_date.desc())
        result = await self.db.execute(q)
        return list(result.scalars().all()), total

    async def create(
        self,
        org_id: UUID,
        created_by: UUID | None,
        **kwargs,  # type: ignore[type-arg]
    ) -> Transaction:
        tx = Transaction(org_id=org_id, created_by=created_by, **kwargs)
        self.db.add(tx)
        await self.db.flush()
        return tx

    async def update(self, tx: Transaction, **kwargs) -> Transaction:  # type: ignore[type-arg]
        for key, value in kwargs.items():
            setattr(tx, key, value)
        await self.db.flush()
        return tx
