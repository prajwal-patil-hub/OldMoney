from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.assets.models import AssetType
from app.modules.holdings.schemas import UpdateHoldingRequest, UpsertHoldingRequest
from app.modules.holdings.service import HoldingService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import paginated, success

router = APIRouter(prefix="/holdings", tags=["holdings"])


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


@router.get("/summary", response_model=dict)
async def get_summary(
    request: Request,
    portfolio_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = HoldingService(db)
    summary = await svc.get_summary(org_id=org_id, portfolio_id=portfolio_id)
    return success([s.model_dump() for s in summary])


@router.get("", response_model=dict)
async def list_holdings(
    request: Request,
    portfolio_id: UUID | None = Query(default=None),
    account_id: UUID | None = Query(default=None),
    asset_type: AssetType | None = Query(default=None),
    as_of_date: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = HoldingService(db)
    holdings, total = await svc.list_holdings(
        org_id=org_id,
        portfolio_id=portfolio_id,
        account_id=account_id,
        asset_type=asset_type,
        as_of_date=as_of_date,
        page=page,
        page_size=page_size,
    )
    return paginated(
        items=[h.model_dump() for h in holdings],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=dict, status_code=201)
async def upsert_holding(
    body: UpsertHoldingRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = HoldingService(db)
    holding = await svc.upsert_holding(
        org_id=org_id,
        account_id=body.account_id,
        portfolio_id=body.portfolio_id,
        asset_id=body.asset_id,
        quantity=body.quantity,
        as_of_date=body.as_of_date,
        cost_basis=body.cost_basis,
        cost_basis_per_unit=body.cost_basis_per_unit,
    )
    return success(holding.model_dump())


@router.patch("/{holding_id}", response_model=dict)
async def update_holding(
    holding_id: UUID,
    body: UpdateHoldingRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = HoldingService(db)
    holding = await svc.update_holding(
        holding_id=holding_id,
        org_id=org_id,
        **body.model_dump(exclude_none=True),
    )
    return success(holding.model_dump())


@router.delete("/{holding_id}", response_model=dict)
async def delete_holding(
    holding_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = HoldingService(db)
    await svc.delete_holding(holding_id, org_id)
    return success({"message": "Holding deleted"})
