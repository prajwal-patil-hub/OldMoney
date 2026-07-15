from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import limiter, WRITE_LIMIT
from app.modules.search.service import SearchService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import success

router = APIRouter(prefix="/search", tags=["search"])


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


@router.get("", response_model=dict)
@limiter.limit(WRITE_LIMIT)
async def search(
    request: Request,
    q: str = Query(min_length=1, max_length=200),
    types: str | None = Query(default=None, description="Comma-separated: portfolio,account,asset,transaction"),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    svc = SearchService(db)

    type_list: list[str] | None = None
    if types:
        type_list = [t.strip() for t in types.split(",") if t.strip()]

    results = await svc.search(query=q, org_id=org_id, types=type_list, limit=limit)
    return success(results)
