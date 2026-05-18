from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UpdateProfileRequest,
    UserOut,
)
from app.modules.auth.service import AuthService
from app.shared.deps import get_current_user
from app.shared.responses import success

router = APIRouter(prefix="/auth", tags=["auth"])

limiter = Limiter(key_func=get_remote_address)


def _get_client_info(request: Request) -> tuple[str | None, str | None]:
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
    ua = request.headers.get("User-Agent")
    return ip, ua


@router.post("/register", response_model=dict, status_code=201)
@limiter.limit("10/minute")
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    user = await svc.register(
        email=body.email,
        password=body.password,
        full_name=body.full_name,
    )
    return success({"id": str(user.id), "email": user.email, "full_name": user.full_name})


@router.post("/login", response_model=dict)
@limiter.limit("10/minute")
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip, ua = _get_client_info(request)
    svc = AuthService(db)
    result = await svc.login(
        email=body.email,
        password=body.password,
        ip_address=ip,
        user_agent=ua,
    )
    return success(result.model_dump())


@router.post("/refresh", response_model=dict)
@limiter.limit("20/minute")
async def refresh(
    body: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip, _ = _get_client_info(request)
    svc = AuthService(db)
    tokens = await svc.refresh(body.refresh_token, ip_address=ip)
    return success(tokens.model_dump())


@router.post("/logout", response_model=dict)
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = AuthService(db)
    await svc.logout(body.refresh_token)
    return success({"message": "Logged out successfully"})


@router.get("/me", response_model=dict)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = AuthService(db)
    user_out = await svc.get_me(current_user.id)
    return success(user_out.model_dump())


@router.patch("/me", response_model=dict)
async def update_me(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = AuthService(db)
    user_out = await svc.update_profile(
        user_id=current_user.id,
        full_name=body.full_name,
        email=str(body.email) if body.email else None,
    )
    return success(user_out.model_dump())


@router.post("/change-password", response_model=dict)
@limiter.limit("5/minute")
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = AuthService(db)
    await svc.change_password(
        user_id=current_user.id,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return success({"message": "Password changed successfully"})
