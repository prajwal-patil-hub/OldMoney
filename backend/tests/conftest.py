from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.shared.base_model import Base

# Disable rate limiting for all tests — every request comes from 127.0.0.1
# which would exhaust per-IP limits within a single test run.
from app.modules.auth.router import limiter as _auth_limiter
from app.modules.ai.router import limiter as _ai_limiter
_auth_limiter.enabled = False
_ai_limiter.enabled = False


# Promote anyio_backend to session scope so it is compatible with the
# session-scoped setup_db fixture. Without this, anyio raises ScopeMismatch
# when a test file is collected before setup_db has run.
@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            try:
                await session.commit()
            except Exception:
                await session.rollback()
            raise
        finally:
            await session.close()


@pytest_asyncio.fixture(scope="session")
async def setup_db():
    """Create tables once for all tests."""
    # Import all models
    from app.modules.auth import models as auth_models  # noqa
    from app.modules.auth import audit  # noqa
    from app.modules.organizations import models as org_models  # noqa
    from app.modules.assets import models as asset_models  # noqa
    from app.modules.portfolios import models as portfolio_models  # noqa
    from app.modules.portfolios import ownership  # noqa
    from app.modules.holdings import models as holding_models  # noqa
    from app.modules.transactions import models as tx_models  # noqa
    from app.modules.ai import models as ai_models  # noqa

    from sqlalchemy import event

    def set_pragmas(dbapi_conn, connection_record):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    event.listen(test_engine.sync_engine, "connect", set_pragmas)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Create FTS5 virtual table
        from sqlalchemy import text
        await conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
                entity_type, entity_id, org_id UNINDEXED, title, body, metadata UNINDEXED
            )
        """))

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def reset_db(setup_db):
    """Clean tables between tests."""
    yield
    async with test_engine.begin() as conn:
        from sqlalchemy import text
        # Truncate all tables in reverse dependency order
        tables = [
            "ai_messages", "ai_conversations", "audit_logs",
            "cashflows", "transactions", "holdings",
            "accounts", "portfolios", "asset_prices", "assets",
            "memberships", "refresh_tokens", "organizations", "users",
        ]
        for table in tables:
            await conn.execute(text(f"DELETE FROM {table}"))
        await conn.execute(text("DELETE FROM search_index"))


@pytest.fixture(autouse=True)
def override_db():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient) -> dict:
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPass123",
            "full_name": "Test User",
        },
    )
    assert resp.status_code == 201, resp.text
    return {"email": "test@example.com", "password": "TestPass123"}


@pytest_asyncio.fixture
async def auth_tokens(client: AsyncClient, registered_user: dict) -> dict:
    resp = await client.post(
        "/api/v1/auth/login",
        json=registered_user,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
    }


@pytest_asyncio.fixture
async def auth_headers(auth_tokens: dict) -> dict:
    return {"Authorization": f"Bearer {auth_tokens['access_token']}"}


@pytest_asyncio.fixture
async def org_with_token(client: AsyncClient, auth_headers: dict, auth_tokens: dict) -> dict:
    """Create an org and return a token with org context."""
    resp = await client.post(
        "/api/v1/orgs",
        json={"name": "Test Org", "slug": "test-org"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    org = resp.json()["data"]

    # Switch to org to get org-scoped token
    resp2 = await client.post(
        f"/api/v1/orgs/{org['id']}/switch",
        headers=auth_headers,
    )
    assert resp2.status_code == 200, resp2.text
    org_token = resp2.json()["data"]["access_token"]

    return {
        "org": org,
        "token": org_token,
        "headers": {"Authorization": f"Bearer {org_token}"},
    }
