from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.dashboard.service import DashboardService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import success

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


@router.get("/metrics", response_model=dict)
async def get_metrics(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = DashboardService(db, org_id)
    metrics = await svc.get_metrics()
    return success(metrics.model_dump())


@router.get("/performance", response_model=dict)
async def get_performance(
    request: Request,
    days: int = Query(default=90, ge=1, le=1825),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = DashboardService(db, org_id)
    points = await svc.get_performance(days=days)
    return success([p.model_dump() for p in points])


@router.get("/allocation", response_model=dict)
async def get_allocation(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = DashboardService(db, org_id)
    items = await svc.get_allocation()
    return success([i.model_dump() for i in items])


@router.get("/top-holdings", response_model=dict)
async def get_top_holdings(
    request: Request,
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = DashboardService(db, org_id)
    holdings = await svc.get_top_holdings(limit=limit)
    return success([h.model_dump() for h in holdings])


@router.get("/recent-transactions", response_model=dict)
async def get_recent_transactions(
    request: Request,
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = DashboardService(db, org_id)
    txs = await svc.get_recent_transactions(limit=limit)
    return success([t.model_dump() for t in txs])
