from __future__ import annotations

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Base domain exception."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    error_code: str = "DOMAIN_ERROR"
    message: str = "A domain error occurred"

    def __init__(self, message: str | None = None, **kwargs: object) -> None:
        self.message = message or self.__class__.message
        self.detail = kwargs
        super().__init__(self.message)


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"
    message = "Resource not found"


class ConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"
    message = "Resource already exists"


class AuthenticationError(DomainError):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"
    message = "Authentication required"


class AuthorizationError(DomainError):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"
    message = "Insufficient permissions"


class ValidationError(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "VALIDATION_ERROR"
    message = "Validation failed"


class AccountLockedError(DomainError):
    status_code = status.HTTP_423_LOCKED
    error_code = "ACCOUNT_LOCKED"
    message = "Account is temporarily locked"


class RateLimitError(DomainError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "RATE_LIMITED"
    message = "Too many requests"


def _error_response(status_code: int, error_code: str, message: str, detail: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "data": None,
            "meta": None,
            "errors": [
                {
                    "code": error_code,
                    "message": message,
                    "detail": detail or {},
                }
            ],
        },
    )


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return _error_response(exc.status_code, exc.error_code, exc.message, exc.detail)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return _error_response(exc.status_code, "HTTP_ERROR", str(exc.detail))


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import structlog

    log = structlog.get_logger(__name__)
    log.error("unhandled_exception", exc_info=exc)
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "An unexpected error occurred",
    )
