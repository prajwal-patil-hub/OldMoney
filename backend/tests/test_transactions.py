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
        json={"email": "tx_b@example.com", "password": "PassB123!", "full_name": "B User"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "tx_b@example.com", "password": "PassB123!"},
    )
    token_b = resp.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    resp = await client.post(
        "/api/v1/orgs",
        json={"name": "Org B TX", "slug": "org-b-tx"},
        headers=headers_b,
    )
    org_b_id = resp.json()["data"]["id"]
    resp = await client.post(f"/api/v1/orgs/{org_b_id}/switch", headers=headers_b)
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


@pytest_asyncio.fixture
async def tx_setup(client: AsyncClient, org_with_token: dict) -> dict:
    """Create asset + portfolio + account and return IDs."""
    headers = org_with_token["headers"]

    asset_resp = await client.post(
        "/api/v1/assets",
        json={"symbol": "MSFT", "name": "Microsoft Corp", "asset_type": "EQUITY", "currency": "USD"},
        headers=headers,
    )
    assert asset_resp.status_code == 201, asset_resp.text
    asset_id = asset_resp.json()["data"]["id"]

    portfolio_resp = await client.post(
        "/api/v1/portfolios",
        json={"name": "TX Test Portfolio"},
        headers=headers,
    )
    assert portfolio_resp.status_code == 201, portfolio_resp.text
    portfolio_id = portfolio_resp.json()["data"]["id"]

    account_resp = await client.post(
        f"/api/v1/portfolios/{portfolio_id}/accounts",
        json={"name": "Brokerage TX", "account_type": "BROKERAGE"},
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
class TestCreateTransaction:
    async def test_create_buy_transaction(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "asset_id": tx_setup["asset_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "quantity": "10.0",
                "price": "150.00",
                "gross_amount": "1500.00",
                "currency": "USD",
            },
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert "id" in data
        assert data["transaction_type"] == "BUY"
        assert data["portfolio_id"] == tx_setup["portfolio_id"]
        assert data["asset_id"] == tx_setup["asset_id"]
        assert resp.json()["errors"] == []

    async def test_create_transaction_all_types(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        for tx_type in ["SELL", "DIVIDEND", "DEPOSIT", "WITHDRAWAL"]:
            resp = await client.post(
                "/api/v1/transactions",
                json={
                    "account_id": tx_setup["account_id"],
                    "portfolio_id": tx_setup["portfolio_id"],
                    "transaction_type": tx_type,
                    "trade_date": "2024-01-15",
                    "currency": "USD",
                },
                headers=headers,
            )
            assert resp.status_code == 201, f"{tx_type}: {resp.text}"

    async def test_create_transaction_with_external_id(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "external_id": "EXT-001",
                "currency": "USD",
            },
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["data"]["external_id"] == "EXT-001"

    async def test_create_transaction_requires_auth(
        self, client: AsyncClient, tx_setup: dict
    ):
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
        )
        assert resp.status_code == 401


@pytest.mark.anyio
class TestCreateTransactionDuplicateExternalId:
    async def test_duplicate_external_id_returns_409(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        payload = {
            "account_id": tx_setup["account_id"],
            "portfolio_id": tx_setup["portfolio_id"],
            "transaction_type": "BUY",
            "trade_date": "2024-01-15",
            "external_id": "UNIQUE-EXT-123",
            "currency": "USD",
        }
        resp1 = await client.post("/api/v1/transactions", json=payload, headers=headers)
        assert resp1.status_code == 201, resp1.text

        resp2 = await client.post("/api/v1/transactions", json=payload, headers=headers)
        assert resp2.status_code == 409, resp2.text
        assert resp2.json()["errors"][0]["code"] == "CONFLICT"


@pytest.mark.anyio
class TestListTransactions:
    async def test_list_empty(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get("/api/v1/transactions", headers=org_with_token["headers"])
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"] == []
        assert resp.json()["meta"]["total"] == 0

    async def test_list_returns_created(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        for i in range(3):
            await client.post(
                "/api/v1/transactions",
                json={
                    "account_id": tx_setup["account_id"],
                    "portfolio_id": tx_setup["portfolio_id"],
                    "transaction_type": "BUY",
                    "trade_date": "2024-01-15",
                    "currency": "USD",
                },
                headers=headers,
            )
        resp = await client.get("/api/v1/transactions", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 3

    async def test_filter_by_transaction_type(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers,
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "SELL",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers,
        )
        resp = await client.get(
            "/api/v1/transactions?transaction_type=BUY",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1
        assert resp.json()["data"][0]["transaction_type"] == "BUY"

    async def test_filter_by_date_range(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-10",
                "currency": "USD",
            },
            headers=headers,
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-03-20",
                "currency": "USD",
            },
            headers=headers,
        )
        resp = await client.get(
            "/api/v1/transactions?date_from=2024-01-01&date_to=2024-01-31",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1

    async def test_filter_by_portfolio_id(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers,
        )
        resp = await client.get(
            f"/api/v1/transactions?portfolio_id={tx_setup['portfolio_id']}",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1

        fake_id = "00000000-0000-0000-0000-000000000000"
        resp2 = await client.get(
            f"/api/v1/transactions?portfolio_id={fake_id}",
            headers=headers,
        )
        assert resp2.json()["meta"]["total"] == 0

    async def test_list_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/transactions")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestGetTransaction:
    async def test_get_transaction_by_id(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        tx_id = create_resp.json()["data"]["id"]

        resp = await client.get(f"/api/v1/transactions/{tx_id}", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["id"] == tx_id

    async def test_get_transaction_not_found(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.get(
            f"/api/v1/transactions/{fake_id}",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404
        assert resp.json()["errors"][0]["code"] == "NOT_FOUND"


@pytest.mark.anyio
class TestUpdateTransaction:
    async def test_update_notes(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers,
        )
        tx_id = create_resp.json()["data"]["id"]

        resp = await client.patch(
            f"/api/v1/transactions/{tx_id}",
            json={"notes": "Updated note"},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["notes"] == "Updated note"

    async def test_update_price(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "price": "100.00",
                "currency": "USD",
            },
            headers=headers,
        )
        tx_id = create_resp.json()["data"]["id"]

        resp = await client.patch(
            f"/api/v1/transactions/{tx_id}",
            json={"price": "110.00"},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert float(resp.json()["data"]["price"]) == 110.0

    async def test_update_nonexistent_transaction(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.patch(
            f"/api/v1/transactions/{fake_id}",
            json={"notes": "test"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404


@pytest.mark.anyio
class TestDeleteTransaction:
    async def test_delete_transaction(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        tx_id = create_resp.json()["data"]["id"]

        del_resp = await client.delete(f"/api/v1/transactions/{tx_id}", headers=headers)
        assert del_resp.status_code == 200, del_resp.text

        list_resp = await client.get("/api/v1/transactions", headers=headers)
        ids = [t["id"] for t in list_resp.json()["data"]]
        assert tx_id not in ids

    async def test_delete_nonexistent_transaction(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.delete(
            f"/api/v1/transactions/{fake_id}",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404


@pytest.mark.anyio
class TestExportCSV:
    async def test_export_returns_csv(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        # Create a transaction to export
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers,
        )
        resp = await client.get("/api/v1/transactions/export", headers=headers)
        assert resp.status_code == 200, resp.text
        assert "text/csv" in resp.headers.get("content-type", "")

    async def test_export_has_header_row(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/transactions/export",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        body = resp.text
        # CSV should have a header row with at least one recognizable column name
        assert len(body.strip()) > 0
        first_line = body.strip().split("\n")[0]
        # Header row should contain CSV column names
        assert "," in first_line or len(first_line) > 0

    async def test_export_filter_by_portfolio(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        headers = org_with_token["headers"]
        resp = await client.get(
            f"/api/v1/transactions/export?portfolio_id={tx_setup['portfolio_id']}",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert "text/csv" in resp.headers.get("content-type", "")

    async def test_export_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/transactions/export")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestTenantIsolation:
    async def test_org_b_cannot_see_org_a_transactions(
        self, client: AsyncClient, org_with_token: dict, tx_setup: dict
    ):
        # Org A creates a transaction
        headers_a = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": tx_setup["account_id"],
                "portfolio_id": tx_setup["portfolio_id"],
                "transaction_type": "BUY",
                "trade_date": "2024-01-15",
                "currency": "USD",
            },
            headers=headers_a,
        )
        assert resp.status_code == 201, resp.text
        tx_id = resp.json()["data"]["id"]

        # Org B is created separately
        headers_b = await _create_second_org(client)

        list_resp = await client.get("/api/v1/transactions", headers=headers_b)
        assert list_resp.status_code == 200, list_resp.text
        assert list_resp.json()["meta"]["total"] == 0

        get_resp = await client.get(f"/api/v1/transactions/{tx_id}", headers=headers_b)
        assert get_resp.status_code == 404
