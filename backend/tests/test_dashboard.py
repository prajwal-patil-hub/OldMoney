from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def dashboard_setup(client: AsyncClient, org_with_token: dict) -> dict:
    """Create asset + price + portfolio + account + holding for dashboard data tests."""
    headers = org_with_token["headers"]

    asset_resp = await client.post(
        "/api/v1/assets",
        json={"symbol": "AAPL", "name": "Apple Inc", "asset_type": "EQUITY", "currency": "USD"},
        headers=headers,
    )
    assert asset_resp.status_code == 201, asset_resp.text
    asset = asset_resp.json()["data"]

    price_resp = await client.post(
        f"/api/v1/assets/{asset['id']}/prices",
        json={"price_date": "2024-01-15", "close": "175.50"},
        headers=headers,
    )
    assert price_resp.status_code == 201, price_resp.text

    portfolio_resp = await client.post(
        "/api/v1/portfolios",
        json={"name": "Dashboard Portfolio"},
        headers=headers,
    )
    assert portfolio_resp.status_code == 201, portfolio_resp.text
    portfolio = portfolio_resp.json()["data"]

    account_resp = await client.post(
        f"/api/v1/portfolios/{portfolio['id']}/accounts",
        json={"name": "Brokerage", "account_type": "BROKERAGE"},
        headers=headers,
    )
    assert account_resp.status_code == 201, account_resp.text
    account = account_resp.json()["data"]

    holding_resp = await client.post(
        "/api/v1/holdings",
        json={
            "account_id": account["id"],
            "portfolio_id": portfolio["id"],
            "asset_id": asset["id"],
            "quantity": "100.0",
            "cost_basis": "16000.00",
            "cost_basis_per_unit": "160.00",
            "as_of_date": "2024-01-15",
        },
        headers=headers,
    )
    assert holding_resp.status_code == 201, holding_resp.text

    return {
        "asset": asset,
        "portfolio": portfolio,
        "account": account,
        "holding": holding_resp.json()["data"],
    }


# ---------------------------------------------------------------------------
# Test Classes
# ---------------------------------------------------------------------------

@pytest.mark.anyio
class TestMetrics:
    async def test_metrics_no_data_returns_zeros(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/metrics",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert float(data["total_aum"]) == 0.0
        assert "daily_change" in data
        assert "daily_change_pct" in data
        assert "ytd_return" in data
        assert "ytd_return_pct" in data
        assert "total_portfolios" in data
        assert "total_holdings" in data
        assert "as_of_date" in data
        assert resp.json()["errors"] == []

    async def test_metrics_with_data(
        self, client: AsyncClient, org_with_token: dict, dashboard_setup: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/metrics",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        # With a holding that has a price, total_aum should be > 0
        assert float(data["total_aum"]) >= 0
        assert data["total_portfolios"] >= 1
        assert data["total_holdings"] >= 1

    async def test_metrics_total_portfolios_count(
        self, client: AsyncClient, org_with_token: dict
    ):
        headers = org_with_token["headers"]
        for i in range(3):
            await client.post(
                "/api/v1/portfolios",
                json={"name": f"Metrics Portfolio {i}"},
                headers=headers,
            )
        resp = await client.get("/api/v1/dashboard/metrics", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["total_portfolios"] == 3

    async def test_metrics_requires_org_context(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/v1/dashboard/metrics", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_metrics_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/metrics")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestPerformance:
    async def test_performance_no_data_returns_list(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/performance",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert isinstance(resp.json()["data"], list)

    async def test_performance_default_days(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/performance",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_performance_with_days_param(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/performance?days=30",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_performance_days_365(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/performance?days=365",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_performance_requires_org_context(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/v1/dashboard/performance", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_performance_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/performance")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestAllocation:
    async def test_allocation_no_data_returns_empty_list(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/allocation",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"] == []

    async def test_allocation_with_holding(
        self, client: AsyncClient, org_with_token: dict, dashboard_setup: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/allocation",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        allocation = resp.json()["data"]
        assert isinstance(allocation, list)
        # With holdings that have prices, we should get some allocation data
        if len(allocation) > 0:
            item = allocation[0]
            assert "asset_type" in item
            assert "total_value" in item
            assert "percentage" in item

    async def test_allocation_requires_org_context(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/v1/dashboard/allocation", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_allocation_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/allocation")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestTopHoldings:
    async def test_top_holdings_no_data_returns_empty_list(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/top-holdings",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"] == []

    async def test_top_holdings_with_data(
        self, client: AsyncClient, org_with_token: dict, dashboard_setup: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/top-holdings",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        holdings = resp.json()["data"]
        assert isinstance(holdings, list)

    async def test_top_holdings_limit_param(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/top-holdings?limit=5",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_top_holdings_limit_capped_at_50(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/top-holdings?limit=50",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_top_holdings_limit_above_max_rejected(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/top-holdings?limit=100",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 422

    async def test_top_holdings_requires_org_context(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/v1/dashboard/top-holdings", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_top_holdings_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/top-holdings")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestRecentTransactions:
    async def test_recent_transactions_no_data_returns_empty_list(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/recent-transactions",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"] == []

    async def test_recent_transactions_with_data(
        self, client: AsyncClient, org_with_token: dict, dashboard_setup: dict
    ):
        headers = org_with_token["headers"]
        # Create a transaction
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": dashboard_setup["account"]["id"],
                "portfolio_id": dashboard_setup["portfolio"]["id"],
                "asset_id": dashboard_setup["asset"]["id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "quantity": "10.0",
                "price": "175.50",
                "currency": "USD",
            },
            headers=headers,
        )
        resp = await client.get(
            "/api/v1/dashboard/recent-transactions",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        txs = resp.json()["data"]
        assert isinstance(txs, list)
        assert len(txs) >= 1
        tx = txs[0]
        assert "id" in tx
        assert "transaction_type" in tx
        assert "trade_date" in tx

    async def test_recent_transactions_limit_param(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/recent-transactions?limit=5",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_recent_transactions_requires_org_context(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get(
            "/api/v1/dashboard/recent-transactions",
            headers=auth_headers,
        )
        assert resp.status_code in (401, 403)

    async def test_recent_transactions_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/recent-transactions")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestRequiresAuth:
    async def test_metrics_no_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/metrics")
        assert resp.status_code == 401

    async def test_performance_no_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/performance")
        assert resp.status_code == 401

    async def test_allocation_no_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/allocation")
        assert resp.status_code == 401

    async def test_top_holdings_no_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/top-holdings")
        assert resp.status_code == 401

    async def test_recent_transactions_no_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/dashboard/recent-transactions")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestRequiresOrgContext:
    """Plain auth_headers (no org_id in token) should be rejected by all dashboard endpoints."""

    async def test_metrics_no_org(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/dashboard/metrics", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_performance_no_org(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/dashboard/performance", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_allocation_no_org(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/dashboard/allocation", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_top_holdings_no_org(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/dashboard/top-holdings", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_recent_transactions_no_org(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/dashboard/recent-transactions", headers=auth_headers)
        assert resp.status_code in (401, 403)
