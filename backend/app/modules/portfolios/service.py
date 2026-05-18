from __future__ import annotations

from datetime import date, UTC
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.modules.portfolios.models import Account, Portfolio
from app.modules.portfolios.repository import AccountRepository, PortfolioRepository
from app.modules.portfolios.schemas import (
    AccountOut,
    AllocationItem,
    PortfolioOut,
    PortfolioSummary,
)

log = structlog.get_logger(__name__)


def _portfolio_to_out(portfolio: Portfolio) -> PortfolioOut:
    accounts = [
        AccountOut(
            id=a.id,
            portfolio_id=a.portfolio_id,
            org_id=a.org_id,
            name=a.name,
            account_number=a.account_number,
            account_type=a.account_type,
            custodian=a.custodian,
            currency=a.currency,
            is_active=a.is_active,
            metadata=a.metadata_,
            created_at=a.created_at,
        )
        for a in (portfolio.accounts or [])
        if a.deleted_at is None
    ]
    return PortfolioOut(
        id=portfolio.id,
        org_id=portfolio.org_id,
        name=portfolio.name,
        description=portfolio.description,
        inception_date=portfolio.inception_date,
        base_currency=portfolio.base_currency,
        portfolio_type=portfolio.portfolio_type,
        status=portfolio.status,
        benchmark_id=portfolio.benchmark_id,
        manager_user_id=portfolio.manager_user_id,
        metadata=portfolio.metadata_,
        created_at=portfolio.created_at,
        accounts=accounts,
    )


class PortfolioService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.portfolio_repo = PortfolioRepository(db)
        self.account_repo = AccountRepository(db)

    async def create_portfolio(self, org_id: UUID, **kwargs) -> PortfolioOut:  # type: ignore[type-arg]
        metadata = kwargs.pop("metadata", {})
        portfolio = await self.portfolio_repo.create(
            org_id=org_id,
            metadata_=metadata,
            **kwargs,
        )
        log.info("portfolio_created", portfolio_id=str(portfolio.id), org_id=str(org_id))
        return _portfolio_to_out(portfolio)

    async def list_portfolios(
        self,
        org_id: UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[PortfolioOut], int]:
        offset = (page - 1) * page_size
        portfolios, total = await self.portfolio_repo.list(
            org_id=org_id, offset=offset, limit=page_size
        )
        return [_portfolio_to_out(p) for p in portfolios], total

    async def get_portfolio(self, portfolio_id: UUID, org_id: UUID) -> PortfolioOut:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id, org_id)
        if not portfolio:
            raise NotFoundError("Portfolio not found")
        return _portfolio_to_out(portfolio)

    async def update_portfolio(
        self, portfolio_id: UUID, org_id: UUID, **kwargs  # type: ignore[type-arg]
    ) -> PortfolioOut:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id, org_id)
        if not portfolio:
            raise NotFoundError("Portfolio not found")
        if "metadata" in kwargs:
            kwargs["metadata_"] = kwargs.pop("metadata")
        portfolio = await self.portfolio_repo.update(portfolio, **kwargs)
        return _portfolio_to_out(portfolio)

    async def delete_portfolio(self, portfolio_id: UUID, org_id: UUID) -> None:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id, org_id)
        if not portfolio:
            raise NotFoundError("Portfolio not found")
        portfolio.soft_delete()
        await self.db.flush()

    async def add_account(
        self, portfolio_id: UUID, org_id: UUID, **kwargs  # type: ignore[type-arg]
    ) -> AccountOut:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id, org_id)
        if not portfolio:
            raise NotFoundError("Portfolio not found")
        metadata = kwargs.pop("metadata", {})
        account = await self.account_repo.create(
            portfolio_id=portfolio_id,
            org_id=org_id,
            metadata_=metadata,
            **kwargs,
        )
        return AccountOut(
            id=account.id,
            portfolio_id=account.portfolio_id,
            org_id=account.org_id,
            name=account.name,
            account_number=account.account_number,
            account_type=account.account_type,
            custodian=account.custodian,
            currency=account.currency,
            is_active=account.is_active,
            metadata=account.metadata_,
            created_at=account.created_at,
        )

    async def list_accounts(self, portfolio_id: UUID, org_id: UUID) -> list[AccountOut]:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id, org_id)
        if not portfolio:
            raise NotFoundError("Portfolio not found")
        accounts = await self.account_repo.list_for_portfolio(portfolio_id, org_id)
        return [
            AccountOut(
                id=a.id,
                portfolio_id=a.portfolio_id,
                org_id=a.org_id,
                name=a.name,
                account_number=a.account_number,
                account_type=a.account_type,
                custodian=a.custodian,
                currency=a.currency,
                is_active=a.is_active,
                metadata=a.metadata_,
                created_at=a.created_at,
            )
            for a in accounts
        ]

    async def get_summary(self, portfolio_id: UUID, org_id: UUID) -> PortfolioSummary:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id, org_id)
        if not portfolio:
            raise NotFoundError("Portfolio not found")

        from app.modules.holdings.models import Holding
        from app.modules.assets.models import Asset

        holdings_result = await self.db.execute(
            select(Holding, Asset)
            .join(Asset, Holding.asset_id == Asset.id)
            .where(
                Holding.portfolio_id == portfolio_id,
                Holding.org_id == org_id,
                Holding.deleted_at.is_(None),
            )
        )
        rows = holdings_result.all()

        total_value = Decimal("0")
        total_cost = Decimal("0")
        unrealized = Decimal("0")
        allocation: dict[str, Decimal] = {}
        num_holdings = len(rows)

        for holding, asset in rows:
            # Use latest price if available, else cost basis
            from app.modules.assets.repository import AssetRepository
            asset_repo = AssetRepository(self.db)
            latest_price = await asset_repo.get_latest_price(asset.id)

            if latest_price and holding.quantity:
                current_value = Decimal(str(holding.quantity)) * latest_price.close
            elif holding.cost_basis:
                current_value = Decimal(str(holding.cost_basis))
            else:
                current_value = Decimal("0")

            cost = Decimal(str(holding.cost_basis or 0))
            total_value += current_value
            total_cost += cost
            unrealized += current_value - cost

            asset_type_str = asset.asset_type.value
            allocation[asset_type_str] = allocation.get(asset_type_str, Decimal("0")) + current_value

        unrealized_pct = (unrealized / total_cost * 100) if total_cost > 0 else Decimal("0")

        allocation_items = [
            AllocationItem(
                asset_type=at,
                total_value=val,
                percentage=(val / total_value * 100) if total_value > 0 else Decimal("0"),
            )
            for at, val in allocation.items()
        ]

        accounts = await self.account_repo.list_for_portfolio(portfolio_id, org_id)

        return PortfolioSummary(
            portfolio_id=portfolio_id,
            total_value=total_value,
            total_cost_basis=total_cost,
            unrealized_gain_loss=unrealized,
            unrealized_gain_loss_pct=unrealized_pct.quantize(Decimal("0.01")),
            num_accounts=len(accounts),
            num_holdings=num_holdings,
            allocation_by_type=allocation_items,
            as_of_date=date.today(),
        )
