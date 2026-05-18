from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.imports.service import ImportService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import success

router = APIRouter(prefix="/imports", tags=["imports"])


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


@router.post("/preview", response_model=dict)
async def preview_import(
    request: Request,
    file: UploadFile = File(...),
    target: str = Form(...),
    date_format: str = Form(default="%Y-%m-%d"),
    skip_rows: int = Form(default=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    svc = ImportService(db)
    result = await svc.preview(
        file_content=content,
        filename=file.filename or "upload",
        target=target,
        date_format=date_format,
        skip_rows=skip_rows,
    )
    return success(result.model_dump())


@router.post("/commit", response_model=dict)
async def commit_import(
    request: Request,
    file: UploadFile = File(...),
    target: str = Form(...),
    date_format: str = Form(default="%Y-%m-%d"),
    skip_rows: int = Form(default=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id = _get_org_id(request)
    content = await file.read()
    svc = ImportService(db)
    result = await svc.commit(
        file_content=content,
        filename=file.filename or "upload",
        org_id=org_id,
        user_id=current_user.id,
        target=target,
        date_format=date_format,
        skip_rows=skip_rows,
    )
    return success(result)


@router.get("/templates", response_model=dict)
async def list_templates(
    current_user=Depends(get_current_user),
):
    templates = ImportService.get_templates()
    return success([t.model_dump() for t in templates])
