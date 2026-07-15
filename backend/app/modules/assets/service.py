from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.assets.models import Asset, AssetType
from app.modules.assets.repository import AssetRepository
from app.modules.assets.schemas import AssetOut, PriceOut

log = structlog.get_logger(__name__)


def _asset_to_out(asset: Asset, latest_price=None) -> AssetOut:
    return AssetOut(
        id=asset.id,
        org_id=asset.org_id,
        symbol=asset.symbol,
        name=asset.name,
        asset_type=asset.asset_type,
        isin=asset.isin,
        cusip=asset.cusip,
        exchange=asset.exchange,
        currency=asset.currency,
        sector=asset.sector,
        industry=asset.industry,
        country=asset.country,
        is_active=asset.is_active,
        metadata=asset.metadata_,
        created_at=asset.created_at,
        latest_price=PriceOut.model_validate(latest_price) if latest_price else None,
    )


class AssetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = AssetRepository(db)

    async def create_asset(self, org_id: UUID, **kwargs) -> AssetOut:  # type: ignore[type-arg]
        metadata = kwargs.pop("metadata", {})
        asset = await self.repo.create(
            org_id=org_id,
            metadata_=metadata,
            **kwargs,
        )
        log.info("asset_created", asset_id=str(asset.id), org_id=str(org_id))
        return _asset_to_out(asset)

    async def list_assets(
        self,
        org_id: UUID,
        symbol: str | None = None,
        name: str | None = None,
        search: str | None = None,
        asset_type: AssetType | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AssetOut], int]:
        offset = (page - 1) * page_size
        assets, total = await self.repo.list(
            org_id=org_id,
            symbol=symbol,
            name=name,
            search=search,
            asset_type=asset_type,
            is_active=is_active,
            offset=offset,
            limit=page_size,
        )
        result = []
        for a in assets:
            latest = await self.repo.get_latest_price(a.id)
            result.append(_asset_to_out(a, latest))
        return result, total

    async def get_asset(self, asset_id: UUID, org_id: UUID) -> AssetOut:
        asset = await self.repo.get_by_id(asset_id, org_id)
        if not asset:
            raise NotFoundError("Asset not found")
        latest = await self.repo.get_latest_price(asset.id)
        return _asset_to_out(asset, latest)

    async def update_asset(self, asset_id: UUID, org_id: UUID, **kwargs) -> AssetOut:  # type: ignore[type-arg]
        asset = await self.repo.get_by_id(asset_id, org_id)
        if not asset:
            raise NotFoundError("Asset not found")
        if "metadata" in kwargs:
            kwargs["metadata_"] = kwargs.pop("metadata")
        update_data = {k: v for k, v in kwargs.items() if v is not None}
        asset = await self.repo.update(asset, **update_data)
        latest = await self.repo.get_latest_price(asset.id)
        return _asset_to_out(asset, latest)

    async def delete_asset(self, asset_id: UUID, org_id: UUID) -> None:
        asset = await self.repo.get_by_id(asset_id, org_id)
        if not asset:
            raise NotFoundError("Asset not found")

        # Cascade: holdings referencing this asset must not linger as live rows
        # (they'd be counted in some aggregates and dropped from others,
        # producing inconsistent totals across endpoints).
        from datetime import UTC, datetime
        from sqlalchemy import update
        from app.modules.holdings.models import Holding

        await self.db.execute(
            update(Holding)
            .where(
                Holding.asset_id == asset_id,
                Holding.org_id == org_id,
                Holding.deleted_at.is_(None),
            )
            .values(deleted_at=datetime.now(UTC))
        )

        asset.soft_delete()
        await self.db.flush()

    async def add_price(
        self,
        asset_id: UUID,
        org_id: UUID,
        price_date: date,
        close: Decimal,
        **kwargs,  # type: ignore[type-arg]
    ) -> PriceOut:
        asset = await self.repo.get_by_id(asset_id, org_id)
        if not asset:
            raise NotFoundError("Asset not found")
        price = await self.repo.upsert_price(
            asset_id=asset_id,
            org_id=org_id,
            price_date=price_date,
            close=close,
            **kwargs,
        )
        return PriceOut.model_validate(price)

    async def get_price_history(
        self,
        asset_id: UUID,
        org_id: UUID,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[PriceOut]:
        asset = await self.repo.get_by_id(asset_id, org_id)
        if not asset:
            raise NotFoundError("Asset not found")
        prices = await self.repo.get_price_history(
            asset_id=asset_id,
            org_id=org_id,
            date_from=date_from,
            date_to=date_to,
        )
        return [PriceOut.model_validate(p) for p in prices]

    async def import_prices_csv(
        self,
        org_id: UUID,
        csv_content: str,
    ) -> dict:
        """Import CSV with columns: date, symbol, close"""
        reader = csv.DictReader(io.StringIO(csv_content))
        success_count = 0
        error_count = 0
        errors = []

        for row_num, row in enumerate(reader, start=2):
            try:
                price_date = date.fromisoformat(row["date"].strip())
                symbol = row["symbol"].strip().upper()
                close = Decimal(row["close"].strip())

                asset = await self.repo.get_by_symbol(symbol, org_id)
                if not asset:
                    errors.append({"row": row_num, "error": f"Asset '{symbol}' not found"})
                    error_count += 1
                    continue

                await self.repo.upsert_price(
                    asset_id=asset.id,
                    org_id=org_id,
                    price_date=price_date,
                    close=close,
                )
                success_count += 1
            except (KeyError, ValueError, InvalidOperation) as e:
                errors.append({"row": row_num, "error": str(e)})
                error_count += 1

        await self.db.flush()
        return {
            "imported": success_count,
            "errors": error_count,
            "error_details": errors[:50],
        }
