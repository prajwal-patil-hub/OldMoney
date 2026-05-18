from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestPortfolioCRUD:
    async def test_create_portfolio(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/portfolios",
            json={
                "name": "My Growth Portfolio",
                "description": "Long-term growth strategy",
                "base_currency": "USD",
                "portfolio_type": "DISCRETIONARY",
                "status": "ACTIVE",
            },
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["name"] == "My Growth Portfolio"
        assert data["base_currency"] == "USD"
        assert data["portfolio_type"] == "DISCRETIONARY"
        assert data["status"] == "ACTIVE"
        assert "id" in data

    async def test_create_portfolio_minimal(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "Minimal Portfolio"},
            headers=headers,
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["name"] == "Minimal Portfolio"

    async def test_list_portfolios_empty(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        resp = await client.get("/api/v1/portfolios", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["meta"]["total"] == 0

    async def test_list_portfolios(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        # Create 3 portfolios
        for i in range(3):
            await client.post(
                "/api/v1/portfolios",
                json={"name": f"Portfolio {i}"},
                headers=headers,
            )
        resp = await client.get("/api/v1/portfolios", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["meta"]["total"] == 3
        assert len(resp.json()["data"]) == 3

    async def test_get_portfolio(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "Get Test Portfolio"},
            headers=headers,
        )
        portfolio_id = create_resp.json()["data"]["id"]

        resp = await client.get(f"/api/v1/portfolios/{portfolio_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == portfolio_id
        assert resp.json()["data"]["name"] == "Get Test Portfolio"

    async def test_get_portfolio_not_found(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = await client.get(f"/api/v1/portfolios/{fake_id}", headers=headers)
        assert resp.status_code == 404

    async def test_update_portfolio(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "Old Name"},
            headers=headers,
        )
        portfolio_id = create_resp.json()["data"]["id"]

        resp = await client.patch(
            f"/api/v1/portfolios/{portfolio_id}",
            json={"name": "New Name", "status": "SUSPENDED"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == "New Name"
        assert data["status"] == "SUSPENDED"

    async def test_delete_portfolio(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "To Delete"},
            headers=headers,
        )
        portfolio_id = create_resp.json()["data"]["id"]

        del_resp = await client.delete(f"/api/v1/portfolios/{portfolio_id}", headers=headers)
        assert del_resp.status_code == 200

        # Should be 404 after soft delete
        get_resp = await client.get(f"/api/v1/portfolios/{portfolio_id}", headers=headers)
        assert get_resp.status_code == 404

    async def test_pagination(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        for i in range(5):
            await client.post("/api/v1/portfolios", json={"name": f"Page P {i}"}, headers=headers)

        resp = await client.get("/api/v1/portfolios?page=1&page_size=3", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 3
        assert body["meta"]["total"] == 5
        assert body["meta"]["has_next"] is True
        assert body["meta"]["page"] == 1

        resp2 = await client.get("/api/v1/portfolios?page=2&page_size=3", headers=headers)
        assert len(resp2.json()["data"]) == 2
        assert resp2.json()["meta"]["has_next"] is False


class TestPortfolioAccounts:
    async def _create_portfolio(self, client: AsyncClient, headers: dict) -> str:
        resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "Account Test Portfolio"},
            headers=headers,
        )
        return resp.json()["data"]["id"]

    async def test_add_account(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        portfolio_id = await self._create_portfolio(client, headers)

        resp = await client.post(
            f"/api/v1/portfolios/{portfolio_id}/accounts",
            json={
                "name": "Fidelity Brokerage",
                "account_type": "BROKERAGE",
                "custodian": "Fidelity",
                "currency": "USD",
            },
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["name"] == "Fidelity Brokerage"
        assert data["account_type"] == "BROKERAGE"
        assert data["portfolio_id"] == portfolio_id

    async def test_list_accounts(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        portfolio_id = await self._create_portfolio(client, headers)

        for i in range(3):
            await client.post(
                f"/api/v1/portfolios/{portfolio_id}/accounts",
                json={"name": f"Account {i}", "account_type": "BROKERAGE"},
                headers=headers,
            )

        resp = await client.get(f"/api/v1/portfolios/{portfolio_id}/accounts", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 3

    async def test_portfolio_with_accounts_in_get(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        portfolio_id = await self._create_portfolio(client, headers)

        await client.post(
            f"/api/v1/portfolios/{portfolio_id}/accounts",
            json={"name": "Main Account", "account_type": "BROKERAGE"},
            headers=headers,
        )

        resp = await client.get(f"/api/v1/portfolios/{portfolio_id}", headers=headers)
        assert resp.status_code == 200
        portfolio_data = resp.json()["data"]
        assert len(portfolio_data["accounts"]) == 1
        assert portfolio_data["accounts"][0]["name"] == "Main Account"


class TestPortfolioAuthorization:
    async def _create_second_org_user(self, client: AsyncClient) -> dict:
        """Create a second user with their own org."""
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "other@example.com",
                "password": "OtherPass1",
                "full_name": "Other User",
            },
        )
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "other@example.com", "password": "OtherPass1"},
        )
        tokens = login_resp.json()["data"]
        user_headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        # Create their org
        org_resp = await client.post(
            "/api/v1/orgs",
            json={"name": "Other Org", "slug": "other-org"},
            headers=user_headers,
        )
        org_id = org_resp.json()["data"]["id"]

        switch_resp = await client.post(
            f"/api/v1/orgs/{org_id}/switch",
            headers=user_headers,
        )
        other_token = switch_resp.json()["data"]["access_token"]
        return {"headers": {"Authorization": f"Bearer {other_token}"}}

    async def test_cannot_access_other_org_portfolio(
        self, client: AsyncClient, org_with_token: dict
    ):
        # User 1 creates portfolio
        headers1 = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "Private Portfolio"},
            headers=headers1,
        )
        portfolio_id = create_resp.json()["data"]["id"]

        # User 2 tries to access it
        other = await self._create_second_org_user(client)
        resp = await client.get(
            f"/api/v1/portfolios/{portfolio_id}",
            headers=other["headers"],
        )
        # Should be 404 (not found in their org) not 403 — we leak no info
        assert resp.status_code == 404

    async def test_cannot_list_other_org_portfolios(
        self, client: AsyncClient, org_with_token: dict
    ):
        headers1 = org_with_token["headers"]
        await client.post(
            "/api/v1/portfolios",
            json={"name": "Org1 Portfolio"},
            headers=headers1,
        )

        other = await self._create_second_org_user(client)
        resp = await client.get("/api/v1/portfolios", headers=other["headers"])
        assert resp.status_code == 200
        # User 2 sees 0 portfolios from user 1's org
        assert resp.json()["meta"]["total"] == 0

    async def test_requires_authentication(self, client: AsyncClient):
        resp = await client.get("/api/v1/portfolios")
        assert resp.status_code == 401

    async def test_requires_org_context(self, client: AsyncClient, auth_headers: dict):
        """Token without org_id should fail on portfolio endpoints."""
        resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "No Org Portfolio"},
            headers=auth_headers,  # No org in token
        )
        assert resp.status_code == 403


class TestPortfolioSummary:
    async def test_empty_summary(self, client: AsyncClient, org_with_token: dict):
        headers = org_with_token["headers"]
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "Empty Portfolio"},
            headers=headers,
        )
        portfolio_id = create_resp.json()["data"]["id"]

        resp = await client.get(
            f"/api/v1/portfolios/{portfolio_id}/summary",
            headers=headers,
        )
        assert resp.status_code == 200
        summary = resp.json()["data"]
        assert summary["portfolio_id"] == portfolio_id
        assert summary["total_value"] == "0"
        assert summary["num_holdings"] == 0
        assert summary["allocation_by_type"] == []
