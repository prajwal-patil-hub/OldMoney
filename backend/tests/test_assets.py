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
        json={"email": "assets_b@example.com", "password": "PassB123!", "full_name": "B User"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "assets_b@example.com", "password": "PassB123!"},
    )
    token_b = resp.json()["data"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    resp = await client.post(
        "/api/v1/orgs",
        json={"name": "Org B Assets", "slug": "org-b-assets"},
        headers=headers_b,
    )
    org_b_id = resp.json()["data"]["id"]
    resp = await client.post(f"/api/v1/orgs/{org_b_id}/switch", headers=headers_b)
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


@pytest_asyncio.fixture
async def asset_fixture(client: AsyncClient, org_with_token: dict) -> dict:
    """Create a single AAPL asset and return its data."""
    resp = await client.post(
        "/api/v1/assets",
        json={"symbol": "AAPL", "name": "Apple Inc", "asset_type": "EQUITY", "currency": "USD"},
        headers=org_with_token["headers"],
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


# ---------------------------------------------------------------------------
# Test Classes
# ---------------------------------------------------------------------------

@pytest.mark.anyio
class TestCreateAsset:
    async def test_create_asset_returns_201(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.post(
            "/api/v1/assets",
            json={"symbol": "GOOG", "name": "Alphabet Inc", "asset_type": "EQUITY", "currency": "USD"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["symbol"] == "GOOG"
        assert data["name"] == "Alphabet Inc"
        assert data["asset_type"] == "EQUITY"
        assert "id" in data
        assert resp.json()["errors"] == []

    async def test_create_asset_all_fields(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.post(
            "/api/v1/assets",
            json={
                "symbol": "MSFT",
                "name": "Microsoft Corporation",
                "asset_type": "EQUITY",
                "currency": "USD",
                "sector": "Technology",
                "industry": "Software",
                "exchange": "NASDAQ",
                "isin": "US5949181045",
                "country": "US",
            },
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["sector"] == "Technology"
        assert data["industry"] == "Software"
        assert data["exchange"] == "NASDAQ"
        assert data["country"] == "US"

    async def test_create_asset_default_active(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.post(
            "/api/v1/assets",
            json={"symbol": "TSLA", "name": "Tesla Inc", "asset_type": "EQUITY", "currency": "USD"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["data"]["is_active"] is True

    async def test_create_duplicate_symbol_allowed(
        self, client: AsyncClient, org_with_token: dict
    ):
        # Assets do not enforce symbol uniqueness per org (each asset has its own UUID)
        headers = org_with_token["headers"]
        payload = {"symbol": "DUPE", "name": "Dupe Asset", "asset_type": "EQUITY", "currency": "USD"}
        resp1 = await client.post("/api/v1/assets", json=payload, headers=headers)
        assert resp1.status_code == 201, resp1.text

        resp2 = await client.post("/api/v1/assets", json=payload, headers=headers)
        assert resp2.status_code == 201, resp2.text
        # Both exist with distinct IDs
        assert resp1.json()["data"]["id"] != resp2.json()["data"]["id"]

    async def test_create_asset_different_types(
        self, client: AsyncClient, org_with_token: dict
    ):
        headers = org_with_token["headers"]
        for i, asset_type in enumerate(["BOND", "ETF", "CRYPTO", "REAL_ESTATE", "ALTERNATIVE"]):
            resp = await client.post(
                "/api/v1/assets",
                json={"symbol": f"SYM{i}", "name": f"Asset {i}", "asset_type": asset_type, "currency": "USD"},
                headers=headers,
            )
            assert resp.status_code == 201, f"{asset_type}: {resp.text}"
            assert resp.json()["data"]["asset_type"] == asset_type

    async def test_create_asset_requires_auth(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/assets",
            json={"symbol": "X", "name": "X Asset", "asset_type": "EQUITY", "currency": "USD"},
        )
        assert resp.status_code == 401

    async def test_create_asset_requires_org_context(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/assets",
            json={"symbol": "X", "name": "X Asset", "asset_type": "EQUITY", "currency": "USD"},
            headers=auth_headers,
        )
        assert resp.status_code == 403


@pytest.mark.anyio
class TestListAssets:
    async def test_list_empty(self, client: AsyncClient, org_with_token: dict):
        resp = await client.get("/api/v1/assets", headers=org_with_token["headers"])
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"] == []
        assert resp.json()["meta"]["total"] == 0

    async def test_list_returns_created_assets(
        self, client: AsyncClient, org_with_token: dict
    ):
        headers = org_with_token["headers"]
        for i in range(3):
            await client.post(
                "/api/v1/assets",
                json={"symbol": f"SYM{i}", "name": f"Asset {i}", "asset_type": "EQUITY", "currency": "USD"},
                headers=headers,
            )
        resp = await client.get("/api/v1/assets", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 3
        assert len(resp.json()["data"]) == 3

    async def test_filter_by_symbol_exact(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.get(
            "/api/v1/assets?symbol=AAPL",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1
        assert resp.json()["data"][0]["symbol"] == "AAPL"

    async def test_filter_by_symbol_partial(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.get(
            "/api/v1/assets?symbol=AA",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        # Should find AAPL (partial match)
        assert resp.json()["meta"]["total"] >= 1

    async def test_filter_by_asset_type(
        self, client: AsyncClient, org_with_token: dict
    ):
        headers = org_with_token["headers"]
        await client.post(
            "/api/v1/assets",
            json={"symbol": "EQT1", "name": "Equity 1", "asset_type": "EQUITY", "currency": "USD"},
            headers=headers,
        )
        await client.post(
            "/api/v1/assets",
            json={"symbol": "BTC1", "name": "Bitcoin", "asset_type": "CRYPTO", "currency": "USD"},
            headers=headers,
        )
        resp = await client.get("/api/v1/assets?asset_type=EQUITY", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["meta"]["total"] == 1

        resp2 = await client.get("/api/v1/assets?asset_type=CRYPTO", headers=headers)
        assert resp2.json()["meta"]["total"] == 1

    async def test_filter_by_is_active(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        headers = org_with_token["headers"]
        # Deactivate the fixture asset
        await client.patch(
            f"/api/v1/assets/{asset_fixture['id']}",
            json={"is_active": False},
            headers=headers,
        )
        resp_active = await client.get("/api/v1/assets?is_active=true", headers=headers)
        assert resp_active.status_code == 200, resp_active.text
        assert resp_active.json()["meta"]["total"] == 0

        resp_inactive = await client.get("/api/v1/assets?is_active=false", headers=headers)
        assert resp_inactive.json()["meta"]["total"] == 1

    async def test_pagination(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        for i in range(5):
            await client.post(
                "/api/v1/assets",
                json={"symbol": f"PG{i}", "name": f"Paged {i}", "asset_type": "EQUITY", "currency": "USD"},
                headers=headers,
            )
        resp = await client.get("/api/v1/assets?page=1&page_size=3", headers=headers)
        assert resp.status_code == 200, resp.text
        assert len(resp.json()["data"]) == 3
        assert resp.json()["meta"]["total"] == 5
        assert resp.json()["meta"]["has_next"] is True

        resp2 = await client.get("/api/v1/assets?page=2&page_size=3", headers=headers)
        assert len(resp2.json()["data"]) == 2
        assert resp2.json()["meta"]["has_next"] is False

    async def test_list_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/assets")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestGetAsset:
    async def test_get_asset_by_id(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.get(
            f"/api/v1/assets/{asset_fixture['id']}",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert data["id"] == asset_fixture["id"]
        assert data["symbol"] == "AAPL"
        assert resp.json()["errors"] == []

    async def test_get_asset_not_found(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.get(
            f"/api/v1/assets/{fake_id}",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404
        assert resp.json()["errors"][0]["code"] == "NOT_FOUND"

    async def test_get_asset_requires_auth(
        self, client: AsyncClient, asset_fixture: dict
    ):
        resp = await client.get(f"/api/v1/assets/{asset_fixture['id']}")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestUpdateAsset:
    async def test_update_name(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.patch(
            f"/api/v1/assets/{asset_fixture['id']}",
            json={"name": "Apple Incorporated"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["name"] == "Apple Incorporated"

    async def test_update_sector(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.patch(
            f"/api/v1/assets/{asset_fixture['id']}",
            json={"sector": "Technology", "industry": "Consumer Electronics"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert data["sector"] == "Technology"
        assert data["industry"] == "Consumer Electronics"

    async def test_update_is_active(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.patch(
            f"/api/v1/assets/{asset_fixture['id']}",
            json={"is_active": False},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["is_active"] is False

    async def test_update_nonexistent_asset(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.patch(
            f"/api/v1/assets/{fake_id}",
            json={"name": "Ghost"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404


@pytest.mark.anyio
class TestDeleteAsset:
    async def test_delete_asset(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        headers = org_with_token["headers"]
        del_resp = await client.delete(
            f"/api/v1/assets/{asset_fixture['id']}",
            headers=headers,
        )
        assert del_resp.status_code == 200, del_resp.text

        list_resp = await client.get("/api/v1/assets", headers=headers)
        ids = [a["id"] for a in list_resp.json()["data"]]
        assert asset_fixture["id"] not in ids

    async def test_delete_nonexistent_asset(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.delete(
            f"/api/v1/assets/{fake_id}",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404

    async def test_delete_requires_auth(
        self, client: AsyncClient, asset_fixture: dict
    ):
        resp = await client.delete(f"/api/v1/assets/{asset_fixture['id']}")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestPrices:
    async def test_add_price(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.post(
            f"/api/v1/assets/{asset_fixture['id']}/prices",
            json={"price_date": "2024-01-15", "close": "150.25"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["asset_id"] == asset_fixture["id"]
        assert float(data["close"]) == pytest.approx(150.25)
        assert data["price_date"] == "2024-01-15"

    async def test_add_price_full_ohlcv(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.post(
            f"/api/v1/assets/{asset_fixture['id']}/prices",
            json={
                "price_date": "2024-01-16",
                "open": "148.00",
                "high": "152.00",
                "low": "147.50",
                "close": "151.00",
                "volume": "85000000",
                "source": "yahoo",
            },
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert float(data["open"]) == pytest.approx(148.0)
        assert float(data["high"]) == pytest.approx(152.0)
        assert data["source"] == "yahoo"

    async def test_get_price_history(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        headers = org_with_token["headers"]
        asset_id = asset_fixture["id"]

        for price_date, close in [("2024-01-10", "145.00"), ("2024-01-11", "146.50"), ("2024-01-12", "148.00")]:
            await client.post(
                f"/api/v1/assets/{asset_id}/prices",
                json={"price_date": price_date, "close": close},
                headers=headers,
            )

        resp = await client.get(f"/api/v1/assets/{asset_id}/prices", headers=headers)
        assert resp.status_code == 200, resp.text
        prices = resp.json()["data"]
        assert len(prices) == 3

    async def test_price_history_filter_by_date(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        headers = org_with_token["headers"]
        asset_id = asset_fixture["id"]

        for price_date, close in [("2024-01-05", "140.00"), ("2024-02-10", "155.00"), ("2024-03-15", "160.00")]:
            await client.post(
                f"/api/v1/assets/{asset_id}/prices",
                json={"price_date": price_date, "close": close},
                headers=headers,
            )

        resp = await client.get(
            f"/api/v1/assets/{asset_id}/prices?date_from=2024-02-01&date_to=2024-02-28",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        assert len(resp.json()["data"]) == 1
        assert resp.json()["data"][0]["price_date"] == "2024-02-10"

    async def test_latest_price_populated_on_get(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        headers = org_with_token["headers"]
        asset_id = asset_fixture["id"]

        await client.post(
            f"/api/v1/assets/{asset_id}/prices",
            json={"price_date": "2024-01-15", "close": "175.50"},
            headers=headers,
        )

        resp = await client.get(f"/api/v1/assets/{asset_id}", headers=headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert data["latest_price"] is not None
        assert float(data["latest_price"]["close"]) == pytest.approx(175.5)

    async def test_price_must_be_positive(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        resp = await client.post(
            f"/api/v1/assets/{asset_fixture['id']}/prices",
            json={"price_date": "2024-01-15", "close": "-10.00"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 422

    async def test_add_price_to_nonexistent_asset(
        self, client: AsyncClient, org_with_token: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.post(
            f"/api/v1/assets/{fake_id}/prices",
            json={"price_date": "2024-01-15", "close": "100.00"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 404


@pytest.mark.anyio
class TestTenantIsolation:
    async def test_org_b_cannot_see_org_a_asset(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        headers_b = await _create_second_org(client)

        # Org B should see 0 assets
        list_resp = await client.get("/api/v1/assets", headers=headers_b)
        assert list_resp.status_code == 200, list_resp.text
        assert list_resp.json()["meta"]["total"] == 0

    async def test_org_b_cannot_get_org_a_asset_by_id(
        self, client: AsyncClient, org_with_token: dict, asset_fixture: dict
    ):
        headers_b = await _create_second_org(client)

        get_resp = await client.get(
            f"/api/v1/assets/{asset_fixture['id']}", headers=headers_b
        )
        assert get_resp.status_code == 404
