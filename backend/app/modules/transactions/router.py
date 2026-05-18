from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.transactions.models import TransactionType
from app.modules.transactions.schemas import CreateTransactionRequest, UpdateTransactionRequest
from app.modules.transactions.service import TransactionService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import paginated, success

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


@router.get("/export", response_class=StreamingResponse)
async def export_transactions(
    request: Request,
    portfolio_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = TransactionService(db)
    csv_content = await svc.export_csv(
        org_id=org_id,
        portfolio_id=portfolio_id,
        date_from=date_from,
        date_to=date_to,
    )
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.post("", response_model=dict, status_code=201)
async def create_transaction(
    body: CreateTransactionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = TransactionService(db)
    tx = await svc.create_transaction(
        org_id=org_id,
        user_id=current_user.id,
        account_id=body.account_id,
        portfolio_id=body.portfolio_id,
        asset_id=body.asset_id,
        transaction_type=body.transaction_type,
        trade_date=body.trade_date,
        settlement_date=body.settlement_date,
        quantity=body.quantity,
        price=body.price,
        gross_amount=body.gross_amount,
        fees=body.fees,
        net_amount=body.net_amount,
        currency=body.currency,
        external_id=body.external_id,
        notes=body.notes,
        metadata=body.metadata,
    )
    return success(tx.model_dump())


@router.get("", response_model=dict)
async def list_transactions(
    request: Request,
    portfolio_id: UUID | None = Query(default=None),
    account_id: UUID | None = Query(default=None),
    asset_id: UUID | None = Query(default=None),
    transaction_type: TransactionType | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = TransactionService(db)
    txs, total = await svc.list_transactions(
        org_id=org_id,
        portfolio_id=portfolio_id,
        account_id=account_id,
        asset_id=asset_id,
        transaction_type=transaction_type,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return paginated(
        items=[tx.model_dump() for tx in txs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{tx_id}", response_model=dict)
async def get_transaction(
    tx_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = TransactionService(db)
    tx = await svc.get_transaction(tx_id, org_id)
    return success(tx.model_dump())


@router.patch("/{tx_id}", response_model=dict)
async def update_transaction(
    tx_id: UUID,
    body: UpdateTransactionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = TransactionService(db)
    tx = await svc.update_transaction(
        tx_id=tx_id,
        org_id=org_id,
        **body.model_dump(exclude_none=True),
    )
    return success(tx.model_dump())


@router.delete("/{tx_id}", response_model=dict)
async def delete_transaction(
    tx_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = TransactionService(db)
    await svc.delete_transaction(tx_id, org_id)
    return success({"message": "Transaction deleted"})
