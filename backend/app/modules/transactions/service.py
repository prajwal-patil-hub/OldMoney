from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
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
        from app.modules.holdings.repository import HoldingRepository
        from datetime import datetime, UTC

        holding_repo = HoldingRepository(self.db)
        existing = await holding_repo.get_by_unique(tx.account_id, tx.asset_id, tx.trade_date)

        quantity_delta = tx.quantity if tx.transaction_type == TransactionType.BUY else -tx.quantity

        if existing:
            new_quantity = existing.quantity + quantity_delta
            await holding_repo.update(existing, quantity=new_quantity)
        else:
            await holding_repo.upsert(
                org_id=org_id,
                account_id=tx.account_id,
                portfolio_id=tx.portfolio_id,
                asset_id=tx.asset_id,
                as_of_date=tx.trade_date,
                quantity=quantity_delta,
                cost_basis=tx.net_amount,
                cost_basis_per_unit=tx.price,
            )

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
