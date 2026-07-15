from __future__ import annotations

import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

log = structlog.get_logger(__name__)

# Security headers applied to every response
_SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",                          # disabled — CSP is the modern defence
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "          # Next.js requires unsafe-inline in dev
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    ),
    "Cache-Control": "no-store",                       # API responses: never cache
    "Pragma": "no-cache",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach security headers to every response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response: Response = await call_next(request)
        for header, value in _SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique request ID to every request and log completion."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Trust X-Request-ID only from internal proxies; otherwise generate fresh
        request_id = str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        request.state.request_id = request_id
        start = time.perf_counter()

        response: Response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        log.info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject JSON request bodies exceeding the configured limit.

    File uploads are handled separately at the route level via MAX_UPLOAD_SIZE_MB.
    """

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_type = request.headers.get("content-type", "")
        # Only limit JSON bodies; multipart uploads have their own guard
        if "application/json" in content_type:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_bytes:
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=413,
                    content={
                        "data": None,
                        "meta": None,
                        "errors": [{"code": "PAYLOAD_TOO_LARGE", "message": "Request body too large"}],
                    },
                )
        return await call_next(request)


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Write a structured audit record for every mutating request."""

    MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    # Paths that are high-volume and don't need audit entries
    _SKIP_PATHS = {"/health", "/api/v1/ai/conversations"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response: Response = await call_next(request)

        if request.method not in self.MUTATING_METHODS:
            return response
        if request.url.path in self._SKIP_PATHS:
            return response

        try:
            payload = getattr(request.state, "token_payload", None)
            user_id = payload.get("sub") if payload else None
            org_id = payload.get("org_id") if payload else None

            log.info(
                "audit_mutating_request",
                http_method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                user_id=user_id,
                org_id=org_id,
                ip=_extract_ip(request),
            )
        except Exception as exc:
            # Never let audit logging crash a request — but never lose it
            # silently either. Emit at error level so lost audit records for a
            # financial app are visible to monitoring.
            log.error("audit_log_failed", error=str(exc), path=request.url.path)

        return response


def _extract_ip(request: Request) -> str | None:
    """Extract client IP safely.

    X-Forwarded-For is only trusted when the app runs behind a reverse proxy.
    For now we read the leftmost IP from X-Forwarded-For as the probable client
    but do NOT use it as a trust anchor for rate-limiting or access control —
    use request.client.host for that.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Leftmost IP is the original client (rightmost is the proxy we trust)
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
