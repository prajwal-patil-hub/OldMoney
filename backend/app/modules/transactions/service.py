from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.modules.transactions.models import Transaction, TransactionType
from app.modules.transactions.repository import TransactionRepository
from app.modules.transactions.schemas import TransactionOut

log = structlog.get_logger(__name__)


def _tx_to_out(tx: Transaction) -> TransactionOut:
    return TransactionOut(
        id=tx.id,
        account_id=tx.account_id,
        portfolio_id=tx.portfolio_id,
        org_id=tx.org_id,
        asset_id=tx.asset_id,
        transaction_type=tx.transaction_type,
        trade_date=tx.trade_date,
        settlement_date=tx.settlement_date,
        quantity=tx.quantity,
        price=tx.price,
        gross_amount=tx.gross_amount,
        fees=tx.fees,
        net_amount=tx.net_amount,
        currency=tx.currency,
        external_id=tx.external_id,
        notes=tx.notes,
        metadata=tx.metadata_,
        created_by=tx.created_by,
        created_at=tx.created_at,
    )


class TransactionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TransactionRepository(db)

    async def _assert_org_owns(
        self,
        org_id: UUID,
        portfolio_id: UUID,
        account_id: UUID,
        asset_id: UUID | None,
    ) -> None:
        """Reject client-supplied IDs that belong to another org (IDOR guard).

        Every referenced entity must live in the caller's org before we write,
        otherwise one tenant could inject records into another tenant's book.
        """
        from app.modules.portfolios.models import Account, Portfolio
        from app.modules.assets.models import Asset
        from sqlalchemy import select

        pf = await self.db.execute(
            select(Portfolio.id).where(
                Portfolio.id == portfolio_id,
                Portfolio.org_id == org_id,
                Portfolio.deleted_at.is_(None),
            )
        )
        if pf.scalar_one_or_none() is None:
            raise NotFoundError("Portfolio not found")

        acct = await self.db.execute(
            select(Account.portfolio_id).where(
                Account.id == account_id,
                Account.org_id == org_id,
            )
        )
        acct_pf = acct.scalar_one_or_none()
        if acct_pf is None:
            raise NotFoundError("Account not found")
        if acct_pf != portfolio_id:
            raise ValidationError("Account does not belong to the given portfolio")

        if asset_id is not None:
            a = await self.db.execute(
                select(Asset.id).where(
                    Asset.id == asset_id,
                    Asset.org_id == org_id,
                    Asset.deleted_at.is_(None),
                )
            )
            if a.scalar_one_or_none() is None:
                raise NotFoundError("Asset not found")

    async def create_transaction(
        self,
        org_id: UUID,
        user_id: UUID,
        account_id: UUID,
        portfolio_id: UUID,
        transaction_type: TransactionType,
        trade_date: date,
        external_id: str | None = None,
        **kwargs,  # type: ignore[type-arg]
    ) -> TransactionOut:
        # Deduplicate by external_id
        if external_id:
            existing = await self.repo.get_by_external_id(external_id, org_id)
            if existing:
                raise ConflictError(f"Transaction with external_id '{external_id}' already exists")

        # Cross-tenant IDOR guard on every client-supplied reference.
        await self._assert_org_owns(org_id, portfolio_id, account_id, kwargs.get("asset_id"))

        metadata = kwargs.pop("metadata", {})

        tx = await self.repo.create(
            org_id=org_id,
            created_by=user_id,
            account_id=account_id,
            portfolio_id=portfolio_id,
            transaction_type=transaction_type,
            trade_date=trade_date,
            external_id=external_id,
            metadata_=metadata,
            **kwargs,
        )

        # Update holding quantities for BUY/SELL
        if transaction_type in (TransactionType.BUY, TransactionType.SELL) and tx.asset_id and tx.quantity:
            await self._update_holding(tx, org_id)

        log.info("transaction_created", tx_id=str(tx.id), type=transaction_type.value)
        return _tx_to_out(tx)

    async def _update_holding(self, tx: Transaction, org_id: UUID) -> None:
        """Maintain a running position with average-cost basis, and record
        realized P&L on sells.

        A holding is a single carried-forward row per (account, asset):
          BUY   → quantity += qty;  cost_basis += purchase cost
          SELL  → quantity -= qty;  cost_basis -= (avg_cost × qty sold)
                  realized P&L = proceeds − (avg_cost × qty sold), saved on the
                  transaction's metadata for auditability.
        Average cost is used (not FIFO lots) — the standard, deterministic
        method for a consolidated position view.
        """
        from decimal import Decimal
        from app.modules.holdings.repository import HoldingRepository

        holding_repo = HoldingRepository(self.db)
        position = await holding_repo.get_current_position(tx.account_id, tx.asset_id)

        qty = tx.quantity or Decimal("0")
        # Cost of this trade: prefer the settled net_amount, else quantity×price.
        trade_cost = tx.net_amount
        if trade_cost is None and tx.price is not None:
            trade_cost = qty * tx.price
        trade_cost = trade_cost or Decimal("0")

        if tx.transaction_type == TransactionType.BUY:
            if position:
                new_qty = position.quantity + qty
                new_cost = (position.cost_basis or Decimal("0")) + trade_cost
                await holding_repo.update(
                    position,
                    quantity=new_qty,
                    cost_basis=new_cost,
                    cost_basis_per_unit=(new_cost / new_qty) if new_qty > 0 else None,
                    as_of_date=tx.trade_date,
                )
            else:
                await holding_repo.upsert(
                    org_id=org_id,
                    account_id=tx.account_id,
                    portfolio_id=tx.portfolio_id,
                    asset_id=tx.asset_id,
                    as_of_date=tx.trade_date,
                    quantity=qty,
                    cost_basis=trade_cost,
                    cost_basis_per_unit=(trade_cost / qty) if qty > 0 else None,
                )
            return

        # SELL
        if not position or position.quantity <= 0:
            # Selling with no recorded position — record a zero/short position
            # rather than a positive-cost negative-quantity row.
            await holding_repo.upsert(
                org_id=org_id,
                account_id=tx.account_id,
                portfolio_id=tx.portfolio_id,
                asset_id=tx.asset_id,
                as_of_date=tx.trade_date,
                quantity=(position.quantity if position else Decimal("0")) - qty,
                cost_basis=Decimal("0"),
                cost_basis_per_unit=None,
            )
            return

        avg_cost = (position.cost_basis or Decimal("0")) / position.quantity
        sold_qty = min(qty, position.quantity)
        cost_removed = (avg_cost * sold_qty).quantize(Decimal("0.0001"))
        realized = (trade_cost - cost_removed).quantize(Decimal("0.01"))

        new_qty = position.quantity - qty
        new_cost = (position.cost_basis or Decimal("0")) - cost_removed
        if new_cost < 0:
            new_cost = Decimal("0")
        await holding_repo.update(
            position,
            quantity=new_qty,
            cost_basis=new_cost,
            cost_basis_per_unit=(new_cost / new_qty) if new_qty > 0 else None,
            as_of_date=tx.trade_date,
        )

        # Persist realized P&L on the transaction for the audit trail.
        meta = dict(tx.metadata_ or {})
        meta["realized_pnl"] = str(realized)
        tx.metadata_ = meta
        await self.db.flush()

    async def list_transactions(
        self,
        org_id: UUID,
        portfolio_id: UUID | None = None,
        account_id: UUID | None = None,
        asset_id: UUID | None = None,
        transaction_type: TransactionType | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[TransactionOut], int]:
        offset = (page - 1) * page_size
        txs, total = await self.repo.list(
            org_id=org_id,
            portfolio_id=portfolio_id,
            account_id=account_id,
            asset_id=asset_id,
            transaction_type=transaction_type,
            date_from=date_from,
            date_to=date_to,
            offset=offset,
            limit=page_size,
        )
        return [_tx_to_out(tx) for tx in txs], total

    async def get_transaction(self, tx_id: UUID, org_id: UUID) -> TransactionOut:
        tx = await self.repo.get_by_id(tx_id, org_id)
        if not tx:
            raise NotFoundError("Transaction not found")
        return _tx_to_out(tx)

    async def update_transaction(
        self, tx_id: UUID, org_id: UUID, **kwargs  # type: ignore[type-arg]
    ) -> TransactionOut:
        tx = await self.repo.get_by_id(tx_id, org_id)
        if not tx:
            raise NotFoundError("Transaction not found")
        if "metadata" in kwargs:
            kwargs["metadata_"] = kwargs.pop("metadata")
        tx = await self.repo.update(tx, **kwargs)
        return _tx_to_out(tx)

    async def delete_transaction(self, tx_id: UUID, org_id: UUID) -> None:
        tx = await self.repo.get_by_id(tx_id, org_id)
        if not tx:
            raise NotFoundError("Transaction not found")
        tx.soft_delete()
        await self.db.flush()

    async def export_csv(
        self,
        org_id: UUID,
        portfolio_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> str:
        txs, _ = await self.repo.list(
            org_id=org_id,
            portfolio_id=portfolio_id,
            date_from=date_from,
            date_to=date_to,
            limit=100000,
        )
        output = io.StringIO()
        fieldnames = [
            "id", "account_id", "portfolio_id", "asset_id", "transaction_type",
            "trade_date", "settlement_date", "quantity", "price",
            "gross_amount", "fees", "net_amount", "currency", "external_id", "notes",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for tx in txs:
            writer.writerow({
                "id": str(tx.id),
                "account_id": str(tx.account_id),
                "portfolio_id": str(tx.portfolio_id),
                "asset_id": str(tx.asset_id) if tx.asset_id else "",
                "transaction_type": tx.transaction_type.value,
                "trade_date": str(tx.trade_date),
                "settlement_date": str(tx.settlement_date) if tx.settlement_date else "",
                "quantity": str(tx.quantity) if tx.quantity else "",
                "price": str(tx.price) if tx.price else "",
                "gross_amount": str(tx.gross_amount) if tx.gross_amount else "",
                "fees": str(tx.fees),
                "net_amount": str(tx.net_amount) if tx.net_amount else "",
                "currency": tx.currency,
                "external_id": tx.external_id or "",
                "notes": tx.notes or "",
            })
        return output.getvalue()
