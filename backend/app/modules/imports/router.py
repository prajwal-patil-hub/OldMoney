from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.modules.imports.service import ImportService
from app.shared.deps import get_current_user, get_token_payload
from app.core.rate_limit import limiter, BULK_LIMIT
from app.shared.responses import success

router = APIRouter(prefix="/imports", tags=["imports"])

_ALLOWED_EXTENSIONS = {".csv", ".tsv", ".json", ".xlsx", ".xls"}
_ALLOWED_MIME_PREFIXES = (
    "text/",
    "application/json",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats",
    "application/octet-stream",   # browsers sometimes report this for xlsx
)
_MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

# Disallow path traversal or exotic filenames
_SAFE_FILENAME_CHARS = frozenset(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.() "
)


def _validate_upload(file: UploadFile) -> None:
    """Validate extension, MIME type, and filename safety before reading."""
    raw_name = file.filename or "upload"

    # Reject path traversal attempts
    if "/" in raw_name or "\\" in raw_name or ".." in raw_name:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not all(c in _SAFE_FILENAME_CHARS for c in raw_name):
        raise HTTPException(status_code=400, detail="Invalid filename characters")

    ext = ("." + raw_name.rsplit(".", 1)[-1].lower()) if "." in raw_name else ""
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext}' not allowed. Accepted: {sorted(_ALLOWED_EXTENSIONS)}",
        )

    declared_ct = (file.content_type or "").split(";")[0].strip().lower()
    if declared_ct and not any(declared_ct.startswith(p) for p in _ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status_code=400,
            detail=f"Content-Type '{declared_ct}' is not permitted for imports",
        )


async def _read_bounded(file: UploadFile) -> bytes:
    """Read upload, rejecting payloads that exceed MAX_UPLOAD_SIZE_MB."""
    content = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Upload exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB",
        )
    return content


def _get_org_id(request: Request) -> UUID:
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    if not org_id:
        from app.core.exceptions import AuthorizationError
        raise AuthorizationError("No organization context")
    return UUID(org_id)


def _sanitize_target(target: str) -> str:
    """Ensure 'target' is a known template name — not user-controlled path."""
    allowed = {"transactions", "holdings", "prices"}
    if target not in allowed:
        raise HTTPException(status_code=400, detail=f"Unknown import target: {target!r}")
    return target


def _parse_portfolio_id(raw: str | None) -> "UUID | None":
    if not raw or not raw.strip():
        return None
    try:
        return UUID(raw.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid portfolio_id")


@router.post("/preview", response_model=dict)
@limiter.limit(BULK_LIMIT)
async def preview_import(
    request: Request,
    file: UploadFile = File(...),
    target: str = Form(...),
    date_format: str = Form(default="%Y-%m-%d"),
    skip_rows: int = Form(default=0, ge=0, le=100),
    portfolio_id: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _validate_upload(file)
    target = _sanitize_target(target)
    content = await _read_bounded(file)
    safe_filename = (file.filename or "upload").split("/")[-1].split("\\")[-1]

    svc = ImportService(db)
    result = await svc.preview(
        file_content=content,
        filename=safe_filename,
        target=target,
        date_format=date_format,
        skip_rows=skip_rows,
        default_portfolio_id=_parse_portfolio_id(portfolio_id),
    )
    return success(result.model_dump())


@router.post("/commit", response_model=dict)
@limiter.limit(BULK_LIMIT)
async def commit_import(
    request: Request,
    file: UploadFile = File(...),
    target: str = Form(...),
    date_format: str = Form(default="%Y-%m-%d"),
    skip_rows: int = Form(default=0, ge=0, le=100),
    portfolio_id: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _validate_upload(file)
    target = _sanitize_target(target)
    org_id = _get_org_id(request)
    content = await _read_bounded(file)
    safe_filename = (file.filename or "upload").split("/")[-1].split("\\")[-1]

    svc = ImportService(db)
    result = await svc.commit(
        file_content=content,
        filename=safe_filename,
        org_id=org_id,
        user_id=current_user.id,
        target=target,
        date_format=date_format,
        skip_rows=skip_rows,
        default_portfolio_id=_parse_portfolio_id(portfolio_id),
    )
    return success(result)


@router.get("/templates", response_model=dict)
async def list_templates(
    current_user=Depends(get_current_user),
):
    templates = ImportService.get_templates()
    return success([t.model_dump() for t in templates])
