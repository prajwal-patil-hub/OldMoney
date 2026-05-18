from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.modules.assets.models import Asset, AssetType
from app.modules.assets.repository import AssetRepository
from app.modules.holdings.models import Holding
from app.modules.holdings.repository import HoldingRepository
from app.modules.holdings.schemas import AssetTypeSummary, HoldingOut

log = structlog.get_logger(__name__)


async def _enrich_holding(holding: Holding, db: AsyncSession) -> HoldingOut:
    asset_repo = AssetRepository(db)
    asset_result = await db.execute(select(Asset).where(Asset.id == holding.asset_id))
    asset = asset_result.scalar_one_or_none()

    latest_price = await asset_repo.get_latest_price(holding.asset_id) if asset else None
    current_price = latest_price.close if latest_price else None
    current_value = (
        Decimal(str(holding.quantity)) * current_price
        if current_price and holding.quantity is not None
        else None
    )

    return HoldingOut(
        id=holding.id,
        account_id=holding.account_id,
        portfolio_id=holding.portfolio_id,
        org_id=holding.org_id,
        asset_id=holding.asset_id,
        quantity=holding.quantity,
        cost_basis=holding.cost_basis,
        cost_basis_per_unit=holding.cost_basis_per_unit,
        as_of_date=holding.as_of_date,
        unrealized_gain_loss=holding.unrealized_gain_loss,
        unrealized_gain_loss_pct=holding.unrealized_gain_loss_pct,
        created_at=holding.created_at,
        asset_symbol=asset.symbol if asset else None,
        asset_name=asset.name if asset else None,
        asset_type=asset.asset_type if asset else None,
        current_price=current_price,
        current_value=current_value,
    )


class HoldingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = HoldingRepository(db)

    async def upsert_holding(
        self,
        org_id: UUID,
        account_id: UUID,
        portfolio_id: UUID,
        asset_id: UUID,
        quantity: Decimal,
        as_of_date: date,
        cost_basis: Decimal | None = None,
        cost_basis_per_unit: Decimal | None = None,
    ) -> HoldingOut:
        # Compute unrealized
        asset_repo = AssetRepository(self.db)
        latest_price = await asset_repo.get_latest_price(asset_id)

        unrealized_gl = None
        unrealized_gl_pct = None
        if latest_price and cost_basis is not None:
            current_val = quantity * latest_price.close
            unrealized_gl = current_val - cost_basis
            if cost_basis > 0:
                unrealized_gl_pct = (unrealized_gl / cost_basis * 100).quantize(Decimal("0.0001"))

        holding = await self.repo.upsert(
            org_id=org_id,
            account_id=account_id,
            portfolio_id=portfolio_id,
            asset_id=asset_id,
            as_of_date=as_of_date,
            quantity=quantity,
            cost_basis=cost_basis,
            cost_basis_per_unit=cost_basis_per_unit,
            unrealized_gain_loss=unrealized_gl,
            unrealized_gain_loss_pct=unrealized_gl_pct,
        )
        return await _enrich_holding(holding, self.db)

    async def list_holdings(
        self,
        org_id: UUID,
        portfolio_id: UUID | None = None,
        account_id: UUID | None = None,
        asset_type: AssetType | None = None,
        as_of_date: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[HoldingOut], int]:
        offset = (page - 1) * page_size
        holdings, total = await self.repo.list(
            org_id=org_id,
            portfolio_id=portfolio_id,
            account_id=account_id,
            asset_type=asset_type,
            as_of_date=as_of_date,
            offset=offset,
            limit=page_size,
        )
        enriched = [await _enrich_holding(h, self.db) for h in holdings]
        return enriched, total

    async def update_holding(
        self, holding_id: UUID, org_id: UUID, **kwargs  # type: ignore[type-arg]
    ) -> HoldingOut:
        holding = await self.repo.get_by_id(holding_id, org_id)
        if not holding:
            raise NotFoundError("Holding not found")
        holding = await self.repo.update(holding, **kwargs)
        return await _enrich_holding(holding, self.db)

    async def delete_holding(self, holding_id: UUID, org_id: UUID) -> None:
        holding = await self.repo.get_by_id(holding_id, org_id)
        if not holding:
            raise NotFoundError("Holding not found")
        holding.soft_delete()
        await self.db.flush()

    async def get_summary(self, org_id: UUID, portfolio_id: UUID | None = None) -> list[AssetTypeSummary]:
        holdings, _ = await self.repo.list(
            org_id=org_id,
            portfolio_id=portfolio_id,
            limit=10000,
        )
        asset_repo = AssetRepository(self.db)
        summaries: dict[str, dict] = {}

        for h in holdings:
            asset_result = await self.db.execute(select(Asset).where(Asset.id == h.asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                continue
            at = asset.asset_type.value
            if at not in summaries:
                summaries[at] = {
                    "asset_type": at,
                    "total_quantity": Decimal("0"),
                    "total_cost_basis": Decimal("0"),
                    "total_current_value": Decimal("0"),
                    "total_unrealized_gain_loss": Decimal("0"),
                    "num_holdings": 0,
                }
            s = summaries[at]
            s["total_quantity"] += Decimal(str(h.quantity or 0))
            s["total_cost_basis"] += Decimal(str(h.cost_basis or 0))
            s["total_unrealized_gain_loss"] += Decimal(str(h.unrealized_gain_loss or 0))
            s["num_holdings"] += 1

            latest = await asset_repo.get_latest_price(h.asset_id)
            if latest and h.quantity is not None:
                s["total_current_value"] += Decimal(str(h.quantity)) * latest.close

        return [AssetTypeSummary(**v) for v in summaries.values()]
