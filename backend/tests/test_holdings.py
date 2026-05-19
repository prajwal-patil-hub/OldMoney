from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Shared setup helpers
# ---------------------------------------------------------------------------

async def _create_second_org(client: AsyncClient) -> dict:
    """Register a fresh user, create an org, and return org-scoped headers."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "holdings_b@example.com", "password": "PassB123!", "full_name": "B User"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "holdings_b@example.com", "password": "PassB123!"},
    )
    token_b = resp.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    resp = await client.post(
        "/api/v1/orgs",
        json={"name": "Org B Holdings", "slug": "org-b-holdings"},
        headers=headers_b,
    )
    org_b_id = resp.json()["data"]["id"]
    resp = await client.post(f"/api/v1/orgs/{org_b_id}/switch", headers=headers_b)
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


@pytest_asyncio.fixture
async def holding_setup(client: AsyncClient, org_with_token: dict) -> dict:
    """Create asset + portfolio + account and return IDs."""
    headers = org_with_token["headers"]

    asset_resp = await client.post(
        "/api/v1/assets",
        json={"symbol": "AAPL", "name": "Apple Inc", "asset_type": "EQUITY", "currency": "USD"},
        headers=headers,
    )
    assert asset_resp.status_code == 201, asset_resp.text
    asset_id = asset_resp.json()["data"]["id"]

    portfolio_resp = await client.post(
        "/api/v1/portfolios",
        json={"name": "Test Portfolio"},
        headers=headers,
    )
    assert portfolio_resp.status_code == 201, portfolio_resp.text
    portfolio_id = portfolio_resp.json()["data"]["id"]

    account_resp = await client.post(
        f"/api/v1/portfolios/{portfolio_id}/accounts",
        json={"name": "Brokerage", "account_type": "BROKERAGE"},
        headers=headers,
    )
    assert account_resp.status_code == 201, account_resp.text
    account_id = account_resp.json()["data"]["id"]

    return {
        "asset_id": asset_id,
        "portfolio_id": portfolio_id,
        "account_id": account_id,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
class TestUpsertHolding:
    async def test_create_holding_returns_201(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.5",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert "id" in data
        assert float(data["quantity"]) == 10.5
        assert data["asset_id"] == holding_setup["asset_id"]
        assert data["portfolio_id"] == holding_setup["portfolio_id"]
        assert resp.json()["errors"] == []

    async def test_create_holding_with_cost_basis(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "5.0",
                "cost_basis": "750.00",
                "cost_basis_per_unit": "150.00",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["cost_basis"] is not None
        assert data["cost_basis_per_unit"] is not None

    async def test_upsert_holding_updates_existing(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        """Upserting with same account+asset updates the holding."""
        headers = org_with_token["headers"]
        payload = {
            "account_id": holding_setup["account_id"],
            "portfolio_id": holding_setup["portfolio_id"],
            "asset_id": holding_setup["asset_id"],
            "quantity": "10.0",
            "as_of_date": "2024-01-15",
        }
        resp1 = await client.post("/api/v1/holdings", json=payload, headers=headers)
        assert resp1.status_code == 201, resp1.text

        payload["quantity"] = "20.0"
        resp2 = await client.post("/api/v1/holdings", json=payload, headers=headers)
        assert resp2.status_code == 201, resp2.text
        assert float(resp2.json()["data"]["quantity"]) == 20.0

    async def test_create_holding_requires_auth(
        self, client: AsyncClient, holding_setup: dict
    ):
        resp = await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
        )
        assert resp.status_code == 401

    async def test_holding_has_asset_symbol(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "1.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["asset_symbol"] == "AAPL"


@pytest.mark.anyio
class TestListHoldings:
    async def test_list_holdings_empty(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get("/api/v1/holdings", headers=org_with_token["headers"])
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["data"] == []
        assert body["meta"]["total"] == 0

    async def test_list_holdings_returns_created(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        resp = await client.get("/api/v1/holdings", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1
        assert len(resp.json()["data"]) == 1

    async def test_filter_by_portfolio_id(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        resp = await client.get(
            f"/api/v1/holdings?portfolio_id={holding_setup['portfolio_id']}",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1

        fake_id = "00000000-0000-0000-0000-000000000000"
        resp2 = await client.get(
            f"/api/v1/holdings?portfolio_id={fake_id}",
            headers=headers,
        )
        assert resp2.json()["meta"]["total"] == 0

    async def test_filter_by_asset_type(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        resp = await client.get(
            "/api/v1/holdings?asset_type=EQUITY",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1

        resp2 = await client.get(
            "/api/v1/holdings?asset_type=CRYPTO",
            headers=headers,
        )
        assert resp2.json()["meta"]["total"] == 0

    async def test_list_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/holdings")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestUpdateHolding:
    async def test_update_quantity(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        holding_id = create_resp.json()["data"]["id"]

        resp = await client.patch(
            f"/api/v1/holdings/{holding_id}",
            json={"quantity": "25.5"},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert float(resp.json()["data"]["quantity"]) == 25.5

    async def test_update_cost_basis(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        holding_id = create_resp.json()["data"]["id"]

        resp = await client.patch(
            f"/api/v1/holdings/{holding_id}",
            json={"cost_basis": "1500.00", "cost_basis_per_unit": "150.00"},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert data["cost_basis"] is not None

    async def test_update_nonexistent_holding(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.patch(
            f"/api/v1/holdings/{fake_id}",
            json={"quantity": "5.0"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404


@pytest.mark.anyio
class TestDeleteHolding:
    async def test_delete_holding(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        holding_id = create_resp.json()["data"]["id"]

        del_resp = await client.delete(f"/api/v1/holdings/{holding_id}", headers=headers)
        assert del_resp.status_code == 200, del_resp.text

        list_resp = await client.get("/api/v1/holdings", headers=headers)
        ids = [h["id"] for h in list_resp.json()["data"]]
        assert holding_id not in ids

    async def test_delete_nonexistent_holding(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.delete(
            f"/api/v1/holdings/{fake_id}",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404


@pytest.mark.anyio
class TestHoldingSummary:
    async def test_summary_empty(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get("/api/v1/holdings/summary", headers=org_with_token["headers"])
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"] == []
        assert resp.json()["errors"] == []

    async def test_summary_with_holding(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        resp = await client.get("/api/v1/holdings/summary", headers=headers)
        assert resp.status_code == 200, resp.text
        summary = resp.json()["data"]
        assert isinstance(summary, list)
        assert len(summary) >= 1
        item = summary[0]
        assert "asset_type" in item
        assert "total_quantity" in item
        assert "total_current_value" in item
        assert "num_holdings" in item

    async def test_summary_filter_by_portfolio(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers,
        )
        resp = await client.get(
            f"/api/v1/holdings/summary?portfolio_id={holding_setup['portfolio_id']}",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

    async def test_summary_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/holdings/summary")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestTenantIsolation:
    async def test_org_b_cannot_see_org_a_holdings(
        self, client: AsyncClient, org_with_token: dict, holding_setup: dict
    ):
        # Org A creates a holding
        headers_a = org_with_token["headers"]
        await client.post(
            "/api/v1/holdings",
            json={
                "account_id": holding_setup["account_id"],
                "portfolio_id": holding_setup["portfolio_id"],
                "asset_id": holding_setup["asset_id"],
                "quantity": "10.0",
                "as_of_date": "2024-01-15",
            },
            headers=headers_a,
        )

        # Org B is created separately
        headers_b = await _create_second_org(client)

        resp = await client.get("/api/v1/holdings", headers=headers_b)
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 0
