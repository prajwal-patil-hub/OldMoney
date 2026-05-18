from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePass1",
                "full_name": "New User",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["email"] == "newuser@example.com"
        assert "id" in data["data"]
        assert data["errors"] == []

    async def test_register_duplicate_email(self, client: AsyncClient, registered_user: dict):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": "AnotherPass1",
                "full_name": "Duplicate",
            },
        )
        assert resp.status_code == 409
        assert resp.json()["errors"][0]["code"] == "CONFLICT"

    async def test_register_weak_password(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "short",
                "full_name": "Weak Pass",
            },
        )
        assert resp.status_code == 422

    async def test_register_no_uppercase(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "noup@example.com",
                "password": "alllowercase1",
                "full_name": "No Upper",
            },
        )
        assert resp.status_code == 422

    async def test_register_no_digit(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "nodigit@example.com",
                "password": "NoDigitPass",
                "full_name": "No Digit",
            },
        )
        assert resp.status_code == 422

    async def test_register_invalid_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "ValidPass1",
                "full_name": "Bad Email",
            },
        )
        assert resp.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient, registered_user: dict):
        resp = await client.post("/api/v1/auth/login", json=registered_user)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == registered_user["email"]

    async def test_login_wrong_password(self, client: AsyncClient, registered_user: dict):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": "WrongPass1"},
        )
        assert resp.status_code == 401
        assert resp.json()["errors"][0]["code"] == "UNAUTHORIZED"

    async def test_login_unknown_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": "SomePass1"},
        )
        assert resp.status_code == 401

    async def test_login_rate_limiting_lockout(self, client: AsyncClient, registered_user: dict):
        """5 failed attempts should lock the account."""
        for i in range(5):
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": registered_user["email"], "password": "WrongPass1"},
            )
            assert resp.status_code == 401

        # 6th attempt — account should be locked
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": registered_user["password"]},
        )
        # Either locked (423) or unauthorized (401)
        assert resp.status_code in (401, 423)

    async def test_login_case_insensitive_email(self, client: AsyncClient, registered_user: dict):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"].upper(), "password": registered_user["password"]},
        )
        assert resp.status_code == 200


class TestRefreshToken:
    async def test_refresh_success(self, client: AsyncClient, auth_tokens: dict):
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "access_token" in data
        assert "refresh_token" in data
        # New tokens should differ
        assert data["refresh_token"] != auth_tokens["refresh_token"]

    async def test_refresh_token_rotation(self, client: AsyncClient, auth_tokens: dict):
        """Using a refresh token should invalidate it."""
        resp1 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert resp1.status_code == 200

        # Try reusing the same token — should fail
        resp2 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert resp2.status_code == 401

    async def test_refresh_invalid_token(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "totally-invalid-token"},
            headers=auth_headers,
        )
        assert resp.status_code == 401

    async def test_new_refresh_token_works(self, client: AsyncClient, auth_tokens: dict):
        """The rotated token should be usable."""
        resp1 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        new_refresh = resp1.json()["data"]["refresh_token"]

        resp2 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": new_refresh},
        )
        assert resp2.status_code == 200


class TestLogout:
    async def test_logout_success(self, client: AsyncClient, auth_tokens: dict, auth_headers: dict):
        resp = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": auth_tokens["refresh_token"]},
            headers=auth_headers,
        )
        assert resp.status_code == 200

        # After logout, refresh token should be invalid
        resp2 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert resp2.status_code == 401

    async def test_logout_requires_auth(self, client: AsyncClient, auth_tokens: dict):
        resp = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": auth_tokens["refresh_token"]},
            # No auth header
        )
        assert resp.status_code == 401


class TestGetMe:
    async def test_get_me_success(self, client: AsyncClient, auth_headers: dict, registered_user: dict):
        resp = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["email"] == registered_user["email"]
        assert "id" in data
        assert "memberships" in data

    async def test_get_me_no_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_get_me_invalid_token(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401


class TestUpdateProfile:
    async def test_update_full_name(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch(
            "/api/v1/auth/me",
            json={"full_name": "Updated Name"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["full_name"] == "Updated Name"

    async def test_update_email(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch(
            "/api/v1/auth/me",
            json={"email": "updated@example.com"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["email"] == "updated@example.com"


class TestChangePassword:
    async def test_change_password_success(
        self, client: AsyncClient, auth_headers: dict, registered_user: dict, auth_tokens: dict
    ):
        resp = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": registered_user["password"],
                "new_password": "NewSecure1Pass",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200

        # Old refresh token should be revoked
        resp2 = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert resp2.status_code == 401

        # Can login with new password
        resp3 = await client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": "NewSecure1Pass"},
        )
        assert resp3.status_code == 200

    async def test_change_password_wrong_current(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "WrongCurrentPass1",
                "new_password": "NewSecure1Pass",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422
