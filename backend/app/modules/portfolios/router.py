from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.portfolios.schemas import CreateAccountRequest, CreatePortfolioRequest, UpdatePortfolioRequest
from app.modules.portfolios.service import PortfolioService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import paginated, success

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


@router.post("", response_model=dict, status_code=201)
async def create_portfolio(
    body: CreatePortfolioRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    portfolio = await svc.create_portfolio(
        org_id=org_id,
        name=body.name,
        description=body.description,
        inception_date=body.inception_date,
        base_currency=body.base_currency,
        portfolio_type=body.portfolio_type,
        status=body.status,
        benchmark_id=body.benchmark_id,
        manager_user_id=body.manager_user_id,
        metadata=body.metadata,
    )
    return success(portfolio.model_dump())


@router.get("", response_model=dict)
async def list_portfolios(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    portfolios, total = await svc.list_portfolios(org_id=org_id, page=page, page_size=page_size)
    return paginated(
        items=[p.model_dump() for p in portfolios],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{portfolio_id}", response_model=dict)
async def get_portfolio(
    portfolio_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    portfolio = await svc.get_portfolio(portfolio_id, org_id)
    return success(portfolio.model_dump())


@router.patch("/{portfolio_id}", response_model=dict)
async def update_portfolio(
    portfolio_id: UUID,
    body: UpdatePortfolioRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    portfolio = await svc.update_portfolio(
        portfolio_id=portfolio_id,
        org_id=org_id,
        **body.model_dump(exclude_none=True),
    )
    return success(portfolio.model_dump())


@router.delete("/{portfolio_id}", response_model=dict)
async def delete_portfolio(
    portfolio_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    await svc.delete_portfolio(portfolio_id, org_id)
    return success({"message": "Portfolio deleted"})


@router.post("/{portfolio_id}/accounts", response_model=dict, status_code=201)
async def add_account(
    portfolio_id: UUID,
    body: CreateAccountRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    account = await svc.add_account(
        portfolio_id=portfolio_id,
        org_id=org_id,
        name=body.name,
        account_number=body.account_number,
        account_type=body.account_type,
        custodian=body.custodian,
        currency=body.currency,
        is_active=body.is_active,
        metadata=body.metadata,
    )
    return success(account.model_dump())


@router.get("/{portfolio_id}/accounts", response_model=dict)
async def list_accounts(
    portfolio_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    accounts = await svc.list_accounts(portfolio_id, org_id)
    return success([a.model_dump() for a in accounts])


@router.get("/{portfolio_id}/summary", response_model=dict)
async def get_summary(
    portfolio_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    summary = await svc.get_summary(portfolio_id, org_id)
    return success(summary.model_dump())


@router.get("/{portfolio_id}/performance", response_model=dict)
async def get_portfolio_performance(
    portfolio_id: UUID,
    request: Request,
    days: int = Query(default=90, ge=1, le=1825),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    # Verify portfolio belongs to org
    svc = PortfolioService(db)
    await svc.get_portfolio(portfolio_id, org_id)  # raises NotFoundError if not found/wrong org

    from app.modules.dashboard.service import DashboardService
    dash_svc = DashboardService(db, org_id)
    points = await dash_svc.get_performance(days=days, portfolio_id=portfolio_id)
    return success([p.model_dump() for p in points])


@router.get("/{portfolio_id}/allocation", response_model=dict)
async def get_portfolio_allocation(
    portfolio_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = PortfolioService(db)
    await svc.get_portfolio(portfolio_id, org_id)  # auth check

    from app.modules.dashboard.service import DashboardService
    dash_svc = DashboardService(db, org_id)
    items = await dash_svc.get_allocation(portfolio_id=portfolio_id)
    return success([i.model_dump() for i in items])
