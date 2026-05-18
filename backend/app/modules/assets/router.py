from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.assets.models import AssetType
from app.modules.assets.schemas import AddPriceRequest, CreateAssetRequest, UpdateAssetRequest
from app.modules.assets.service import AssetService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import paginated, success

router = APIRouter(prefix="/assets", tags=["assets"])


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


@router.post("", response_model=dict, status_code=201)
async def create_asset(
    body: CreateAssetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = AssetService(db)
    asset = await svc.create_asset(
        org_id=org_id,
        symbol=body.symbol,
        name=body.name,
        asset_type=body.asset_type,
        isin=body.isin,
        cusip=body.cusip,
        exchange=body.exchange,
        currency=body.currency,
        sector=body.sector,
        industry=body.industry,
        country=body.country,
        metadata=body.metadata,
    )
    return success(asset.model_dump())


@router.get("", response_model=dict)
async def list_assets(
    request: Request,
    symbol: str | None = Query(default=None),
    name: str | None = Query(default=None),
    asset_type: AssetType | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = AssetService(db)
    assets, total = await svc.list_assets(
        org_id=org_id,
        symbol=symbol,
        name=name,
        asset_type=asset_type,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )
    return paginated(
        items=[a.model_dump() for a in assets],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{asset_id}", response_model=dict)
async def get_asset(
    asset_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = AssetService(db)
    asset = await svc.get_asset(asset_id, org_id)
    return success(asset.model_dump())


@router.patch("/{asset_id}", response_model=dict)
async def update_asset(
    asset_id: UUID,
    body: UpdateAssetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = AssetService(db)
    asset = await svc.update_asset(
        asset_id=asset_id,
        org_id=org_id,
        **body.model_dump(exclude_none=True),
    )
    return success(asset.model_dump())


@router.delete("/{asset_id}", response_model=dict)
async def delete_asset(
    asset_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = AssetService(db)
    await svc.delete_asset(asset_id, org_id)
    return success({"message": "Asset deleted"})


@router.post("/{asset_id}/prices", response_model=dict, status_code=201)
async def add_price(
    asset_id: UUID,
    body: AddPriceRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = AssetService(db)
    price = await svc.add_price(
        asset_id=asset_id,
        org_id=org_id,
        price_date=body.price_date,
        close=body.close,
        open=body.open,
        high=body.high,
        low=body.low,
        volume=body.volume,
        source=body.source,
    )
    return success(price.model_dump())


@router.get("/{asset_id}/prices", response_model=dict)
async def get_price_history(
    asset_id: UUID,
    request: Request,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = AssetService(db)
    prices = await svc.get_price_history(
        asset_id=asset_id,
        org_id=org_id,
        date_from=date_from,
        date_to=date_to,
    )
    return success([p.model_dump() for p in prices])


@router.post("/prices/import", response_model=dict)
async def import_prices(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    content = await file.read()
    svc = AssetService(db)
    result = await svc.import_prices_csv(org_id, content.decode("utf-8"))
    return success(result)
