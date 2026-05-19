from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.dashboard.schemas import (
    AllocationItem,
    DashboardMetrics,
    PerformancePoint,
    RecentTransaction,
    TopHolding,
)

log = structlog.get_logger(__name__)


class DashboardService:
    def __init__(self, db: AsyncSession, org_id: UUID) -> None:
        self.db = db
        self.org_id = org_id

    @property
    def _org_id_hex(self) -> str:
        """SQLAlchemy stores UUIDs without dashes in SQLite; use .hex for raw text() queries."""
        return self.org_id.hex

    async def get_metrics(self) -> DashboardMetrics:
        today = date.today()
        yesterday = today - timedelta(days=1)
        ytd_start = date(today.year, 1, 1)

        # Current AUM: sum(quantity * latest_close) for all active holdings
        # using the most recent price for each asset
        aum_sql = text("""
            SELECT COALESCE(SUM(h.quantity * p.close), 0) as total_aum,
                   COUNT(DISTINCT h.id) as total_holdings
            FROM holdings h
            JOIN (
                SELECT asset_id, MAX(price_date) as max_date
                FROM asset_prices
                WHERE org_id = :org_id
                GROUP BY asset_id
            ) latest ON h.asset_id = latest.asset_id
            JOIN asset_prices p ON p.asset_id = latest.asset_id
                AND p.price_date = latest.max_date
                AND p.org_id = :org_id
            WHERE h.org_id = :org_id AND h.deleted_at IS NULL
        """)

        # Yesterday's AUM
        yesterday_sql = text("""
            SELECT COALESCE(SUM(h.quantity * p.close), 0) as yesterday_aum
            FROM holdings h
            JOIN (
                SELECT asset_id, MAX(price_date) as max_date
                FROM asset_prices
                WHERE org_id = :org_id AND price_date <= :yesterday
                GROUP BY asset_id
            ) latest ON h.asset_id = latest.asset_id
            JOIN asset_prices p ON p.asset_id = latest.asset_id
                AND p.price_date = latest.max_date
                AND p.org_id = :org_id
            WHERE h.org_id = :org_id AND h.deleted_at IS NULL
        """)

        # YTD start AUM
        ytd_start_sql = text("""
            SELECT COALESCE(SUM(h.quantity * p.close), 0) as ytd_start_aum
            FROM holdings h
            JOIN (
                SELECT asset_id, MAX(price_date) as max_date
                FROM asset_prices
                WHERE org_id = :org_id AND price_date <= :ytd_start
                GROUP BY asset_id
            ) latest ON h.asset_id = latest.asset_id
            JOIN asset_prices p ON p.asset_id = latest.asset_id
                AND p.price_date = latest.max_date
                AND p.org_id = :org_id
            WHERE h.org_id = :org_id AND h.deleted_at IS NULL
        """)

        portfolio_count_sql = text("""
            SELECT COUNT(*) as cnt FROM portfolios
            WHERE org_id = :org_id AND deleted_at IS NULL AND status = 'ACTIVE'
        """)

        params = {"org_id": self._org_id_hex}

        aum_row = (await self.db.execute(aum_sql, params)).mappings().one()
        yesterday_row = (await self.db.execute(yesterday_sql, {**params, "yesterday": str(yesterday)})).mappings().one()
        ytd_row = (await self.db.execute(ytd_start_sql, {**params, "ytd_start": str(ytd_start)})).mappings().one()
        portfolio_row = (await self.db.execute(portfolio_count_sql, params)).mappings().one()

        total_aum = Decimal(str(aum_row["total_aum"]))
        yesterday_aum = Decimal(str(yesterday_row["yesterday_aum"]))
        ytd_start_aum = Decimal(str(ytd_row["ytd_start_aum"]))

        daily_change = total_aum - yesterday_aum
        daily_change_pct = (daily_change / yesterday_aum * 100) if yesterday_aum > 0 else Decimal("0")
        ytd_return = total_aum - ytd_start_aum
        ytd_return_pct = (ytd_return / ytd_start_aum * 100) if ytd_start_aum > 0 else Decimal("0")

        return DashboardMetrics(
            total_aum=total_aum.quantize(Decimal("0.01")),
            daily_change=daily_change.quantize(Decimal("0.01")),
            daily_change_pct=daily_change_pct.quantize(Decimal("0.0001")),
            ytd_return=ytd_return.quantize(Decimal("0.01")),
            ytd_return_pct=ytd_return_pct.quantize(Decimal("0.0001")),
            total_portfolios=int(portfolio_row["cnt"]),
            total_holdings=int(aum_row["total_holdings"]),
            as_of_date=today,
        )

    async def get_performance(self, days: int = 90, portfolio_id: UUID | None = None) -> list[PerformancePoint]:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        portfolio_filter = "AND h.portfolio_id = :portfolio_id" if portfolio_id else ""
        params: dict = {
            "org_id": self._org_id_hex,
            "start_date": str(start_date),
            "end_date": str(end_date),
        }
        if portfolio_id:
            params["portfolio_id"] = portfolio_id.hex

        sql = text(f"""
            SELECT p.price_date, COALESCE(SUM(h.quantity * p.close), 0) as total_value
            FROM asset_prices p
            JOIN holdings h ON h.asset_id = p.asset_id
                AND h.org_id = p.org_id
                AND h.deleted_at IS NULL
                {portfolio_filter}
            WHERE p.org_id = :org_id
              AND p.price_date >= :start_date
              AND p.price_date <= :end_date
            GROUP BY p.price_date
            ORDER BY p.price_date ASC
        """)

        result = await self.db.execute(sql, params)
        rows = result.mappings().all()
        return [
            PerformancePoint(date=row["price_date"], value=Decimal(str(row["total_value"])).quantize(Decimal("0.01")))
            for row in rows
        ]

    async def get_allocation(self, portfolio_id: UUID | None = None) -> list[AllocationItem]:
        portfolio_filter = "AND h.portfolio_id = :portfolio_id" if portfolio_id else ""
        params: dict = {"org_id": self._org_id_hex}
        if portfolio_id:
            params["portfolio_id"] = portfolio_id.hex

        sql = text(f"""
            SELECT a.asset_type,
                   COALESCE(SUM(h.quantity * p.close), 0) as total_value
            FROM holdings h
            JOIN assets a ON h.asset_id = a.id
            JOIN (
                SELECT asset_id, MAX(price_date) as max_date
                FROM asset_prices
                WHERE org_id = :org_id
                GROUP BY asset_id
            ) latest ON h.asset_id = latest.asset_id
            JOIN asset_prices p ON p.asset_id = latest.asset_id
                AND p.price_date = latest.max_date
                AND p.org_id = :org_id
            WHERE h.org_id = :org_id AND h.deleted_at IS NULL
              AND a.deleted_at IS NULL
              {portfolio_filter}
            GROUP BY a.asset_type
            ORDER BY total_value DESC
        """)

        result = await self.db.execute(sql, params)
        rows = result.mappings().all()

        items = [
            AllocationItem(asset_type=row["asset_type"], total_value=Decimal(str(row["total_value"])), percentage=Decimal("0"))
            for row in rows
        ]
        total = sum(i.total_value for i in items)
        if total > 0:
            for item in items:
                item.percentage = (item.total_value / total * 100).quantize(Decimal("0.01"))
        return items

    async def get_top_holdings(self, limit: int = 10, portfolio_id: UUID | None = None) -> list[TopHolding]:
        portfolio_filter = "AND h.portfolio_id = :portfolio_id" if portfolio_id else ""
        params: dict = {"org_id": self._org_id_hex, "limit": limit}
        if portfolio_id:
            params["portfolio_id"] = portfolio_id.hex

        sql = text(f"""
            SELECT h.id as holding_id, h.portfolio_id, h.asset_id,
                   a.symbol, a.name, a.asset_type,
                   h.quantity, h.cost_basis,
                   h.unrealized_gain_loss,
                   p.close as current_price,
                   h.quantity * p.close as current_value
            FROM holdings h
            JOIN assets a ON h.asset_id = a.id
            JOIN (
                SELECT asset_id, MAX(price_date) as max_date
                FROM asset_prices
                WHERE org_id = :org_id
                GROUP BY asset_id
            ) latest ON h.asset_id = latest.asset_id
            JOIN asset_prices p ON p.asset_id = latest.asset_id
                AND p.price_date = latest.max_date
                AND p.org_id = :org_id
            WHERE h.org_id = :org_id AND h.deleted_at IS NULL
              AND a.deleted_at IS NULL
              {portfolio_filter}
            ORDER BY current_value DESC
            LIMIT :limit
        """)

        result = await self.db.execute(sql, params)
        rows = result.mappings().all()

        # Compute total for weight
        total_value = sum(Decimal(str(row["current_value"])) for row in rows)

        holdings = []
        for row in rows:
            cv = Decimal(str(row["current_value"]))
            weight = (cv / total_value * 100).quantize(Decimal("0.01")) if total_value > 0 else Decimal("0")
            holdings.append(TopHolding(
                holding_id=row["holding_id"],
                portfolio_id=row["portfolio_id"],
                asset_id=row["asset_id"],
                asset_symbol=row["symbol"],
                asset_name=row["name"],
                asset_type=row["asset_type"],
                quantity=Decimal(str(row["quantity"])),
                current_price=Decimal(str(row["current_price"])) if row["current_price"] else None,
                current_value=cv.quantize(Decimal("0.01")),
                cost_basis=Decimal(str(row["cost_basis"])) if row["cost_basis"] else None,
                unrealized_gain_loss=Decimal(str(row["unrealized_gain_loss"])) if row["unrealized_gain_loss"] else None,
                weight_pct=weight,
            ))
        return holdings

    async def get_recent_transactions(self, limit: int = 10, portfolio_id: UUID | None = None) -> list[RecentTransaction]:
        portfolio_filter = "AND t.portfolio_id = :portfolio_id" if portfolio_id else ""
        params: dict = {"org_id": self._org_id_hex, "limit": limit}
        if portfolio_id:
            params["portfolio_id"] = portfolio_id.hex

        sql = text(f"""
            SELECT t.id, t.portfolio_id, t.asset_id, t.transaction_type,
                   t.trade_date, t.quantity, t.price, t.net_amount, t.currency,
                   a.symbol as asset_symbol
            FROM transactions t
            LEFT JOIN assets a ON t.asset_id = a.id
            WHERE t.org_id = :org_id AND t.deleted_at IS NULL
              {portfolio_filter}
            ORDER BY t.trade_date DESC, t.created_at DESC
            LIMIT :limit
        """)

        result = await self.db.execute(sql, params)
        rows = result.mappings().all()

        return [
            RecentTransaction(
                id=row["id"],
                portfolio_id=row["portfolio_id"],
                asset_id=row["asset_id"],
                asset_symbol=row["asset_symbol"],
                transaction_type=row["transaction_type"],
                trade_date=row["trade_date"],
                quantity=Decimal(str(row["quantity"])) if row["quantity"] else None,
                price=Decimal(str(row["price"])) if row["price"] else None,
                net_amount=Decimal(str(row["net_amount"])) if row["net_amount"] else None,
                currency=row["currency"],
            )
            for row in rows
        ]
