from __future__ import annotations

import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.exceptions import (
    DomainError,
    domain_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.core.logging import setup_logging
from app.core.middleware import RequestIDMiddleware

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    setup_logging(debug=settings.DEBUG)
    log.info("starting_up", app=settings.APP_NAME)

    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)

    # Initialize database
    from app.core.database import engine
    from app.shared.base_model import Base

    # Import all models to register them
    from app.modules.auth import models as auth_models  # noqa: F401
    from app.modules.auth import audit  # noqa: F401
    from app.modules.organizations import models as org_models  # noqa: F401
    from app.modules.assets import models as asset_models  # noqa: F401
    from app.modules.portfolios import models as portfolio_models  # noqa: F401
    from app.modules.portfolios import ownership  # noqa: F401
    from app.modules.holdings import models as holding_models  # noqa: F401
    from app.modules.transactions import models as tx_models  # noqa: F401
    from app.modules.ai import models as ai_models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Create FTS5 virtual table for search
        await conn.execute(
            __import__("sqlalchemy").text("""
                CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
                    entity_type,
                    entity_id,
                    org_id UNINDEXED,
                    title,
                    body,
                    metadata UNINDEXED
                )
            """)
        )

    log.info("database_initialized")

    # Start APScheduler
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()

    async def rebuild_search_index():
        """Periodic job to rebuild search index."""
        log.info("search_index_rebuild_started")

    scheduler.add_job(rebuild_search_index, "interval", hours=1, id="rebuild_search")
    scheduler.start()
    app.state.scheduler = scheduler
    log.info("scheduler_started")

    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    await engine.dispose()
    log.info("shutdown_complete")


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME + " API",
    version="1.0.0",
    description="Local-first wealth intelligence platform API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# State for rate limiter
app.state.limiter = limiter

# Exception handlers
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(DomainError, domain_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Middleware (order matters: last added = first executed)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Register routers
from app.modules.auth.router import router as auth_router
from app.modules.organizations.router import router as org_router
from app.modules.assets.router import router as asset_router
from app.modules.portfolios.router import router as portfolio_router
from app.modules.holdings.router import router as holding_router
from app.modules.transactions.router import router as tx_router
from app.modules.imports.router import router as import_router
from app.modules.search.router import router as search_router
from app.modules.ai.router import router as ai_router

prefix = settings.API_V1_PREFIX

app.include_router(auth_router, prefix=prefix)
app.include_router(org_router, prefix=prefix)
app.include_router(asset_router, prefix=prefix)
app.include_router(portfolio_router, prefix=prefix)
app.include_router(holding_router, prefix=prefix)
app.include_router(tx_router, prefix=prefix)
app.include_router(import_router, prefix=prefix)
app.include_router(search_router, prefix=prefix)
app.include_router(ai_router, prefix=prefix)


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "docs": "/docs"}
