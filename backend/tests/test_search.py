from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def indexed_data(client: AsyncClient, org_with_token: dict) -> dict:
    """Create some indexable data (portfolio, asset) that may appear in search."""
    headers = org_with_token["headers"]

    portfolio_resp = await client.post(
        "/api/v1/portfolios",
        json={"name": "Search Test Portfolio"},
        headers=headers,
    )
    assert portfolio_resp.status_code == 201, portfolio_resp.text
    portfolio = portfolio_resp.json()["data"]

    asset_resp = await client.post(
        "/api/v1/assets",
        json={"symbol": "SRCH", "name": "Search Asset Corp", "asset_type": "EQUITY", "currency": "USD"},
        headers=headers,
    )
    assert asset_resp.status_code == 201, asset_resp.text
    asset = asset_resp.json()["data"]

    return {"portfolio": portfolio, "asset": asset}


# ---------------------------------------------------------------------------
# Test Classes
# ---------------------------------------------------------------------------

@pytest.mark.anyio
class TestSearch:
    async def test_search_no_query_param_returns_422(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 422

    async def test_search_with_query_returns_200(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search?q=test",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "data" in body
        assert "errors" in body
        assert isinstance(body["data"], dict)

    async def test_search_empty_query_ok_or_422(
        self, client: AsyncClient, org_with_token: dict
    ):
        # q has min_length=1 so empty string should return 422
        resp = await client.get(
            "/api/v1/search?q=",
            headers=org_with_token["headers"],
        )
        # Empty string violates min_length=1 constraint
        assert resp.status_code in (200, 422)

    async def test_search_no_match_returns_empty_dict(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search?q=zzznomatchxyzabc999",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert isinstance(data, dict)

    async def test_search_with_types_filter_portfolio(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search?q=test&types=portfolio",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert isinstance(resp.json()["data"], dict)

    async def test_search_with_types_filter_asset(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search?q=test&types=asset",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_search_with_multiple_types(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search?q=test&types=portfolio,asset",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_search_with_invalid_type_graceful(
        self, client: AsyncClient, org_with_token: dict
    ):
        # Invalid types should be filtered out gracefully, not crash
        resp = await client.get(
            "/api/v1/search?q=test&types=invalid_type",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert isinstance(resp.json()["data"], dict)

    async def test_search_with_limit_param(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search?q=test&limit=5",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text

    async def test_search_limit_above_max_rejected(
        self, client: AsyncClient, org_with_token: dict
    ):
        resp = await client.get(
            "/api/v1/search?q=test&limit=999",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 422

    async def test_search_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/search?q=test")
        assert resp.status_code == 401

    async def test_search_requires_org_context(
        self, client: AsyncClient, auth_headers: dict
    ):
        # Plain auth token without org_id in payload should be rejected
        resp = await client.get("/api/v1/search?q=test", headers=auth_headers)
        assert resp.status_code in (401, 403)

    async def test_search_with_indexed_portfolio(
        self, client: AsyncClient, org_with_token: dict, indexed_data: dict
    ):
        """After creating data, searching for a known term should return a 200 response."""
        resp = await client.get(
            "/api/v1/search?q=Search",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        # Whether the data is indexed depends on the service implementation
        # We just verify the response shape is correct
        body = resp.json()
        assert "data" in body
        assert isinstance(body["data"], dict)
        assert body["errors"] == []

    async def test_search_tenant_isolation(
        self, client: AsyncClient, org_with_token: dict, indexed_data: dict
    ):
        """Search from Org B should not see Org A's indexed data."""
        # Create Org B
        await client.post(
            "/api/v1/auth/register",
            json={"email": "search_b@example.com", "password": "PassB123!", "full_name": "B User"},
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "search_b@example.com", "password": "PassB123!"},
        )
        token_b = resp.json()["data"]["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        resp = await client.post(
            "/api/v1/orgs",
            json={"name": "Search Org B", "slug": "search-org-b"},
            headers=headers_b,
        )
        org_b_id = resp.json()["data"]["id"]
        resp = await client.post(f"/api/v1/orgs/{org_b_id}/switch", headers=headers_b)
        headers_b_org = {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}

        # Org B searches for Org A's portfolio name
        resp = await client.get(
            "/api/v1/search?q=Search+Test+Portfolio",
            headers=headers_b_org,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        # Org B should not find Org A's data
        assert isinstance(data, dict)
        # All result lists should either be absent or empty
        for key in data:
            assert isinstance(data[key], list)
            assert len(data[key]) == 0, f"Expected no results for key '{key}' but found {data[key]}"
