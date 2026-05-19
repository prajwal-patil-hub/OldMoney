from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

async def _register_and_login(client: AsyncClient, email: str, password: str, full_name: str) -> dict:
    """Register a new user and return their bare (non-org-scoped) access token headers."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Test Classes
# ---------------------------------------------------------------------------

@pytest.mark.anyio
class TestCreateOrg:
    async def test_create_org_returns_201(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/orgs",
            json={"name": "My Org", "slug": "my-org"},
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["name"] == "My Org"
        assert data["slug"] == "my-org"
        assert "id" in data
        assert resp.json()["errors"] == []

    async def test_create_org_without_slug(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/orgs",
            json={"name": "Auto Slug Org"},
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["name"] == "Auto Slug Org"
        assert "slug" in data
        assert data["slug"] is not None

    async def test_create_org_default_plan_free(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/orgs",
            json={"name": "Free Plan Org", "slug": "free-plan-org"},
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["data"]["plan"] == "free"

    async def test_create_org_invalid_slug(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/v1/orgs",
            json={"name": "Bad Slug Org", "slug": "Invalid Slug!"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    async def test_create_org_requires_auth(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/orgs",
            json={"name": "No Auth Org", "slug": "no-auth-org"},
        )
        assert resp.status_code == 401

    async def test_create_multiple_orgs_allowed(
        self, client: AsyncClient, auth_headers: dict
    ):
        for i in range(3):
            resp = await client.post(
                "/api/v1/orgs",
                json={"name": f"Org {i}", "slug": f"multi-org-{i}"},
                headers=auth_headers,
            )
            assert resp.status_code == 201, resp.text


@pytest.mark.anyio
class TestGetOrg:
    async def test_get_org(self, client: AsyncClient, org_with_token: dict):
        org_id = org_with_token["org"]["id"]
        # Use the bare auth_headers (no org context needed for GET /orgs/{id})
        resp = await client.get(
            f"/api/v1/orgs/{org_id}",
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert data["id"] == org_id
        assert data["name"] == "Test Org"

    async def test_get_org_not_member_returns_404(
        self, client: AsyncClient, org_with_token: dict
    ):
        org_id = org_with_token["org"]["id"]
        # Different user who is not a member
        other_headers = await _register_and_login(
            client, "getorg_other@example.com", "OtherPass1!", "Other"
        )
        resp = await client.get(f"/api/v1/orgs/{org_id}", headers=other_headers)
        assert resp.status_code in (403, 404)

    async def test_get_org_requires_auth(self, client: AsyncClient, org_with_token: dict):
        org_id = org_with_token["org"]["id"]
        resp = await client.get(f"/api/v1/orgs/{org_id}")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestUpdateOrg:
    async def test_update_org_name(self, client: AsyncClient, org_with_token: dict):
        org_id = org_with_token["org"]["id"]
        resp = await client.patch(
            f"/api/v1/orgs/{org_id}",
            json={"name": "Updated Org Name"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["name"] == "Updated Org Name"

    async def test_update_org_plan(self, client: AsyncClient, org_with_token: dict):
        org_id = org_with_token["org"]["id"]
        resp = await client.patch(
            f"/api/v1/orgs/{org_id}",
            json={"plan": "pro"},
            headers=org_with_token["headers"],
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["plan"] == "pro"

    async def test_update_org_requires_auth(self, client: AsyncClient, org_with_token: dict):
        org_id = org_with_token["org"]["id"]
        resp = await client.patch(
            f"/api/v1/orgs/{org_id}",
            json={"name": "No Auth Update"},
        )
        assert resp.status_code == 401

    async def test_update_org_non_member_returns_error(
        self, client: AsyncClient, org_with_token: dict
    ):
        org_id = org_with_token["org"]["id"]
        other_headers = await _register_and_login(
            client, "update_org_other@example.com", "OtherPass1!", "Other"
        )
        resp = await client.patch(
            f"/api/v1/orgs/{org_id}",
            json={"name": "Hacked Name"},
            headers=other_headers,
        )
        assert resp.status_code in (403, 404)


@pytest.mark.anyio
class TestListOrgs:
    async def test_list_orgs_includes_created_org(
        self, client: AsyncClient, org_with_token: dict, auth_headers: dict
    ):
        resp = await client.get("/api/v1/orgs", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        orgs = resp.json()["data"]
        assert isinstance(orgs, list)
        org_ids = [o["id"] for o in orgs]
        assert org_with_token["org"]["id"] in org_ids

    async def test_list_orgs_empty_for_new_user(self, client: AsyncClient):
        headers = await _register_and_login(
            client, "listempty@example.com", "ListPass1!", "List User"
        )
        resp = await client.get("/api/v1/orgs", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"] == []

    async def test_list_orgs_multiple(self, client: AsyncClient, auth_headers: dict):
        for i in range(2):
            await client.post(
                "/api/v1/orgs",
                json={"name": f"Org List {i}", "slug": f"org-list-{i}"},
                headers=auth_headers,
            )
        resp = await client.get("/api/v1/orgs", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        assert len(resp.json()["data"]) >= 2

    async def test_list_orgs_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/orgs")
        assert resp.status_code == 401


@pytest.mark.anyio
class TestSwitchOrg:
    async def test_switch_org_returns_token(
        self, client: AsyncClient, org_with_token: dict, auth_headers: dict
    ):
        org_id = org_with_token["org"]["id"]
        resp = await client.post(
            f"/api/v1/orgs/{org_id}/switch",
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_switch_org_token_works_for_org_endpoints(
        self, client: AsyncClient, org_with_token: dict, auth_headers: dict
    ):
        org_id = org_with_token["org"]["id"]
        resp = await client.post(f"/api/v1/orgs/{org_id}/switch", headers=auth_headers)
        org_token = resp.json()["data"]["access_token"]
        org_headers = {"Authorization": f"Bearer {org_token}"}

        # The org-scoped token should be able to create portfolios
        port_resp = await client.post(
            "/api/v1/portfolios",
            json={"name": "Org Scoped Portfolio"},
            headers=org_headers,
        )
        assert port_resp.status_code == 201, port_resp.text

    async def test_switch_org_requires_auth(
        self, client: AsyncClient, org_with_token: dict
    ):
        org_id = org_with_token["org"]["id"]
        resp = await client.post(f"/api/v1/orgs/{org_id}/switch")
        assert resp.status_code == 401

    async def test_switch_org_non_member_rejected(
        self, client: AsyncClient, org_with_token: dict
    ):
        org_id = org_with_token["org"]["id"]
        other_headers = await _register_and_login(
            client, "switch_other@example.com", "SwitchPass1!", "Other"
        )
        resp = await client.post(f"/api/v1/orgs/{org_id}/switch", headers=other_headers)
        assert resp.status_code in (403, 404)


@pytest.mark.anyio
class TestMemberManagement:
    async def _setup_second_user(self, client: AsyncClient) -> dict:
        """Register a second user and return their info."""
        email = "member_b@example.com"
        password = "MemberPass1!"
        await client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": "Member B"},
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        token = resp.json()["data"]["access_token"]
        user_data = resp.json()["data"]["user"]
        return {
            "email": email,
            "user_id": user_data["id"],
            "headers": {"Authorization": f"Bearer {token}"},
        }

    async def test_invite_member(
        self, client: AsyncClient, org_with_token: dict, auth_headers: dict
    ):
        org_id = org_with_token["org"]["id"]
        second_user = await self._setup_second_user(client)

        resp = await client.post(
            f"/api/v1/orgs/{org_id}/members",
            json={"email": second_user["email"], "role": "VIEWER"},
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert "id" in data
        assert "user_id" in data
        assert "role" in data

    async def test_list_members(
        self, client: AsyncClient, org_with_token: dict, auth_headers: dict
    ):
        org_id = org_with_token["org"]["id"]
        second_user = await self._setup_second_user(client)

        # Invite second user
        await client.post(
            f"/api/v1/orgs/{org_id}/members",
            json={"email": second_user["email"], "role": "VIEWER"},
            headers=auth_headers,
        )

        resp = await client.get(
            f"/api/v1/orgs/{org_id}/members",
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        members = resp.json()["data"]
        assert isinstance(members, list)
        # At minimum the owner + invited user
        assert len(members) >= 2

    async def test_update_member_role(
        self, client: AsyncClient, org_with_token: dict, auth_headers: dict
    ):
        org_id = org_with_token["org"]["id"]
        second_user = await self._setup_second_user(client)

        invite_resp = await client.post(
            f"/api/v1/orgs/{org_id}/members",
            json={"email": second_user["email"], "role": "VIEWER"},
            headers=auth_headers,
        )
        user_id = invite_resp.json()["data"]["user_id"]

        resp = await client.patch(
            f"/api/v1/orgs/{org_id}/members/{user_id}",
            json={"role": "ADVISOR"},
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["data"]["role"] == "ADVISOR"

    async def test_remove_member(
        self, client: AsyncClient, org_with_token: dict, auth_headers: dict
    ):
        org_id = org_with_token["org"]["id"]
        second_user = await self._setup_second_user(client)

        invite_resp = await client.post(
            f"/api/v1/orgs/{org_id}/members",
            json={"email": second_user["email"], "role": "VIEWER"},
            headers=auth_headers,
        )
        assert invite_resp.status_code == 201, invite_resp.text
        user_id = invite_resp.json()["data"]["user_id"]

        del_resp = await client.delete(
            f"/api/v1/orgs/{org_id}/members/{user_id}",
            headers=auth_headers,
        )
        assert del_resp.status_code == 200, del_resp.text

    async def test_invite_member_requires_auth(
        self, client: AsyncClient, org_with_token: dict
    ):
        org_id = org_with_token["org"]["id"]
        resp = await client.post(
            f"/api/v1/orgs/{org_id}/members",
            json={"email": "test@example.com", "role": "VIEWER"},
        )
        assert resp.status_code == 401

    async def test_list_members_requires_auth(
        self, client: AsyncClient, org_with_token: dict
    ):
        org_id = org_with_token["org"]["id"]
        resp = await client.get(f"/api/v1/orgs/{org_id}/members")
        assert resp.status_code == 401
