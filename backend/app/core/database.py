from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings

# For SQLite we need special connect args and pool class
_connect_args: dict = {}
_pool_kwargs: dict = {}

if "sqlite" in settings.DATABASE_URL:
    _connect_args = {"check_same_thread": False}
    # WAL mode pragma will be applied via event
    _pool_kwargs = {"poolclass": StaticPool}
else:
    # Server databases (e.g. Postgres) honour the configured pool size.
    _pool_kwargs = {"pool_size": settings.DATABASE_POOL_SIZE, "pool_pre_ping": True}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args=_connect_args,
    **_pool_kwargs,
)


async def _set_sqlite_pragmas(dbapi_conn, connection_record):  # type: ignore[no-untyped-def]
    """Enable WAL mode and other performance pragmas for SQLite."""
    dbapi_conn.execute("PRAGMA journal_mode=WAL")
    dbapi_conn.execute("PRAGMA foreign_keys=ON")
    dbapi_conn.execute("PRAGMA synchronous=NORMAL")
    dbapi_conn.execute("PRAGMA cache_size=-64000")  # 64MB
    dbapi_conn.execute("PRAGMA temp_store=MEMORY")
    # Wait up to 5s for a competing writer instead of erroring immediately —
    # StaticPool serializes writes, so under concurrency a busy_timeout turns
    # "database is locked" 500s into short waits.
    dbapi_conn.execute("PRAGMA busy_timeout=5000")


if "sqlite" in settings.DATABASE_URL:
    from sqlalchemy import event

    event.listen(engine.sync_engine, "connect", _set_sqlite_pragmas)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            # Roll back unconditionally on error. A ledger must never persist
            # a half-applied mutation (e.g. a transaction written but its
            # holding update failed). Security state that must survive an
            # error (the failed-login counter) is committed explicitly at its
            # own call site, not piggy-backed on a commit-on-error here.
            await session.rollback()
            raise
        finally:
            await session.close()
